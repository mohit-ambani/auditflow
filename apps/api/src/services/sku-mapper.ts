import { prisma } from '../lib/prisma';
import Anthropic from '@anthropic-ai/sdk';
import logger from '../lib/logger';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface SKUMatch {
  skuId: string;
  skuCode: string;
  skuName: string;
  matchType: 'EXACT' | 'ALIAS' | 'FUZZY' | 'AI';
  confidence: number; // 0-1
  similarityScore?: number;
}

export interface MappingResult {
  lineItemDescription: string;
  matches: SKUMatch[];
  bestMatch: SKUMatch | null;
  needsReview: boolean;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity score (0-1) between two strings using Levenshtein distance
 */
function similarityScore(str1: string, str2: string): number {
  const distance = levenshteinDistance(
    str1.toLowerCase().trim(),
    str2.toLowerCase().trim()
  );
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
}

/**
 * Normalize string for comparison
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, ''); // Remove special characters
}

/**
 * Exact match by SKU code
 */
async function exactMatchBySKUCode(
  orgId: string,
  skuCode: string
): Promise<SKUMatch | null> {
  const sku = await prisma.sKU.findFirst({
    where: {
      orgId,
      skuCode: { equals: skuCode, mode: 'insensitive' },
      isActive: true,
    },
  });

  if (!sku) return null;

  return {
    skuId: sku.id,
    skuCode: sku.skuCode,
    skuName: sku.name,
    matchType: 'EXACT',
    confidence: 1.0,
  };
}

/**
 * Exact match by name or aliases
 */
async function exactMatchByName(
  orgId: string,
  description: string
): Promise<SKUMatch | null> {
  const normalized = normalizeString(description);

  // Try exact name match first
  const byName = await prisma.sKU.findFirst({
    where: {
      orgId,
      isActive: true,
      OR: [
        { name: { equals: description, mode: 'insensitive' } },
      ],
    },
  });

  if (byName) {
    return {
      skuId: byName.id,
      skuCode: byName.skuCode,
      skuName: byName.name,
      matchType: 'EXACT',
      confidence: 1.0,
    };
  }

  // Try alias match
  const byAlias = await prisma.sKU.findFirst({
    where: {
      orgId,
      isActive: true,
      aliases: { has: description },
    },
  });

  if (byAlias) {
    return {
      skuId: byAlias.id,
      skuCode: byAlias.skuCode,
      skuName: byAlias.name,
      matchType: 'ALIAS',
      confidence: 0.95,
    };
  }

  return null;
}

/**
 * Fuzzy match using Levenshtein distance
 */
async function fuzzyMatch(
  orgId: string,
  description: string,
  threshold: number = 0.7
): Promise<SKUMatch[]> {
  // Get all active SKUs for the org
  const skus = await prisma.sKU.findMany({
    where: {
      orgId,
      isActive: true,
    },
    select: {
      id: true,
      skuCode: true,
      name: true,
      aliases: true,
    },
  });

  const matches: SKUMatch[] = [];

  for (const sku of skus) {
    // Check similarity with name
    const nameScore = similarityScore(description, sku.name);

    if (nameScore >= threshold) {
      matches.push({
        skuId: sku.id,
        skuCode: sku.skuCode,
        skuName: sku.name,
        matchType: 'FUZZY',
        confidence: nameScore,
        similarityScore: nameScore,
      });
    }

    // Check similarity with aliases
    for (const alias of sku.aliases) {
      const aliasScore = similarityScore(description, alias);
      if (aliasScore >= threshold) {
        matches.push({
          skuId: sku.id,
          skuCode: sku.skuCode,
          skuName: sku.name,
          matchType: 'FUZZY',
          confidence: aliasScore * 0.9, // Slightly lower confidence for alias match
          similarityScore: aliasScore,
        });
      }
    }
  }

  // Sort by confidence descending and take top 5
  return matches.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

/**
 * AI-powered match using Claude API
 */
async function aiMatch(
  orgId: string,
  description: string,
  hsnCode?: string
): Promise<SKUMatch[]> {
  try {
    // Get all active SKUs for context
    const skus = await prisma.sKU.findMany({
      where: {
        orgId,
        isActive: true,
      },
      select: {
        id: true,
        skuCode: true,
        name: true,
        description: true,
        hsnCode: true,
        aliases: true,
      },
      take: 100, // Limit for context window
    });

    if (skus.length === 0) {
      return [];
    }

    const skuList = skus.map((sku) => ({
      id: sku.id,
      code: sku.skuCode,
      name: sku.name,
      description: sku.description || '',
      hsnCode: sku.hsnCode || '',
      aliases: sku.aliases,
    }));

    const prompt = `You are an expert in matching product descriptions to SKU master data.

Given the following product description from an invoice:
"${description}"
${hsnCode ? `HSN Code: ${hsnCode}` : ''}

Match it to the most likely SKU(s) from this master list:
${JSON.stringify(skuList, null, 2)}

Return a JSON array of up to 3 best matches with confidence scores (0-1), ordered by confidence descending.
Format: [{ "id": "sku_id", "confidence": 0.95, "reasoning": "why this matches" }]

Return ONLY the JSON array, no other text.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const result = JSON.parse(content.text);

    if (!Array.isArray(result)) {
      throw new Error('Invalid response format from Claude');
    }

    const matches: SKUMatch[] = [];

    for (const match of result) {
      const sku = skus.find((s) => s.id === match.id);
      if (sku) {
        matches.push({
          skuId: sku.id,
          skuCode: sku.skuCode,
          skuName: sku.name,
          matchType: 'AI',
          confidence: match.confidence || 0,
        });
      }
    }

    return matches;
  } catch (error) {
    logger.error({ error, description }, 'AI match failed');
    return [];
  }
}

/**
 * Map a line item description to SKU master using multi-tier matching
 */
export async function mapLineItemToSKU(
  orgId: string,
  description: string,
  skuCode?: string,
  hsnCode?: string
): Promise<MappingResult> {
  const matches: SKUMatch[] = [];

  // Tier 1: Exact match by SKU code
  if (skuCode) {
    const exactByCode = await exactMatchBySKUCode(orgId, skuCode);
    if (exactByCode) {
      matches.push(exactByCode);
      return {
        lineItemDescription: description,
        matches,
        bestMatch: exactByCode,
        needsReview: false,
      };
    }
  }

  // Tier 2: Exact match by name or alias
  const exactByName = await exactMatchByName(orgId, description);
  if (exactByName) {
    matches.push(exactByName);
    return {
      lineItemDescription: description,
      matches,
      bestMatch: exactByName,
      needsReview: false,
    };
  }

  // Tier 3: Fuzzy match
  const fuzzyMatches = await fuzzyMatch(orgId, description, 0.75);
  matches.push(...fuzzyMatches);

  // If we have a high-confidence fuzzy match, use it
  const bestFuzzy = fuzzyMatches[0];
  if (bestFuzzy && bestFuzzy.confidence >= 0.85) {
    return {
      lineItemDescription: description,
      matches,
      bestMatch: bestFuzzy,
      needsReview: false,
    };
  }

  // Tier 4: AI match
  const aiMatches = await aiMatch(orgId, description, hsnCode);
  matches.push(...aiMatches);

  // Merge and deduplicate matches by skuId
  const uniqueMatches = Array.from(
    matches
      .reduce((map, match) => {
        const existing = map.get(match.skuId);
        if (!existing || match.confidence > existing.confidence) {
          map.set(match.skuId, match);
        }
        return map;
      }, new Map<string, SKUMatch>())
      .values()
  ).sort((a, b) => b.confidence - a.confidence);

  // Best match is the one with highest confidence
  const bestMatch = uniqueMatches[0] || null;

  // Needs review if confidence is below threshold or no match found
  const needsReview = !bestMatch || bestMatch.confidence < 0.7;

  return {
    lineItemDescription: description,
    matches: uniqueMatches.slice(0, 5), // Top 5 matches
    bestMatch,
    needsReview,
  };
}

/**
 * Bulk map multiple line items
 */
export async function bulkMapLineItems(
  orgId: string,
  lineItems: Array<{ description: string; skuCode?: string; hsnCode?: string }>
): Promise<MappingResult[]> {
  const results: MappingResult[] = [];

  for (const item of lineItems) {
    const result = await mapLineItemToSKU(
      orgId,
      item.description,
      item.skuCode,
      item.hsnCode
    );
    results.push(result);
  }

  return results;
}

/**
 * Learn from user confirmation - add alias to SKU
 */
export async function learnFromMapping(
  skuId: string,
  newAlias: string
): Promise<void> {
  try {
    const sku = await prisma.sKU.findUnique({
      where: { id: skuId },
      select: { aliases: true },
    });

    if (!sku) {
      throw new Error('SKU not found');
    }

    // Check if alias already exists
    if (sku.aliases.includes(newAlias)) {
      return;
    }

    // Add new alias
    await prisma.sKU.update({
      where: { id: skuId },
      data: {
        aliases: {
          push: newAlias,
        },
      },
    });

    logger.info({ skuId, newAlias }, 'SKU alias learned from mapping');
  } catch (error) {
    logger.error({ error, skuId, newAlias }, 'Failed to learn from mapping');
    throw error;
  }
}
