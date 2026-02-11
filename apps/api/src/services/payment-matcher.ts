import { prisma } from '../lib/prisma';
import logger from '../lib/logger';

// Tolerance thresholds
const AMOUNT_TOLERANCE = 10; // ±₹10 fuzzy matching
const DATE_RANGE_DAYS = 7; // Look within ±7 days
const HIGH_CONFIDENCE_THRESHOLD = 90; // 90%+ = auto-match
const PARTIAL_PAYMENT_THRESHOLD = 0.95; // 95%+ of invoice = full payment

export interface InvoiceMatch {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  totalAmount: number;
  amountPaid: number;
  outstandingAmount: number;
  matchScore: number;
  matchReason: string;
  isPartialPayment: boolean;
  daysSinceInvoice: number;
  isOverdue: boolean;
}

export interface PaymentMatchResult {
  bankTxnId: string;
  transactionDate: string;
  amount: number;
  description: string;
  referenceNumber: string | null;
  matches: InvoiceMatch[];
  bestMatch: InvoiceMatch | null;
  totalMatched: number;
  unmatchedAmount: number;
  matchType: 'EXACT' | 'FUZZY' | 'REFERENCE' | 'SPLIT' | 'PARTIAL' | 'NO_MATCH';
  confidence: number;
  autoMatch: boolean;
  needsReview: boolean;
}

/**
 * Calculate days difference between two dates
 */
