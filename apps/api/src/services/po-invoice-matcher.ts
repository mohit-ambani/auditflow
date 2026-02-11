import { prisma } from '../lib/prisma';
import logger from '../lib/logger';

// Tolerance thresholds
const QTY_TOLERANCE_PERCENT = 5; // ±5% quantity variance
const PRICE_TOLERANCE_PERCENT = 2; // ±2% price variance
const HIGH_CONFIDENCE_THRESHOLD = 90; // 90%+ = auto-approve
const LOW_CONFIDENCE_THRESHOLD = 50; // <50% = needs review

export interface LineItemMatch {
  poLineId: string;
  invoiceLineId: string;
  skuMatch: boolean;
  skuId: string | null;
  description: string;
  qtyOrdered: number;
  qtyInvoiced: number;
  qtyVariance: number;
  qtyVariancePercent: number;
  qtyWithinTolerance: boolean;
  priceOrdered: number;
  priceInvoiced: number;
  priceVariance: number;
  priceVariancePercent: number;
  priceWithinTolerance: boolean;
  amountOrdered: number;
  amountInvoiced: number;
  amountVariance: number;
  matchScore: number;
  matchType: 'EXACT' | 'PARTIAL' | 'NO_MATCH';
}

export interface POInvoiceMatch {
  poId: string;
  poNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  vendorId: string;
  lineMatches: LineItemMatch[];
  totalQtyMatch: boolean;
  totalValueMatch: boolean;
  totalGstMatch: boolean;
  overallMatchScore: number;
  matchType: 'EXACT' | 'PARTIAL_QTY' | 'PARTIAL_VALUE' | 'PARTIAL_BOTH' | 'NO_MATCH';
  discrepancies: {
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    message: string;
    poValue?: number;
    invoiceValue?: number;
    variance?: number;
  }[];
  needsReview: boolean;
  autoApprove: boolean;
}

/**
 * Calculate percentage variance
 */
function calculateVariancePercent(expected: number, actual: number): number {
  if (expected === 0) return actual === 0 ? 0 : 100;
  return Math.abs(((actual - expected) / expected) * 100);
}

/**
 * Check if value is within tolerance
 */
function isWithinTolerance(
  expected: number,
  actual: number,
  tolerancePercent: number
): boolean {
  const variance = calculateVariancePercent(expected, actual);
  return variance <= tolerancePercent;
}

/**
 * Match a single invoice line item to PO line items
 */
function matchInvoiceLineToPO(
  invoiceLine: any,
  poLines: any[]
): { poLine: any; score: number } | null {
  let bestMatch: { poLine: any; score: number } | null = null;

  for (const poLine of poLines) {
    let score = 0;

    // SKU match (highest priority)
    if (invoiceLine.skuId && poLine.skuId && invoiceLine.skuId === poLine.skuId) {
      score += 40;
    } else if (
      invoiceLine.description &&
      poLine.description &&
      invoiceLine.description.toLowerCase().includes(poLine.description.toLowerCase())
    ) {
      score += 20; // Partial description match
    }

    // HSN code match
    if (invoiceLine.hsnCode && poLine.hsnCode && invoiceLine.hsnCode === poLine.hsnCode) {
      score += 15;
    }

    // Quantity match
    if (isWithinTolerance(poLine.quantity, invoiceLine.quantity, QTY_TOLERANCE_PERCENT)) {
      score += 25;
    } else {
      const qtyVariance = calculateVariancePercent(poLine.quantity, invoiceLine.quantity);
      score += Math.max(0, 25 - qtyVariance); // Partial score based on variance
    }

    // Price match
    if (isWithinTolerance(poLine.unitPrice, invoiceLine.unitPrice, PRICE_TOLERANCE_PERCENT)) {
      score += 20;
    } else {
      const priceVariance = calculateVariancePercent(poLine.unitPrice, invoiceLine.unitPrice);
      score += Math.max(0, 20 - priceVariance); // Partial score based on variance
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { poLine, score };
    }
  }

  // Only return if score is above minimum threshold
  return bestMatch && bestMatch.score >= 30 ? bestMatch : null;
}

/**
 * Create line item match details
 */
