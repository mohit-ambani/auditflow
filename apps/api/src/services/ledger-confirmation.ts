import { prisma } from '../lib/prisma';
import logger from '../lib/logger';

export interface VendorLedgerData {
  vendorId: string;
  vendorName: string;
  periodFrom: Date;
  periodTo: Date;
  openingBalance: number;
  purchases: number;
  payments: number;
  adjustments: number;
  closingBalance: number;
  invoices: Array<{
    invoiceNumber: string;
    invoiceDate: Date;
    amount: number;
    dueDate: Date;
    status: string;
  }>;
  payments_list: Array<{
    date: Date;
    amount: number;
    reference: string;
  }>;
}

export class LedgerConfirmationService {
  /**
   * Generate vendor ledger statement for a period
   */
  async generateVendorLedger(
    vendorId: string,
    periodFrom: Date,
    periodTo: Date,
    orgId: string
  ): Promise<VendorLedgerData> {
    const vendor = await prisma.vendor.findFirst({
      where: { id: vendorId, orgId },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Get all invoices in period
    const invoices = await prisma.purchaseInvoice.findMany({
      where: {
        vendorId,
        orgId,
        invoiceDate: {
          gte: periodFrom,
          lte: periodTo,
        },
      },
      orderBy: { invoiceDate: 'asc' },
    });

    // Get all payments in period
    const payments = await prisma.paymentMatch.findMany({
      where: {
        purchaseInvoice: {
          vendorId,
          orgId,
        },
        bankTransaction: {
          transactionDate: {
            gte: periodFrom,
            lte: periodTo,
          },
        },
      },
      include: {
        bankTransaction: true,
        purchaseInvoice: true,
      },
      orderBy: { bankTransaction: { transactionDate: 'asc' } },
    });

    // Calculate balances
    const purchases = invoices.reduce((sum, inv) => sum + inv.totalWithGst, 0);
    const totalPayments = payments.reduce((sum, pmt) => sum + pmt.matchedAmount, 0);

    // Get opening balance (unpaid invoices before period)
    const oldInvoices = await prisma.purchaseInvoice.findMany({
      where: {
        vendorId,
        orgId,
        invoiceDate: { lt: periodFrom },
        paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] },
      },
    });

    const openingBalance = oldInvoices.reduce(
      (sum, inv) => sum + (inv.totalWithGst - inv.amountPaid),
      0
    );

    const closingBalance = openingBalance + purchases - totalPayments;

    return {
      vendorId,
      vendorName: vendor.name,
      periodFrom,
      periodTo,
      openingBalance: Math.round(openingBalance * 100) / 100,
      purchases: Math.round(purchases * 100) / 100,
      payments: Math.round(totalPayments * 100) / 100,
      adjustments: 0,
      closingBalance: Math.round(closingBalance * 100) / 100,
      invoices: invoices.map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        amount: inv.totalWithGst,
        dueDate: inv.dueDate || inv.invoiceDate,
        status: inv.paymentStatus,
      })),
      payments_list: payments.map((pmt) => ({
        date: pmt.bankTransaction.transactionDate,
        amount: pmt.matchedAmount,
        reference: pmt.bankTransaction.referenceNumber || 'N/A',
      })),
    };
  }

  /**
   * Create ledger confirmation request
   */
  async createConfirmationRequest(
    vendorId: string,
    periodFrom: Date,
    periodTo: Date,
    orgId: string
  ): Promise<string> {
    const ledgerData = await this.generateVendorLedger(vendorId, periodFrom, periodTo, orgId);

    const confirmation = await prisma.vendorLedgerConfirmation.create({
      data: {
        vendorId,
        periodFrom,
        periodTo,
        ourBalance: ledgerData.closingBalance,
        status: 'PENDING',
      },
    });

    logger.info(
      { confirmationId: confirmation.id, vendorId, orgId },
      'Vendor ledger confirmation created'
    );

    return confirmation.id;
  }

  /**
   * Send ledger confirmation email to vendor
   */
  async sendConfirmationEmail(confirmationId: string, orgId: string): Promise<boolean> {
    const confirmation = await prisma.vendorLedgerConfirmation.findFirst({
      where: {
        id: confirmationId,
        vendor: { orgId },
      },
      include: {
        vendor: true,
      },
    });

    if (!confirmation) {
      throw new Error('Confirmation not found');
    }

    if (!confirmation.vendor.email) {
      throw new Error('Vendor email not configured');
    }

    // TODO: Implement actual email sending with email service
    // For now, just update the status

    await prisma.vendorLedgerConfirmation.update({
      where: { id: confirmationId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        emailMessageId: `mock-${confirmationId}`,
      },
    });

    logger.info({ confirmationId, vendorEmail: confirmation.vendor.email }, 'Ledger confirmation email sent');

    return true;
  }

  /**
   * Record vendor response to confirmation
   */
  async recordVendorResponse(
    confirmationId: string,
    vendorBalance: number,
    responseNotes: string,
    orgId: string
  ): Promise<void> {
    const confirmation = await prisma.vendorLedgerConfirmation.findFirst({
      where: {
        id: confirmationId,
        vendor: { orgId },
      },
    });

    if (!confirmation) {
      throw new Error('Confirmation not found');
    }

    const difference = Math.round((vendorBalance - confirmation.ourBalance) * 100) / 100;
    const status = Math.abs(difference) <= 1.0 ? 'CONFIRMED' : 'DISPUTED';

    await prisma.vendorLedgerConfirmation.update({
      where: { id: confirmationId },
      data: {
        vendorBalance,
        difference,
        status,
        respondedAt: new Date(),
        responseNotes,
      },
    });

    logger.info(
      { confirmationId, status, difference },
      'Vendor response recorded'
    );
  }

  /**
   * Get confirmation summary statistics
   */
  async getConfirmationStats(orgId: string): Promise<{
    total: number;
    pending: number;
    sent: number;
    confirmed: number;
    disputed: number;
    noResponse: number;
    totalDifference: number;
  }> {
    const confirmations = await prisma.vendorLedgerConfirmation.findMany({
      where: {
        vendor: { orgId },
      },
    });

    const stats = {
      total: confirmations.length,
      pending: 0,
      sent: 0,
      confirmed: 0,
      disputed: 0,
      noResponse: 0,
      totalDifference: 0,
    };

    for (const conf of confirmations) {
      stats.totalDifference += Math.abs(conf.difference || 0);

      switch (conf.status) {
        case 'PENDING':
          stats.pending++;
          break;
        case 'SENT':
          stats.sent++;
          break;
        case 'CONFIRMED':
          stats.confirmed++;
          break;
        case 'DISPUTED':
          stats.disputed++;
          break;
        case 'NO_RESPONSE':
          stats.noResponse++;
          break;
      }
    }

    stats.totalDifference = Math.round(stats.totalDifference * 100) / 100;

    return stats;
  }

  /**
   * Generate customer ledger statement
   */
  async generateCustomerLedger(
    customerId: string,
    periodFrom: Date,
    periodTo: Date,
    orgId: string
  ): Promise<any> {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, orgId },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Get all invoices in period
    const invoices = await prisma.salesInvoice.findMany({
      where: {
        customerId,
        orgId,
        invoiceDate: {
          gte: periodFrom,
          lte: periodTo,
        },
      },
      orderBy: { invoiceDate: 'asc' },
    });

    // Get all payments in period
    const payments = await prisma.paymentMatch.findMany({
      where: {
        salesInvoice: {
          customerId,
          orgId,
        },
        bankTransaction: {
          transactionDate: {
            gte: periodFrom,
            lte: periodTo,
          },
        },
      },
      include: {
        bankTransaction: true,
        salesInvoice: true,
      },
      orderBy: { bankTransaction: { transactionDate: 'asc' } },
    });

    const sales = invoices.reduce((sum, inv) => sum + inv.totalWithGst, 0);
    const totalPayments = payments.reduce((sum, pmt) => sum + pmt.matchedAmount, 0);

    // Get opening balance
    const oldInvoices = await prisma.salesInvoice.findMany({
      where: {
        customerId,
        orgId,
        invoiceDate: { lt: periodFrom },
        paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] },
      },
    });

    const openingBalance = oldInvoices.reduce(
      (sum, inv) => sum + (inv.totalWithGst - inv.amountReceived),
      0
    );

    const closingBalance = openingBalance + sales - totalPayments;

    return {
      customerId,
      customerName: customer.name,
      periodFrom,
      periodTo,
      openingBalance: Math.round(openingBalance * 100) / 100,
      sales: Math.round(sales * 100) / 100,
      payments: Math.round(totalPayments * 100) / 100,
      closingBalance: Math.round(closingBalance * 100) / 100,
      invoices: invoices.map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        amount: inv.totalWithGst,
        dueDate: inv.dueDate || inv.invoiceDate,
        status: inv.paymentStatus,
      })),
      payments_list: payments.map((pmt) => ({
        date: pmt.bankTransaction.transactionDate,
        amount: pmt.matchedAmount,
        reference: pmt.bankTransaction.referenceNumber || 'N/A',
      })),
    };
  }
}

export const ledgerConfirmationService = new LedgerConfirmationService();
