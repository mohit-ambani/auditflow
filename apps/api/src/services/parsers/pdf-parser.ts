import pdfParse from 'pdf-parse';
import logger from '../../lib/logger';

export interface PDFParseResult {
  rawText: string;
  pageCount: number;
  metadata: {
    title?: string;
    author?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
  };
}

/**
 * Parse a PDF file and extract text
 * Uses pdf-parse for text-based PDFs
 * For scanned PDFs (image-based), OCR will be handled separately
 */
export async function parsePDF(buffer: Buffer): Promise<PDFParseResult> {
  try {
    const data = await pdfParse(buffer);

    return {
      rawText: data.text,
      pageCount: data.numpages,
      metadata: {
        title: data.info?.Title,
        author: data.info?.Author,
        creator: data.info?.Creator,
        producer: data.info?.Producer,
        creationDate: data.info?.CreationDate,
        modificationDate: data.info?.ModDate,
      },
    };
  } catch (error) {
    logger.error({ error }, 'Failed to parse PDF');
    throw new Error('Failed to parse PDF file');
  }
}

/**
 * Check if PDF is likely scanned (image-based)
 * If text extraction yields very little text relative to page count,
 * it's likely a scanned document
 */
export function isScannedPDF(result: PDFParseResult): boolean {
  const avgCharsPerPage = result.rawText.length / result.pageCount;
  // If less than 50 characters per page, likely scanned
  return avgCharsPerPage < 50;
}

/**
 * Extract tables from text (basic implementation)
 * Looks for patterns that might indicate tabular data
 */
export function extractTables(text: string): string[][] {
  const tables: string[][] = [];
  const lines = text.split('\n');

  let currentTable: string[] = [];
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Heuristic: if line has multiple numbers or currency symbols, might be table row
    const hasMultipleNumbers = (trimmed.match(/\d+/g) || []).length >= 2;
    const hasCurrency = /₹|Rs\.?|\d+\.\d{2}/.test(trimmed);

    if (hasMultipleNumbers || hasCurrency) {
      currentTable.push(trimmed);
      inTable = true;
    } else if (inTable && trimmed === '') {
      // Empty line might indicate end of table
      if (currentTable.length >= 2) {
        tables.push([...currentTable]);
      }
      currentTable = [];
      inTable = false;
    } else if (inTable) {
      currentTable.push(trimmed);
    }
  }

  // Add last table if exists
  if (currentTable.length >= 2) {
    tables.push(currentTable);
  }

  return tables;
}

/**
 * Extract key-value pairs from text
 * Looks for patterns like "Invoice Number: 12345" or "Date: 01/01/2024"
 */
export function extractKeyValuePairs(text: string): Record<string, string> {
  const pairs: Record<string, string> = {};
  const lines = text.split('\n');

  const patterns = [
    /^([A-Za-z\s]+):\s*(.+)$/,           // "Key: Value"
    /^([A-Za-z\s]+)\s{2,}(.+)$/,         // "Key    Value" (multiple spaces)
  ];

  for (const line of lines) {
    const trimmed = line.trim();

    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        const key = match[1].trim().toLowerCase().replace(/\s+/g, '_');
        const value = match[2].trim();
        if (value && value.length > 0) {
          pairs[key] = value;
        }
        break;
      }
    }
  }

  return pairs;
}

/**
 * Extract dates from text
 * Supports various Indian date formats
 */
export function extractDates(text: string): string[] {
  const dates: string[] = [];

  const patterns = [
    /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/g,     // DD/MM/YYYY or DD-MM-YYYY
    /\b(\d{2,4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/g,     // YYYY/MM/DD
    /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{2,4})\b/gi, // DD Month YYYY
  ];

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      dates.push(match[0]);
    }
  }

  return [...new Set(dates)]; // Remove duplicates
}

/**
 * Extract amounts (currency values) from text
 */
export function extractAmounts(text: string): number[] {
  const amounts: number[] = [];

  const patterns = [
    /₹\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,              // ₹1,234.56
    /Rs\.?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,          // Rs 1,234.56 or Rs. 1,234.56
    /\b(\d{1,3}(?:,\d{3})*\.\d{2})\b/g,                   // 1,234.56
  ];

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const amountStr = match[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      if (!isNaN(amount)) {
        amounts.push(amount);
      }
    }
  }

  return amounts;
}

/**
 * Extract GSTINs from text
 */
export function extractGSTINs(text: string): string[] {
  const gstins: string[] = [];
  const pattern = /\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b/g;

  const matches = text.matchAll(pattern);
  for (const match of matches) {
    gstins.push(match[1]);
  }

  return [...new Set(gstins)]; // Remove duplicates
}

/**
 * Extract invoice/PO numbers from text
 * Looks for common patterns
 */
export function extractDocumentNumbers(text: string): string[] {
  const numbers: string[] = [];

  const patterns = [
    /(?:Invoice|Bill|PO|Purchase Order)\s*(?:No\.?|Number|#)?\s*:?\s*([A-Z0-9\-\/]+)/gi,
    /(?:INV|PO|SO|DO)[\-\/]?\d{4,}/gi,
  ];

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const num = match[1] || match[0];
      if (num && num.length >= 3) {
        numbers.push(num.trim());
      }
    }
  }

  return [...new Set(numbers)]; // Remove duplicates
}