function createLineItemMatch(
  poLine: any,
  invoiceLine: any,
  matchScore: number
): LineItemMatch {
  const qtyVariance = invoiceLine.quantity - poLine.quantity;
  const qtyVariancePercent = calculateVariancePercent(poLine.quantity, invoiceLine.quantity);
  const priceVariance = invoiceLine.unitPrice - poLine.unitPrice;
  const priceVariancePercent = calculateVariancePercent(poLine.unitPrice, invoiceLine.unitPrice);
  const amountVariance = invoiceLine.totalAmount - poLine.totalAmount;

  const qtyWithinTolerance = isWithinTolerance(
    poLine.quantity,
    invoiceLine.quantity,
    QTY_TOLERANCE_PERCENT
  );
  const priceWithinTolerance = isWithinTolerance(
    poLine.unitPrice,
    invoiceLine.unitPrice,
    PRICE_TOLERANCE_PERCENT
  );

  let matchType: 'EXACT' | 'PARTIAL' | 'NO_MATCH' = 'NO_MATCH';
  if (matchScore >= 90) {
    matchType = 'EXACT';
  } else if (matchScore >= 50) {
    matchType = 'PARTIAL';
  }

  return {
    poLineId: poLine.id,
    invoiceLineId: invoiceLine.id,
    skuMatch: poLine.skuId === invoiceLine.skuId,
    skuId: invoiceLine.skuId,
    description: invoiceLine.description,
    qtyOrdered: poLine.quantity,
    qtyInvoiced: invoiceLine.quantity,
    qtyVariance,
    qtyVariancePercent: Math.round(qtyVariancePercent * 100) / 100,
    qtyWithinTolerance,
    priceOrdered: poLine.unitPrice,
    priceInvoiced: invoiceLine.unitPrice,
    priceVariance,
    priceVariancePercent: Math.round(priceVariancePercent * 100) / 100,
    priceWithinTolerance,
    amountOrdered: poLine.totalAmount,
    amountInvoiced: invoiceLine.totalAmount,
    amountVariance,
    matchScore,
    matchType,
  };
}

/**
 * Match purchase invoice to purchase order
 */
