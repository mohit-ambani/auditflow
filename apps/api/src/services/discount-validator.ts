import { prisma } from '../lib/prisma';
import logger from '../lib/logger';

interface DiscountValidationResult {
  invoiceId: string;
  expectedDiscount: number;
  actualDiscount: number;
  difference: number;
  status: 'CORRECT' | 'UNDER_DISCOUNTED' | 'OVER_DISCOUNTED' | 'PENALTY_MISSING' | 'PENALTY_INCORRECT' | 'NEEDS_REVIEW';
  notes: string;
  termId?: string;
}

export class DiscountValidator {
  /**
   * Validate discounts on a purchase invoice against vendor discount terms
   */
  async validateInvoiceDiscounts(
    invoiceId: string,
    orgId: string
  ): Promise<DiscountValidationResult> {
    // Get invoice with line items
    const invoice = await prisma.purchaseInvoice.findFirst({
      where: { id: invoiceId, orgId },
      include: {
        lineItems: true,
        vendor: true,
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Calculate actual discount from invoice
    const actualDiscount = invoice.lineItems.reduce(
      (sum, item) => sum + (item.discountAmount || 0),
      0
    );

    // Get active discount terms for the vendor at invoice date
    const activeTerms = await prisma.discountTerm.findMany({
      where: {
        orgId,
        vendorId: invoice.vendorId,
        isActive: true,
        validFrom: { lte: invoice.invoiceDate },
        OR: [
          { validTo: null },
          { validTo: { gte: invoice.invoiceDate } },
        ],
        termType: {
          in: ['TRADE_DISCOUNT', 'CASH_DISCOUNT', 'VOLUME_REBATE', 'SPECIAL_SCHEME'],
        },
      },
    });

    let expectedDiscount = 0;
    let applicableTermId: string | undefined;

    // Calculate expected discount based on terms
    for (const term of activeTerms) {
      // Check minimum order value
      if (term.minOrderValue && invoice.totalAmount < term.minOrderValue) {
        continue;
      }

      // Check SKU applicability
      const invoiceSkuIds = invoice.lineItems
        .filter((item) => item.skuId)
        .map((item) => item.skuId as string);

      if (
        term.applicableSkus.length > 0 &&
        !invoiceSkuIds.some((id) => term.applicableSkus.includes(id))
      ) {
        continue;
      }

      let termDiscount = 0;

      // Calculate discount based on term configuration
      if (term.flatPercent) {
        termDiscount = (invoice.totalAmount * term.flatPercent) / 100;
      } else if (term.flatAmount) {
        termDiscount = term.flatAmount;
      } else if (term.slabs && Array.isArray(term.slabs)) {
        // Find applicable slab
        for (const slab of term.slabs as any[]) {
          const minValue = slab.minValue || 0;
          const maxValue = slab.maxValue || Infinity;

          if (invoice.totalAmount >= minValue && invoice.totalAmount < maxValue) {
            if (slab.discountPercent) {
              termDiscount = (invoice.totalAmount * slab.discountPercent) / 100;
            } else if (slab.discountAmount) {
              termDiscount = slab.discountAmount;
            }
            break;
          }
        }
      }

      // For cash discount, check payment terms
      if (term.termType === 'CASH_DISCOUNT' && term.paymentWithinDays) {
        // Check if invoice was paid within terms (if payment info available)
        const paymentMatch = await prisma.paymentMatch.findFirst({
          where: {
            purchaseInvoiceId: invoiceId,
          },
        });

        if (paymentMatch) {
          const bankTxn = await prisma.bankTransaction.findUnique({
            where: { id: paymentMatch.bankTxnId },
          });

          if (bankTxn) {
            const daysDiff = Math.floor(
              (bankTxn.transactionDate.getTime() - invoice.invoiceDate.getTime()) /
                (1000 * 60 * 60 * 24)
            );

            if (daysDiff > term.paymentWithinDays) {
              continue; // Not eligible for cash discount
            }
          }
        }
      }

      if (termDiscount > expectedDiscount) {
        expectedDiscount = termDiscount;
        applicableTermId = term.id;
      }
    }

    // Round to 2 decimal places
    expectedDiscount = Math.round(expectedDiscount * 100) / 100;
    const difference = Math.round((actualDiscount - expectedDiscount) * 100) / 100;

    // Determine status
    let status: DiscountValidationResult['status'];
    let notes = '';

    const tolerance = 1.0; // ₹1 tolerance

    if (Math.abs(difference) <= tolerance) {
      status = 'CORRECT';
      notes = 'Discount is correct as per terms';
    } else if (difference < -tolerance) {
      status = 'UNDER_DISCOUNTED';
      notes = `Vendor under-discounted by ₹${Math.abs(difference).toFixed(2)}`;
    } else if (difference > tolerance) {
      status = 'OVER_DISCOUNTED';
      notes = `Vendor over-discounted by ₹${difference.toFixed(2)}`;
    } else {
      status = 'NEEDS_REVIEW';
      notes = 'Manual review required';
    }

    return {
      invoiceId,
      expectedDiscount,
      actualDiscount,
      difference,
      status,
      notes,
      termId: applicableTermId,
    };
  }

  /**
   * Calculate late payment penalty for an invoice
   */
  async calculateLatePaymentPenalty(
    invoiceId: string,
    orgId: string,
    paymentDate: Date
  ): Promise<{
    invoiceId: string;
    daysLate: number;
    penaltyAmount: number;
    termId?: string;
  }> {
    const invoice = await prisma.purchaseInvoice.findFirst({
      where: { id: invoiceId, orgId },
      include: { vendor: true },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const dueDate = invoice.dueDate || invoice.invoiceDate;
    const daysLate = Math.max(
      0,
      Math.floor((paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    if (daysLate === 0) {
      return {
        invoiceId,
        daysLate: 0,
        penaltyAmount: 0,
      };
    }

    // Get late payment penalty terms
    const penaltyTerm = await prisma.discountTerm.findFirst({
      where: {
        orgId,
        vendorId: invoice.vendorId,
        isActive: true,
        termType: 'LATE_PAYMENT_PENALTY',
        validFrom: { lte: invoice.invoiceDate },
        OR: [{ validTo: null }, { validTo: { gte: invoice.invoiceDate } }],
      },
    });

    let penaltyAmount = 0;

    if (penaltyTerm && penaltyTerm.latePaymentPenaltyPercent) {
      // Calculate penalty as percentage per month
      const monthsLate = daysLate / 30;
      penaltyAmount =
        (invoice.totalWithGst * penaltyTerm.latePaymentPenaltyPercent * monthsLate) / 100;
      penaltyAmount = Math.round(penaltyAmount * 100) / 100;
    }

    return {
      invoiceId,
      daysLate,
      penaltyAmount,
      termId: penaltyTerm?.id,
    };
  }

  /**
   * Audit all invoices for a vendor
   */
  async auditVendorDiscounts(vendorId: string, orgId: string): Promise<DiscountValidationResult[]> {
    const invoices = await prisma.purchaseInvoice.findMany({
      where: {
        orgId,
        vendorId,
        status: { in: ['VERIFIED', 'MATCHED', 'CLOSED'] },
      },
      orderBy: { invoiceDate: 'desc' },
      take: 100, // Limit to last 100 invoices
    });

    const results: DiscountValidationResult[] = [];

    for (const invoice of invoices) {
      try {
        const result = await this.validateInvoiceDiscounts(invoice.id, orgId);
        results.push(result);

        // Save audit result
        await prisma.discountAudit.create({
          data: {
            invoiceId: invoice.id,
            termId: result.termId,
            expectedDiscount: result.expectedDiscount,
            actualDiscount: result.actualDiscount,
            difference: result.difference,
            status: result.status,
            notes: result.notes,
          },
        });
      } catch (error) {
        logger.error({ error, invoiceId: invoice.id }, 'Failed to audit invoice discount');
      }
    }

    return results;
  }

  /**
   * Get discount audit summary for an organization
   */
  async getAuditSummary(orgId: string): Promise<{
    totalAudited: number;
    correct: number;
    underDiscounted: number;
    overDiscounted: number;
    penaltyIssues: number;
    needsReview: number;
    totalDiscrepancy: number;
  }> {
    const audits = await prisma.discountAudit.findMany({
      where: {
        invoice: { orgId },
      },
    });

    const summary = {
      totalAudited: audits.length,
      correct: 0,
      underDiscounted: 0,
      overDiscounted: 0,
      penaltyIssues: 0,
      needsReview: 0,
      totalDiscrepancy: 0,
    };

    for (const audit of audits) {
      summary.totalDiscrepancy += Math.abs(audit.difference);

      switch (audit.status) {
        case 'CORRECT':
          summary.correct++;
          break;
        case 'UNDER_DISCOUNTED':
          summary.underDiscounted++;
          break;
        case 'OVER_DISCOUNTED':
          summary.overDiscounted++;
          break;
        case 'PENALTY_MISSING':
        case 'PENALTY_INCORRECT':
          summary.penaltyIssues++;
          break;
        case 'NEEDS_REVIEW':
          summary.needsReview++;
          break;
      }
    }

    summary.totalDiscrepancy = Math.round(summary.totalDiscrepancy * 100) / 100;

    return summary;
  }
}

export const discountValidator = new DiscountValidator();
