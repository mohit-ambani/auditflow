import { prisma } from '../lib/prisma';
import logger from '../lib/logger';

// Tolerance thresholds
const AMOUNT_TOLERANCE = 1; // ±₹1 for amount matching
const DATE_TOLERANCE_DAYS = 5; // ±5 days for date matching

export interface GSTMatchResult {
  gstEntryId: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  matchType: 'EXACT' | 'PARTIAL' | 'NO_MATCH';
  matchScore: number;
  discrepancies: {
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    message: string;
    gstValue?: number;
    bookValue?: number;
    difference?: number;
  }[];
  itcStatus: 'AVAILABLE' | 'NOT_FILED' | 'MISMATCH';
}

export interface ReconciliationSummary {
  totalGSTEntries: number;
  totalInvoices: number;
  matched: number;
  unmatched: number;
  missingInBooks: number; // In GSTR but not in books
  missingInGSTR: number; // In books but not in GSTR
  amountMismatches: number;
  gstMismatches: number;
  totalITCAvailable: number;
  totalITCClaimed: number;
  itcDifference: number;
}

/**
 * Calculate days difference between two dates
 */
function daysDiff(date1: Date, date2: Date): number {
  const diff = Math.abs(date1.getTime() - date2.getTime());
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Normalize invoice number for comparison
 */
function normalizeInvoiceNumber(invoiceNumber: string): string {
  return invoiceNumber
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ''); // Remove special characters
}

/**
 * Match a single GST entry to purchase invoices
 */