function daysDiff(date1: Date, date2: Date): number {
  const diff = Math.abs(date1.getTime() - date2.getTime());
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Check if amount is within tolerance
 */
function isAmountMatch(expected: number, actual: number, tolerance: number = AMOUNT_TOLERANCE): boolean {
  return Math.abs(expected - actual) <= tolerance;
}

/**
 * Extract invoice number from reference/description
 */
function extractInvoiceNumber(text: string): string | null {
  // Common patterns: INV-2024-001, INV/2024/001, Invoice #001, etc.
  const patterns = [
    /INV[/-](\d{4})[/-](\d+)/i,
    /INVOICE[#\s]*(\d+)/i,
    /INV[#\s]*(\d+)/i,
    /BILL[#\s]*(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return null;
}

/**
 * Calculate match score for an invoice
 */
function calculateMatchScore(
  invoice: any,
  txnAmount: number,
  txnDate: Date,
  referenceNumber: string | null,
  description: string
): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];

  const invoiceDate = new Date(invoice.invoiceDate);
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
  const outstanding = invoice.totalWithGst - invoice.amountPaid;

  // Exact amount match (40 points)
  if (Math.abs(txnAmount - outstanding) < 1) {
    score += 40;
    reasons.push('Exact amount');
  } else if (isAmountMatch(txnAmount, outstanding, AMOUNT_TOLERANCE)) {
    score += 30;
    reasons.push('Fuzzy amount match');
  } else if (txnAmount < outstanding && txnAmount / outstanding >= PARTIAL_PAYMENT_THRESHOLD) {
    score += 25;
    reasons.push('Partial payment (95%+)');
  } else if (txnAmount < outstanding && txnAmount / outstanding >= 0.5) {
    score += 15;
    reasons.push('Partial payment (50%+)');
  }

  // Reference number match (30 points)
  if (referenceNumber) {
    const refLower = referenceNumber.toLowerCase();
    const invNumLower = invoice.invoiceNumber.toLowerCase();

    if (refLower.includes(invNumLower) || invNumLower.includes(refLower)) {
      score += 30;
      reasons.push('Reference match');
    } else {
      const extractedInv = extractInvoiceNumber(referenceNumber);
      if (extractedInv && invNumLower.includes(extractedInv.toLowerCase())) {
        score += 25;
        reasons.push('Extracted reference match');
      }
    }
  }

  // Description match (15 points)
  if (description) {
    const descLower = description.toLowerCase();
    const invNumLower = invoice.invoiceNumber.toLowerCase();

    if (descLower.includes(invNumLower)) {
      score += 15;
      reasons.push('Description match');
    }
  }

  // Date proximity (15 points)
  const daysSinceInvoice = daysDiff(txnDate, invoiceDate);
  const daysFromDue = dueDate ? daysDiff(txnDate, dueDate) : null;

  if (daysSinceInvoice <= 7) {
    score += 15;
    reasons.push('Within 7 days of invoice');
  } else if (daysSinceInvoice <= 30) {
    score += 10;
    reasons.push('Within 30 days of invoice');
  } else if (daysFromDue !== null && Math.abs(daysFromDue) <= 7) {
    score += 12;
    reasons.push('Near due date');
  } else if (daysSinceInvoice <= 60) {
    score += 5;
    reasons.push('Within 60 days');
  }

  return {
    score: Math.min(score, 100),
    reason: reasons.join(', '),
  };
}

/**
 * Match a payment transaction to invoices (purchase or sales)
 */
export async function matchPaymentToInvoices(
  bankTxnId: string,
  orgId: string,
  invoiceType: 'purchase' | 'sales'
): Promise<PaymentMatchResult> {
  // Get bank transaction
  const bankTxn = await prisma.bankTransaction.findFirst({
    where: { id: bankTxnId, orgId },
  });

  if (!bankTxn) {
    throw new Error('Bank transaction not found');
  }

  const txnAmount = bankTxn.debit || bankTxn.credit || 0;
  const isDebit = !!bankTxn.debit;
  const txnDate = new Date(bankTxn.transactionDate);

  // For debit transactions, match to purchase invoices
  // For credit transactions, match to sales invoices
  const matchPurchase = isDebit;
  const matchSales = !isDebit;

  if ((invoiceType === 'purchase' && !matchPurchase) || (invoiceType === 'sales' && !matchSales)) {
    return {
      bankTxnId,
      transactionDate: bankTxn.transactionDate.toISOString(),
      amount: txnAmount,
      description: bankTxn.description,
      referenceNumber: bankTxn.referenceNumber,
      matches: [],
      bestMatch: null,
      totalMatched: 0,
      unmatchedAmount: txnAmount,
      matchType: 'NO_MATCH',
      confidence: 0,
      autoMatch: false,
      needsReview: true,
    };
  }

  // Get unpaid/partially paid invoices
  const dateFrom = new Date(txnDate);
  dateFrom.setDate(dateFrom.getDate() - DATE_RANGE_DAYS);
  const dateTo = new Date(txnDate);
  dateTo.setDate(dateTo.getDate() + DATE_RANGE_DAYS);

  let invoices: any[] = [];

  if (invoiceType === 'purchase') {
    invoices = await prisma.purchaseInvoice.findMany({
      where: {
        orgId,
        paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] },
        invoiceDate: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      orderBy: { invoiceDate: 'desc' },
      take: 50,
    });
  } else {
    invoices = await prisma.salesInvoice.findMany({
      where: {
        orgId,
        paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] },
        invoiceDate: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      orderBy: { invoiceDate: 'desc' },
      take: 50,
    });
  }

  // Score each invoice
  const matches: InvoiceMatch[] = [];

  for (const invoice of invoices) {
    const outstanding = invoice.totalWithGst - invoice.amountPaid;

    if (outstanding <= 0) continue; // Skip fully paid

    const { score, reason } = calculateMatchScore(
      invoice,
      txnAmount,
      txnDate,
      bankTxn.referenceNumber,
      bankTxn.description
    );

    if (score >= 15) {
      // Minimum threshold
      const daysSinceInvoice = daysDiff(txnDate, new Date(invoice.invoiceDate));
      const isOverdue = invoice.dueDate
        ? new Date() > new Date(invoice.dueDate)
        : daysSinceInvoice > 30;

      matches.push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate.toISOString(),
        dueDate: invoice.dueDate?.toISOString() || null,
        totalAmount: invoice.totalWithGst,
        amountPaid: invoice.amountPaid,
        outstandingAmount: outstanding,
        matchScore: score,
        matchReason: reason,
        isPartialPayment: txnAmount < outstanding,
        daysSinceInvoice,
        isOverdue,
      });
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.matchScore - a.matchScore);

  const bestMatch = matches[0] || null;

  // Determine match type
  let matchType: PaymentMatchResult['matchType'] = 'NO_MATCH';
  let totalMatched = 0;

  if (bestMatch) {
    if (Math.abs(txnAmount - bestMatch.outstandingAmount) < 1) {
      matchType = 'EXACT';
      totalMatched = txnAmount;
    } else if (isAmountMatch(txnAmount, bestMatch.outstandingAmount, AMOUNT_TOLERANCE)) {
      matchType = 'FUZZY';
      totalMatched = Math.min(txnAmount, bestMatch.outstandingAmount);
    } else if (bestMatch.matchReason.includes('Reference')) {
      matchType = 'REFERENCE';
      totalMatched = Math.min(txnAmount, bestMatch.outstandingAmount);
    } else if (txnAmount < bestMatch.outstandingAmount) {
      matchType = 'PARTIAL';
      totalMatched = txnAmount;
    } else if (txnAmount > bestMatch.outstandingAmount) {
      // Might be a split payment to multiple invoices
      matchType = 'SPLIT';
      totalMatched = bestMatch.outstandingAmount;
    }
  }

  const unmatchedAmount = txnAmount - totalMatched;
  const confidence = bestMatch?.matchScore || 0;
  const autoMatch = confidence >= HIGH_CONFIDENCE_THRESHOLD && matchType !== 'SPLIT';
  const needsReview = !autoMatch || matchType === 'SPLIT' || unmatchedAmount > AMOUNT_TOLERANCE;

  return {
    bankTxnId,
    transactionDate: bankTxn.transactionDate.toISOString(),
    amount: txnAmount,
    description: bankTxn.description,
    referenceNumber: bankTxn.referenceNumber,
    matches,
    bestMatch,
    totalMatched,
    unmatchedAmount,
    matchType,
    confidence,
    autoMatch,
    needsReview,
  };
}