export async function matchInvoiceToPO(
  invoiceId: string,
  poId: string,
  orgId: string
): Promise<POInvoiceMatch> {
  // Fetch invoice with line items
  const invoice = await prisma.purchaseInvoice.findFirst({
    where: { id: invoiceId, orgId },
    include: {
      lineItems: {
        orderBy: { lineNumber: 'asc' },
      },
    },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  // Fetch PO with line items
  const po = await prisma.purchaseOrder.findFirst({
    where: { id: poId, orgId },
    include: {
      lineItems: {
        orderBy: { lineNumber: 'asc' },
      },
    },
  });

  if (!po) {
    throw new Error('Purchase Order not found');
  }

  // Verify vendor match
  if (invoice.vendorId !== po.vendorId) {
    throw new Error('Invoice and PO have different vendors');
  }

  const lineMatches: LineItemMatch[] = [];
  const unmatchedPOLines: any[] = [...po.lineItems];
  const unmatchedInvoiceLines: any[] = [];

  // Match each invoice line to PO lines
  for (const invoiceLine of invoice.lineItems) {
    const match = matchInvoiceLineToPO(invoiceLine, unmatchedPOLines);

    if (match) {
      const lineMatch = createLineItemMatch(match.poLine, invoiceLine, match.score);
      lineMatches.push(lineMatch);

      // Remove matched PO line
      const index = unmatchedPOLines.findIndex((pl) => pl.id === match.poLine.id);
      if (index !== -1) {
        unmatchedPOLines.splice(index, 1);
      }
    } else {
      unmatchedInvoiceLines.push(invoiceLine);
    }
  }

  // Calculate overall match score
  const avgLineScore =
    lineMatches.length > 0
      ? lineMatches.reduce((sum, m) => sum + m.matchScore, 0) / lineMatches.length
      : 0;

  const totalQtyVariance = calculateVariancePercent(po.totalAmount, invoice.totalAmount);
  const totalGstVariance = calculateVariancePercent(po.totalWithGst, invoice.totalWithGst);

  const totalQtyMatch = isWithinTolerance(po.totalAmount, invoice.totalAmount, QTY_TOLERANCE_PERCENT);
  const totalValueMatch = totalQtyMatch;
  const totalGstMatch = isWithinTolerance(po.totalWithGst, invoice.totalWithGst, PRICE_TOLERANCE_PERCENT);

  // Overall score: 60% line matches + 20% total value + 20% GST
  const overallMatchScore =
    avgLineScore * 0.6 +
    (totalValueMatch ? 20 : Math.max(0, 20 - totalQtyVariance)) +
    (totalGstMatch ? 20 : Math.max(0, 20 - totalGstVariance));

  // Detect discrepancies
  const discrepancies: POInvoiceMatch['discrepancies'] = [];

  // Unmatched PO lines (short supply)
  for (const poLine of unmatchedPOLines) {
    discrepancies.push({
      type: 'SHORT_SUPPLY',
      severity: 'HIGH',
      message: `PO line item "${poLine.description}" (Qty: ${poLine.quantity}) not found in invoice`,
      poValue: poLine.totalAmount,
    });
  }

  // Unmatched invoice lines (excess supply)
  for (const invLine of unmatchedInvoiceLines) {
    discrepancies.push({
      type: 'EXCESS_SUPPLY',
      severity: 'MEDIUM',
      message: `Invoice line item "${invLine.description}" (Qty: ${invLine.quantity}) not found in PO`,
      invoiceValue: invLine.totalAmount,
    });
  }

  // Quantity variances
  for (const match of lineMatches) {
    if (!match.qtyWithinTolerance) {
      discrepancies.push({
        type: 'QTY_VARIANCE',
        severity: Math.abs(match.qtyVariancePercent) > 10 ? 'HIGH' : 'MEDIUM',
        message: `Quantity mismatch for "${match.description}": PO ${match.qtyOrdered}, Invoice ${match.qtyInvoiced} (${match.qtyVariancePercent >= 0 ? '+' : ''}${match.qtyVariancePercent}%)`,
        poValue: match.qtyOrdered,
        invoiceValue: match.qtyInvoiced,
        variance: match.qtyVariance,
      });
    }
  }

  // Price variances
  for (const match of lineMatches) {
    if (!match.priceWithinTolerance) {
      discrepancies.push({
        type: 'PRICE_VARIANCE',
        severity: Math.abs(match.priceVariancePercent) > 5 ? 'HIGH' : 'LOW',
        message: `Price mismatch for "${match.description}": PO ₹${match.priceOrdered}, Invoice ₹${match.priceInvoiced} (${match.priceVariancePercent >= 0 ? '+' : ''}${match.priceVariancePercent}%)`,
        poValue: match.priceOrdered,
        invoiceValue: match.priceInvoiced,
        variance: match.priceVariance,
      });
    }
  }

  // Total value variance
  if (!totalValueMatch) {
    discrepancies.push({
      type: 'VALUE_VARIANCE',
      severity: totalQtyVariance > 10 ? 'HIGH' : 'MEDIUM',
      message: `Total value mismatch: PO ₹${po.totalAmount}, Invoice ₹${invoice.totalAmount} (${totalQtyVariance >= 0 ? '+' : ''}${totalQtyVariance.toFixed(2)}%)`,
      poValue: po.totalAmount,
      invoiceValue: invoice.totalAmount,
      variance: invoice.totalAmount - po.totalAmount,
    });
  }

  // Determine match type
  let matchType: POInvoiceMatch['matchType'] = 'NO_MATCH';
  if (overallMatchScore >= 95 && discrepancies.length === 0) {
    matchType = 'EXACT';
  } else if (!totalQtyMatch && !totalGstMatch) {
    matchType = 'PARTIAL_BOTH';
  } else if (!totalQtyMatch) {
    matchType = 'PARTIAL_QTY';
  } else if (!totalGstMatch) {
    matchType = 'PARTIAL_VALUE';
  } else if (overallMatchScore >= 50) {
    matchType = 'PARTIAL_QTY'; // Default to partial if score is decent
  }

  const needsReview =
    overallMatchScore < HIGH_CONFIDENCE_THRESHOLD ||
    discrepancies.some((d) => d.severity === 'HIGH');
  const autoApprove =
    overallMatchScore >= HIGH_CONFIDENCE_THRESHOLD &&
    discrepancies.filter((d) => d.severity === 'HIGH').length === 0;

  return {
    poId: po.id,
    poNumber: po.poNumber,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    vendorId: invoice.vendorId,
    lineMatches,
    totalQtyMatch,
    totalValueMatch,
    totalGstMatch,
    overallMatchScore: Math.round(overallMatchScore * 100) / 100,
    matchType,
    discrepancies,
    needsReview,
    autoApprove,
  };
}

/**
 * Find best matching PO for an invoice
 */
export async function findBestPOForInvoice(
  invoiceId: string,
  orgId: string
): Promise<{ poId: string; matchScore: number; match: POInvoiceMatch } | null> {
  // Get invoice
  const invoice = await prisma.purchaseInvoice.findFirst({
    where: { id: invoiceId, orgId },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  // Get open POs for the same vendor
  const openPOs = await prisma.purchaseOrder.findMany({
    where: {
      orgId,
      vendorId: invoice.vendorId,
      status: {
        in: ['OPEN', 'PARTIALLY_FULFILLED'],
      },
    },
    orderBy: { poDate: 'desc' },
  });

  if (openPOs.length === 0) {
    logger.warn({ invoiceId, vendorId: invoice.vendorId }, 'No open POs found for vendor');
    return null;
  }

  let bestMatch: { poId: string; matchScore: number; match: POInvoiceMatch } | null = null;

  for (const po of openPOs) {
    try {
      const match = await matchInvoiceToPO(invoiceId, po.id, orgId);

      if (!bestMatch || match.overallMatchScore > bestMatch.matchScore) {
        bestMatch = {
          poId: po.id,
          matchScore: match.overallMatchScore,
          match,
        };
      }
    } catch (error) {
      logger.error({ error, poId: po.id, invoiceId }, 'Error matching PO to invoice');
    }
  }

  return bestMatch;
}

/**
 * Save match to database
 */
export async function saveMatch(match: POInvoiceMatch): Promise<string> {
  const created = await prisma.purchaseInvoiceMatch.create({
    data: {
      invoiceId: match.invoiceId,
      poId: match.poId,
      matchType: match.matchType,
      matchScore: match.overallMatchScore,
      qtyMatch: match.totalQtyMatch,
      valueMatch: match.totalValueMatch,
      gstMatch: match.totalGstMatch,
      discrepancies: match.discrepancies,
    },
  });

  logger.info(
    {
      matchId: created.id,
      poNumber: match.poNumber,
      invoiceNumber: match.invoiceNumber,
      score: match.overallMatchScore,
    },
    'PO-Invoice match saved'
  );

  return created.id;
}