export async function matchGSTEntryToInvoice(
  gstEntryId: string,
  orgId: string
): Promise<GSTMatchResult> {
  // Get GST entry
  const gstEntry = await prisma.gSTReturnEntry.findUnique({
    where: { id: gstEntryId },
    include: {
      return_: true,
    },
  });

  if (!gstEntry) {
    throw new Error('GST entry not found');
  }

  const discrepancies: GSTMatchResult['discrepancies'] = [];

  // Find matching invoice by GSTIN, invoice number, and date
  const gstDate = gstEntry.invoiceDate ? new Date(gstEntry.invoiceDate) : null;
  const dateFrom = gstDate ? new Date(gstDate) : null;
  const dateTo = gstDate ? new Date(gstDate) : null;

  if (dateFrom) dateFrom.setDate(dateFrom.getDate() - DATE_TOLERANCE_DAYS);
  if (dateTo) dateTo.setDate(dateTo.getDate() + DATE_TOLERANCE_DAYS);

  // Search for matching invoice
  const whereClause: any = {
    orgId,
    vendorGstin: gstEntry.counterpartyGstin,
  };

  if (gstEntry.invoiceNumber) {
    // Try exact match first
    whereClause.invoiceNumber = gstEntry.invoiceNumber;
  }

  if (gstDate && dateFrom && dateTo) {
    whereClause.invoiceDate = {
      gte: dateFrom,
      lte: dateTo,
    };
  }

  let invoice = await prisma.purchaseInvoice.findFirst({
    where: whereClause,
    include: {
      vendor: {
        select: {
          name: true,
          gstin: true,
        },
      },
    },
  });

  // If no exact match, try fuzzy invoice number match
  if (!invoice && gstEntry.invoiceNumber) {
    const normalizedGSTInv = normalizeInvoiceNumber(gstEntry.invoiceNumber);

    const allInvoices = await prisma.purchaseInvoice.findMany({
      where: {
        orgId,
        vendorGstin: gstEntry.counterpartyGstin,
        ...(gstDate && dateFrom && dateTo
          ? {
              invoiceDate: {
                gte: dateFrom,
                lte: dateTo,
              },
            }
          : {}),
      },
      include: {
        vendor: {
          select: {
            name: true,
            gstin: true,
          },
        },
      },
    });

    // Find by normalized invoice number
    invoice = allInvoices.find((inv) => {
      const normalizedInv = normalizeInvoiceNumber(inv.invoiceNumber);
      return normalizedInv === normalizedGSTInv;
    }) || null;
  }

  if (!invoice) {
    // Not found in books
    return {
      gstEntryId,
      invoiceId: null,
      invoiceNumber: gstEntry.invoiceNumber,
      matchType: 'NO_MATCH',
      matchScore: 0,
      discrepancies: [
        {
          type: 'MISSING_IN_BOOKS',
          severity: 'HIGH',
          message: `Invoice ${gstEntry.invoiceNumber || 'N/A'} from ${gstEntry.counterpartyName || gstEntry.counterpartyGstin} found in GSTR but not in books`,
          gstValue: gstEntry.invoiceValue || 0,
        },
      ],
      itcStatus: 'NOT_FILED',
    };
  }

  // Invoice found - now check for mismatches
  let matchScore = 100;

  // Check invoice value
  const gstInvoiceValue = gstEntry.invoiceValue || 0;
  const bookInvoiceValue = invoice.totalWithGst;
  const valueDiff = Math.abs(gstInvoiceValue - bookInvoiceValue);

  if (valueDiff > AMOUNT_TOLERANCE) {
    matchScore -= 30;
    discrepancies.push({
      type: 'AMOUNT_MISMATCH',
      severity: valueDiff > 1000 ? 'HIGH' : valueDiff > 100 ? 'MEDIUM' : 'LOW',
      message: `Invoice value mismatch: GSTR ₹${gstInvoiceValue.toFixed(2)}, Books ₹${bookInvoiceValue.toFixed(2)}`,
      gstValue: gstInvoiceValue,
      bookValue: bookInvoiceValue,
      difference: gstInvoiceValue - bookInvoiceValue,
    });
  }

  // Check GST amounts
  const gstTotal = (gstEntry.cgst || 0) + (gstEntry.sgst || 0) + (gstEntry.igst || 0);
  const bookGSTTotal = invoice.cgst + invoice.sgst + invoice.igst;
  const gstDiff = Math.abs(gstTotal - bookGSTTotal);

  if (gstDiff > AMOUNT_TOLERANCE) {
    matchScore -= 25;
    discrepancies.push({
      type: 'GST_MISMATCH',
      severity: gstDiff > 1000 ? 'HIGH' : gstDiff > 100 ? 'MEDIUM' : 'LOW',
      message: `GST amount mismatch: GSTR ₹${gstTotal.toFixed(2)}, Books ₹${bookGSTTotal.toFixed(2)}`,
      gstValue: gstTotal,
      bookValue: bookGSTTotal,
      difference: gstTotal - bookGSTTotal,
    });
  }

  // Check CGST/SGST vs IGST structure
  const gstHasCGST = (gstEntry.cgst || 0) > 0;
  const bookHasCGST = invoice.cgst > 0;
  const gstHasIGST = (gstEntry.igst || 0) > 0;
  const bookHasIGST = invoice.igst > 0;

  if (gstHasCGST !== bookHasCGST || gstHasIGST !== bookHasIGST) {
    matchScore -= 15;
    discrepancies.push({
      type: 'GST_STRUCTURE_MISMATCH',
      severity: 'MEDIUM',
      message: `GST structure mismatch: GSTR has ${gstHasIGST ? 'IGST' : 'CGST+SGST'}, Books has ${bookHasIGST ? 'IGST' : 'CGST+SGST'}`,
    });
  }

  // Check date
  if (gstDate && invoice.invoiceDate) {
    const dateDiff = daysDiff(gstDate, new Date(invoice.invoiceDate));
    if (dateDiff > DATE_TOLERANCE_DAYS) {
      matchScore -= 10;
      discrepancies.push({
        type: 'DATE_MISMATCH',
        severity: 'LOW',
        message: `Invoice date differs by ${dateDiff} days`,
      });
    }
  }

  // Determine match type
  let matchType: GSTMatchResult['matchType'] = 'EXACT';
  if (matchScore < 100 && matchScore >= 70) {
    matchType = 'PARTIAL';
  } else if (matchScore < 70) {
    matchType = 'NO_MATCH';
  }

  // Determine ITC status
  let itcStatus: GSTMatchResult['itcStatus'] = 'AVAILABLE';
  if (!gstEntry.itcAvailable) {
    itcStatus = 'NOT_FILED';
  } else if (discrepancies.length > 0) {
    itcStatus = 'MISMATCH';
  }

  return {
    gstEntryId,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    matchType,
    matchScore,
    discrepancies,
    itcStatus,
  };
}

/**
 * Reconcile all GST entries for a return
 */