/**
 * Create payment match record and update invoice
 */
export async function createPaymentMatch(
  bankTxnId: string,
  invoiceId: string,
  invoiceType: 'purchase' | 'sales',
  matchedAmount: number,
  matchScore: number,
  notes?: string
): Promise<string> {
  const result = await prisma.$transaction(async (tx) => {
    // Create payment match
    const match = await tx.paymentMatch.create({
      data: {
        bankTxnId,
        ...(invoiceType === 'purchase'
          ? { purchaseInvoiceId: invoiceId }
          : { salesInvoiceId: invoiceId }),
        matchedAmount,
        matchType: matchScore >= 95 ? 'EXACT' : matchScore >= 70 ? 'PARTIAL_QTY' : 'PARTIAL_BOTH',
        matchScore,
        discrepancy: 0,
        notes,
      },
    });

    // Update invoice payment status
    if (invoiceType === 'purchase') {
      const invoice = await tx.purchaseInvoice.findUnique({
        where: { id: invoiceId },
      });

      if (invoice) {
        const newAmountPaid = invoice.amountPaid + matchedAmount;
        const paymentStatus =
          newAmountPaid >= invoice.totalWithGst - 1
            ? 'PAID'
            : newAmountPaid > 0
            ? 'PARTIALLY_PAID'
            : 'UNPAID';

        await tx.purchaseInvoice.update({
          where: { id: invoiceId },
          data: {
            amountPaid: newAmountPaid,
            paymentStatus,
          },
        });
      }
    } else {
      const invoice = await tx.salesInvoice.findUnique({
        where: { id: invoiceId },
      });

      if (invoice) {
        const newAmountPaid = invoice.amountPaid + matchedAmount;
        const paymentStatus =
          newAmountPaid >= invoice.totalWithGst - 1
            ? 'PAID'
            : newAmountPaid > 0
            ? 'PARTIALLY_PAID'
            : 'UNPAID';

        await tx.salesInvoice.update({
          where: { id: invoiceId },
          data: {
            amountPaid: newAmountPaid,
            paymentStatus,
          },
        });
      }
    }

    // Update bank transaction status
    await tx.bankTransaction.update({
      where: { id: bankTxnId },
      data: {
        matchStatus: matchScore >= HIGH_CONFIDENCE_THRESHOLD ? 'AUTO_MATCHED' : 'MANUALLY_MATCHED',
      },
    });

    return match.id;
  });

  logger.info(
    {
      matchId: result,
      bankTxnId,
      invoiceId,
      matchedAmount,
      matchScore,
    },
    'Payment match created'
  );

  return result;
}

/**
 * Handle split payment (one transaction to multiple invoices)
 */
export async function createSplitPayment(
  bankTxnId: string,
  splits: Array<{
    invoiceId: string;
    invoiceType: 'purchase' | 'sales';
    amount: number;
  }>,
  notes?: string
): Promise<string[]> {
  const matchIds: string[] = [];

  for (const split of splits) {
    const matchId = await createPaymentMatch(
      bankTxnId,
      split.invoiceId,
      split.invoiceType,
      split.amount,
      80, // Split payments get a fixed score
      notes
    );
    matchIds.push(matchId);
  }

  logger.info({ bankTxnId, splits: splits.length }, 'Split payment created');

  return matchIds;
}