export async function reconcileGSTReturn(
  returnId: string,
  orgId: string
): Promise<{ matches: GSTMatchResult[]; summary: ReconciliationSummary }> {
  // Get all GST entries for this return
  const gstEntries = await prisma.gSTReturnEntry.findMany({
    where: { returnId },
    orderBy: { invoiceDate: 'desc' },
  });

  const matches: GSTMatchResult[] = [];

  // Match each GST entry
  for (const entry of gstEntries) {
    const match = await matchGSTEntryToInvoice(entry.id, orgId);
    matches.push(match);
  }

  // Calculate summary
  const totalGSTEntries = gstEntries.length;
  const matched = matches.filter((m) => m.matchType === 'EXACT').length;
  const partialMatched = matches.filter((m) => m.matchType === 'PARTIAL').length;
  const unmatched = matches.filter((m) => m.matchType === 'NO_MATCH').length;
  const missingInBooks = matches.filter((m) => m.invoiceId === null).length;

  const amountMismatches = matches.filter((m) =>
    m.discrepancies.some((d) => d.type === 'AMOUNT_MISMATCH')
  ).length;

  const gstMismatches = matches.filter((m) =>
    m.discrepancies.some((d) => d.type === 'GST_MISMATCH')
  ).length;

  // Calculate ITC
  const totalITCAvailable = gstEntries.reduce(
    (sum, e) => sum + (e.cgst || 0) + (e.sgst || 0) + (e.igst || 0),
    0
  );

  const matchedEntries = matches.filter((m) => m.invoiceId !== null);
  const totalITCClaimed = matchedEntries.reduce((sum, m) => {
    const entry = gstEntries.find((e) => e.id === m.gstEntryId);
    return entry ? sum + (entry.cgst || 0) + (entry.sgst || 0) + (entry.igst || 0) : sum;
  }, 0);

  // Find invoices missing in GSTR
  const gstReturn = await prisma.gSTReturn.findUnique({
    where: { id: returnId },
  });

  if (!gstReturn) {
    throw new Error('GST return not found');
  }

  // Get period invoices
  const period = gstReturn.period; // "042024"
  const month = parseInt(period.substring(0, 2));
  const year = parseInt(period.substring(2));

  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0);

  const periodInvoices = await prisma.purchaseInvoice.findMany({
    where: {
      orgId,
      invoiceDate: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
  });

  const matchedInvoiceIds = new Set(matches.filter((m) => m.invoiceId).map((m) => m.invoiceId));
  const missingInGSTR = periodInvoices.filter((inv) => !matchedInvoiceIds.has(inv.id)).length;

  const summary: ReconciliationSummary = {
    totalGSTEntries,
    totalInvoices: periodInvoices.length,
    matched: matched + partialMatched,
    unmatched,
    missingInBooks,
    missingInGSTR,
    amountMismatches,
    gstMismatches,
    totalITCAvailable,
    totalITCClaimed,
    itcDifference: totalITCAvailable - totalITCClaimed,
  };

  return { matches, summary };
}

/**
 * Save GST match to database
 */
export async function saveGSTMatch(match: GSTMatchResult): Promise<string> {
  if (!match.invoiceId) {
    throw new Error('Cannot save match without invoice ID');
  }

  const gstEntry = await prisma.gSTReturnEntry.findUnique({
    where: { id: match.gstEntryId },
  });

  if (!gstEntry) {
    throw new Error('GST entry not found');
  }

  const valueDiff = match.discrepancies.find((d) => d.type === 'AMOUNT_MISMATCH')?.difference || 0;
  const gstDiff = match.discrepancies.find((d) => d.type === 'GST_MISMATCH')?.difference || 0;

  const created = await prisma.gSTMatch.create({
    data: {
      gstEntryId: match.gstEntryId,
      purchaseInvoiceId: match.invoiceId,
      matchType: match.matchType,
      matchScore: match.matchScore,
      valueDiff,
      gstDiff,
      itcStatus: match.itcStatus,
      discrepancies: match.discrepancies,
    },
  });

  logger.info(
    {
      matchId: created.id,
      gstEntryId: match.gstEntryId,
      invoiceId: match.invoiceId,
      matchScore: match.matchScore,
    },
    'GST match saved'
  );

  return created.id;
}

/**
 * Save all matches from reconciliation
 */
export async function saveReconciliationMatches(
  matches: GSTMatchResult[]
): Promise<{ saved: number; skipped: number }> {
  let saved = 0;
  let skipped = 0;

  for (const match of matches) {
    if (match.invoiceId) {
      try {
        await saveGSTMatch(match);
        saved++;
      } catch (error) {
        logger.error({ error, match }, 'Failed to save GST match');
        skipped++;
      }
    } else {
      skipped++;
    }
  }

  return { saved, skipped };
}
