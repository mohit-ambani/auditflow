import { PrismaClient } from '@prisma/client';
import { extractPurchaseInvoice, extractPurchaseOrder, extractBankStatement } from './ai-extractor';
import { matchInvoiceToPO } from './po-invoice-matcher';
import { generateVendorLedger, createConfirmationRequest, sendConfirmationEmail } from './ledger-confirmation';
import { generateReminders, sendReminder } from './payment-reminder';
import { reconcileAllInventory } from './inventory-reconciliation';
import logger from '../lib/logger';

/**
 * Executes tool calls from Claude AI
 */
export class ChatToolExecutor {
  constructor(private prisma: PrismaClient) {}

  async execute(toolName: string, toolInput: any, orgId: string): Promise<any> {
    logger.info({ toolName, toolInput, orgId }, 'Executing tool');

    try {
      switch (toolName) {
        // Data Query Tools
        case 'query_vendors':
          return await this.queryVendors(toolInput, orgId);
        case 'query_customers':
          return await this.queryCustomers(toolInput, orgId);
        case 'query_purchase_invoices':
          return await this.queryPurchaseInvoices(toolInput, orgId);
        case 'query_purchase_orders':
          return await this.queryPurchaseOrders(toolInput, orgId);
        case 'query_bank_transactions':
          return await this.queryBankTransactions(toolInput, orgId);
        case 'query_inventory':
          return await this.queryInventory(toolInput, orgId);

        // Reconciliation Tools
        case 'reconcile_po_invoice':
          return await this.reconcilePOInvoice(toolInput, orgId);
        case 'find_po_matches':
          return await this.findPOMatches(toolInput, orgId);
        case 'reconcile_invoice_payment':
          return await this.reconcileInvoicePayment(toolInput, orgId);
        case 'reconcile_gst':
          return await this.reconcileGST(toolInput, orgId);
        case 'generate_vendor_ledger':
          return await this.generateVendorLedgerTool(toolInput, orgId);
        case 'reconcile_inventory':
          return await this.reconcileInventoryTool(toolInput, orgId);

        // Document Processing Tools
        case 'extract_invoice_from_file':
          return await this.extractInvoiceFromFile(toolInput, orgId);
        case 'extract_po_from_file':
          return await this.extractPOFromFile(toolInput, orgId);
        case 'extract_bank_statement_from_file':
          return await this.extractBankStatementFromFile(toolInput, orgId);

        // Analytics Tools
        case 'calculate_gst_liability':
          return await this.calculateGSTLiability(toolInput, orgId);
        case 'find_duplicate_payments':
          return await this.findDuplicatePayments(toolInput, orgId);
        case 'vendor_aging_analysis':
          return await this.vendorAgingAnalysis(toolInput, orgId);
        case 'customer_aging_analysis':
          return await this.customerAgingAnalysis(toolInput, orgId);
        case 'get_dashboard_summary':
          return await this.getDashboardSummary(toolInput, orgId);

        // Action Tools
        case 'create_vendor':
          return await this.createVendor(toolInput, orgId);
        case 'save_extracted_invoice':
          return await this.saveExtractedInvoice(toolInput, orgId);
        case 'update_invoice_status':
          return await this.updateInvoiceStatus(toolInput, orgId);
        case 'send_payment_reminder':
          return await this.sendPaymentReminderTool(toolInput, orgId);
        case 'send_vendor_ledger_confirmation':
          return await this.sendVendorLedgerConfirmationTool(toolInput, orgId);

        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error) {
      logger.error({ error, toolName, toolInput }, 'Tool execution error');
      throw error;
    }
  }

  // ============================================================
  // DATA QUERY TOOL IMPLEMENTATIONS
  // ============================================================

  private async queryVendors(input: any, orgId: string) {
    const where: any = { orgId };

    if (input.search) {
      where.OR = [
        { name: { contains: input.search, mode: 'insensitive' } },
        { gstin: { contains: input.search, mode: 'insensitive' } }
      ];
    }

    if (input.is_active !== undefined) {
      where.isActive = input.is_active;
    }

    const vendors = await this.prisma.vendor.findMany({
      where,
      take: input.limit || 50,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        gstin: true,
        pan: true,
        email: true,
        phone: true,
        isActive: true,
        _count: {
          select: {
            purchaseInvoices: true,
            purchaseOrders: true
          }
        }
      }
    });

    return {
      total: vendors.length,
      vendors: vendors.map(v => ({
        id: v.id,
        name: v.name,
        gstin: v.gstin,
        pan: v.pan,
        email: v.email,
        phone: v.phone,
        is_active: v.isActive,
        total_invoices: v._count.purchaseInvoices,
        total_pos: v._count.purchaseOrders
      }))
    };
  }

  private async queryCustomers(input: any, orgId: string) {
    const where: any = { orgId };

    if (input.search) {
      where.OR = [
        { name: { contains: input.search, mode: 'insensitive' } },
        { gstin: { contains: input.search, mode: 'insensitive' } }
      ];
    }

    if (input.is_active !== undefined) {
      where.isActive = input.is_active;
    }

    const customers = await this.prisma.customer.findMany({
      where,
      take: input.limit || 50,
      orderBy: { name: 'asc' }
    });

    return {
      total: customers.length,
      customers: customers.map(c => ({
        id: c.id,
        name: c.name,
        gstin: c.gstin,
        email: c.email,
        phone: c.phone,
        is_active: c.isActive
      }))
    };
  }

  private async queryPurchaseInvoices(input: any, orgId: string) {
    const where: any = { orgId };

    if (input.vendor_id) {
      where.vendorId = input.vendor_id;
    }

    if (input.vendor_name) {
      where.vendor = {
        name: { contains: input.vendor_name, mode: 'insensitive' }
      };
    }

    if (input.invoice_number) {
      where.invoiceNumber = { contains: input.invoice_number, mode: 'insensitive' };
    }

    if (input.status) {
      where.status = input.status;
    }

    if (input.payment_status) {
      where.paymentStatus = input.payment_status;
    }

    if (input.from_date || input.to_date) {
      where.invoiceDate = {};
      if (input.from_date) where.invoiceDate.gte = new Date(input.from_date);
      if (input.to_date) where.invoiceDate.lte = new Date(input.to_date);
    }

    if (input.min_amount || input.max_amount) {
      where.totalWithGst = {};
      if (input.min_amount) where.totalWithGst.gte = input.min_amount;
      if (input.max_amount) where.totalWithGst.lte = input.max_amount;
    }

    const invoices = await this.prisma.purchaseInvoice.findMany({
      where,
      include: {
        vendor: { select: { name: true, gstin: true } },
        lineItems: true
      },
      take: input.limit || 50,
      orderBy: { invoiceDate: 'desc' }
    });

    return {
      total: invoices.length,
      total_amount: invoices.reduce((sum, inv) => sum + Number(inv.totalWithGst), 0),
      unpaid_amount: invoices.reduce((sum, inv) => sum + (Number(inv.totalWithGst) - Number(inv.amountPaid)), 0),
      invoices: invoices.map(inv => ({
        id: inv.id,
        invoice_number: inv.invoiceNumber,
        vendor_name: inv.vendor.name,
        vendor_gstin: inv.vendor.gstin,
        invoice_date: inv.invoiceDate,
        due_date: inv.dueDate,
        total_amount: Number(inv.totalWithGst),
        amount_paid: Number(inv.amountPaid),
        balance: Number(inv.totalWithGst) - Number(inv.amountPaid),
        status: inv.status,
        payment_status: inv.paymentStatus,
        line_items_count: inv.lineItems.length,
        po_reference: inv.poReference,
        irn: inv.irn
      }))
    };
  }

  private async queryPurchaseOrders(input: any, orgId: string) {
    const where: any = { orgId };

    if (input.vendor_id) {
      where.vendorId = input.vendor_id;
    }

    if (input.po_number) {
      where.poNumber = { contains: input.po_number, mode: 'insensitive' };
    }

    if (input.status) {
      where.status = input.status;
    }

    if (input.from_date || input.to_date) {
      where.poDate = {};
      if (input.from_date) where.poDate.gte = new Date(input.from_date);
      if (input.to_date) where.poDate.lte = new Date(input.to_date);
    }

    const pos = await this.prisma.purchaseOrder.findMany({
      where,
      include: {
        vendor: { select: { name: true } },
        lineItems: true
      },
      take: input.limit || 50,
      orderBy: { poDate: 'desc' }
    });

    return {
      total: pos.length,
      purchase_orders: pos.map(po => ({
        id: po.id,
        po_number: po.poNumber,
        vendor_name: po.vendor.name,
        po_date: po.poDate,
        delivery_date: po.deliveryDate,
        total_amount: Number(po.totalWithGst),
        status: po.status,
        line_items_count: po.lineItems.length
      }))
    };
  }

  private async queryBankTransactions(input: any, orgId: string) {
    const where: any = { orgId };

    where.transactionDate = {
      gte: new Date(input.from_date),
      lte: new Date(input.to_date)
    };

    if (input.transaction_type) {
      if (input.transaction_type === 'DEBIT') {
        where.debitAmount = { gt: 0 };
      } else if (input.transaction_type === 'CREDIT') {
        where.creditAmount = { gt: 0 };
      }
    }

    if (input.search) {
      where.description = { contains: input.search, mode: 'insensitive' };
    }

    const transactions = await this.prisma.bankTransaction.findMany({
      where,
      orderBy: { transactionDate: 'desc' },
      take: input.limit || 100
    });

    return {
      total: transactions.length,
      total_debit: transactions.reduce((sum, t) => sum + Number(t.debitAmount || 0), 0),
      total_credit: transactions.reduce((sum, t) => sum + Number(t.creditAmount || 0), 0),
      transactions: transactions.map(t => ({
        id: t.id,
        date: t.transactionDate,
        description: t.description,
        debit: Number(t.debitAmount || 0),
        credit: Number(t.creditAmount || 0),
        balance: Number(t.balanceAmount || 0),
        reference: t.referenceNumber
      }))
    };
  }

  private async queryInventory(input: any, orgId: string) {
    const where: any = { orgId };

    if (input.sku_id) {
      where.skuId = input.sku_id;
    }

    if (input.snapshot_date) {
      where.snapshotDate = new Date(input.snapshot_date);
    }

    if (input.has_discrepancy) {
      where.discrepancyQty = { not: 0 };
    }

    const snapshots = await this.prisma.inventorySnapshot.findMany({
      where,
      include: {
        sku: { select: { skuCode: true, name: true } }
      },
      orderBy: { snapshotDate: 'desc' },
      take: input.limit || 50
    });

    return {
      total: snapshots.length,
      snapshots: snapshots.map(s => ({
        id: s.id,
        sku_code: s.sku.skuCode,
        sku_name: s.sku.name,
        snapshot_date: s.snapshotDate,
        opening_qty: Number(s.openingQty),
        closing_qty: Number(s.closingQty),
        expected_closing: Number(s.expectedClosingQty),
        discrepancy: Number(s.discrepancyQty),
        has_discrepancy: Number(s.discrepancyQty) !== 0
      }))
    };
  }

  // ============================================================
  // RECONCILIATION TOOL IMPLEMENTATIONS
  // ============================================================

  private async reconcilePOInvoice(input: any, orgId: string) {
    const matchResult = await matchInvoiceToPO(input.invoice_id, input.po_id, orgId);

    return {
      match_score: matchResult.overallMatchScore,
      match_type: matchResult.matchType,
      auto_approve: matchResult.autoApprove,
      needs_review: matchResult.needsReview,
      discrepancies: matchResult.discrepancies,
      line_item_matches: matchResult.lineMatches?.map(lm => ({
        invoice_line: lm.invoiceLine.description,
        po_line: lm.poLine?.description || 'No match',
        match_score: lm.matchScore,
        qty_diff: lm.qtyDiff,
        price_diff: lm.priceDiff,
        amount_diff: lm.amountDiff
      }))
    };
  }

  private async findPOMatches(input: any, orgId: string) {
    const invoice = await this.prisma.purchaseInvoice.findFirst({
      where: { id: input.invoice_id, orgId },
      include: { vendor: true }
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Find POs from same vendor
    const potentialPOs = await this.prisma.purchaseOrder.findMany({
      where: {
        orgId,
        vendorId: invoice.vendorId,
        status: { in: ['EXTRACTED', 'VERIFIED'] }
      },
      take: input.top_n || 5,
      orderBy: { poDate: 'desc' }
    });

    const matches = [];
    for (const po of potentialPOs) {
      const matchResult = await matchInvoiceToPO(invoice.id, po.id, orgId);
      matches.push({
        po_id: po.id,
        po_number: po.poNumber,
        po_date: po.poDate,
        match_score: matchResult.overallMatchScore,
        match_type: matchResult.matchType,
        auto_approve: matchResult.autoApprove
      });
    }

    return {
      invoice_number: invoice.invoiceNumber,
      potential_matches: matches.sort((a, b) => b.match_score - a.match_score)
    };
  }

  private async reconcileInvoicePayment(input: any, orgId: string) {
    const invoice = await this.prisma.purchaseInvoice.findFirst({
      where: { id: input.invoice_id, orgId },
      include: { vendor: true }
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const tolerance = input.tolerance || 1.0;
    const invoiceAmount = Number(invoice.totalWithGst);

    // Find bank transactions around invoice amount
    const startDate = new Date(invoice.invoiceDate);
    startDate.setDate(startDate.getDate() - 30); // Look 30 days before
    const endDate = new Date();

    const transactions = await this.prisma.bankTransaction.findMany({
      where: {
        orgId,
        transactionDate: { gte: startDate, lte: endDate },
        debitAmount: {
          gte: invoiceAmount - tolerance,
          lte: invoiceAmount + tolerance
        }
      },
      orderBy: { transactionDate: 'desc' }
    });

    return {
      invoice_number: invoice.invoiceNumber,
      invoice_amount: invoiceAmount,
      vendor_name: invoice.vendor.name,
      matching_payments: transactions.map(t => ({
        transaction_id: t.id,
        date: t.transactionDate,
        amount: Number(t.debitAmount),
        description: t.description,
        difference: Math.abs(Number(t.debitAmount) - invoiceAmount),
        reference: t.referenceNumber
      }))
    };
  }

  private async reconcileGST(input: any, orgId: string) {
    const { month, year } = input;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const purchaseInvoices = await this.prisma.purchaseInvoice.findMany({
      where: {
        orgId,
        invoiceDate: { gte: startDate, lte: endDate }
      }
    });

    const salesInvoices = await this.prisma.salesInvoice.findMany({
      where: {
        orgId,
        invoiceDate: { gte: startDate, lte: endDate }
      }
    });

    const inputGST = {
      cgst: purchaseInvoices.reduce((sum, inv) => sum + Number(inv.cgst), 0),
      sgst: purchaseInvoices.reduce((sum, inv) => sum + Number(inv.sgst), 0),
      igst: purchaseInvoices.reduce((sum, inv) => sum + Number(inv.igst), 0)
    };

    const outputGST = {
      cgst: salesInvoices.reduce((sum, inv) => sum + Number(inv.cgst), 0),
      sgst: salesInvoices.reduce((sum, inv) => sum + Number(inv.sgst), 0),
      igst: salesInvoices.reduce((sum, inv) => sum + Number(inv.igst), 0)
    };

    const totalInput = inputGST.cgst + inputGST.sgst + inputGST.igst;
    const totalOutput = outputGST.cgst + outputGST.sgst + outputGST.igst;

    return {
      period: `${month}/${year}`,
      input_tax_credit: {
        cgst: inputGST.cgst,
        sgst: inputGST.sgst,
        igst: inputGST.igst,
        total: totalInput
      },
      output_tax: {
        cgst: outputGST.cgst,
        sgst: outputGST.sgst,
        igst: outputGST.igst,
        total: totalOutput
      },
      net_liability: totalOutput - totalInput,
      purchase_invoices_count: purchaseInvoices.length,
      sales_invoices_count: salesInvoices.length
    };
  }

  private async generateVendorLedgerTool(input: any, orgId: string) {
    const ledgerData = await generateVendorLedger(
      input.vendor_id,
      new Date(input.from_date),
      new Date(input.to_date),
      orgId
    );

    return ledgerData;
  }

  private async reconcileInventoryTool(input: any, orgId: string) {
    const snapshotDate = input.snapshot_date ? new Date(input.snapshot_date) : new Date();
    const result = await reconcileAllInventory(snapshotDate, orgId);

    return {
      snapshot_date: snapshotDate,
      total_skus: result.total,
      discrepancies_found: result.discrepancies,
      match_rate: ((result.total - result.discrepancies) / result.total * 100).toFixed(2) + '%'
    };
  }

  // ============================================================
  // DOCUMENT PROCESSING TOOL IMPLEMENTATIONS
  // ============================================================

  private async extractInvoiceFromFile(input: any, orgId: string) {
    const file = await this.prisma.uploadedFile.findFirst({
      where: { id: input.file_id, orgId }
    });

    if (!file || !file.extractedText) {
      throw new Error('File not found or text not extracted');
    }

    const extracted = await extractPurchaseInvoice(file.extractedText);

    return {
      file_id: file.id,
      file_name: file.originalName,
      extracted_data: extracted,
      confidence: extracted.arithmetic_verified ? 0.95 : 0.75,
      needs_review: !extracted.arithmetic_verified,
      arithmetic_verified: extracted.arithmetic_verified
    };
  }

  private async extractPOFromFile(input: any, orgId: string) {
    const file = await this.prisma.uploadedFile.findFirst({
      where: { id: input.file_id, orgId }
    });

    if (!file || !file.extractedText) {
      throw new Error('File not found or text not extracted');
    }

    const extracted = await extractPurchaseOrder(file.extractedText);

    return {
      file_id: file.id,
      file_name: file.originalName,
      extracted_data: extracted
    };
  }

  private async extractBankStatementFromFile(input: any, orgId: string) {
    const file = await this.prisma.uploadedFile.findFirst({
      where: { id: input.file_id, orgId }
    });

    if (!file || !file.extractedText) {
      throw new Error('File not found or text not extracted');
    }

    const extracted = await extractBankStatement(file.extractedText);

    return {
      file_id: file.id,
      file_name: file.originalName,
      extracted_data: extracted,
      transactions_count: extracted.transactions?.length || 0
    };
  }

  // ============================================================
  // ANALYTICS TOOL IMPLEMENTATIONS
  // ============================================================

  private async calculateGSTLiability(input: any, orgId: string) {
    return await this.reconcileGST(input, orgId);
  }

  private async findDuplicatePayments(input: any, orgId: string) {
    const transactions = await this.prisma.bankTransaction.findMany({
      where: {
        orgId,
        transactionDate: {
          gte: new Date(input.from_date),
          lte: new Date(input.to_date)
        },
        debitAmount: { gt: 0 }
      },
      orderBy: { transactionDate: 'asc' }
    });

    const duplicates = [];
    const toleranceDays = input.tolerance_days || 7;

    for (let i = 0; i < transactions.length; i++) {
      for (let j = i + 1; j < transactions.length; j++) {
        const t1 = transactions[i];
        const t2 = transactions[j];

        const daysDiff = Math.abs(
          (t2.transactionDate.getTime() - t1.transactionDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff <= toleranceDays && t1.debitAmount === t2.debitAmount) {
          duplicates.push({
            transaction_1: {
              id: t1.id,
              date: t1.transactionDate,
              amount: Number(t1.debitAmount),
              description: t1.description
            },
            transaction_2: {
              id: t2.id,
              date: t2.transactionDate,
              amount: Number(t2.debitAmount),
              description: t2.description
            },
            days_apart: Math.round(daysDiff)
          });
        }
      }
    }

    return {
      total_duplicates: duplicates.length,
      duplicates
    };
  }

  private async vendorAgingAnalysis(input: any, orgId: string) {
    const asOfDate = input.as_of_date ? new Date(input.as_of_date) : new Date();
    const where: any = {
      orgId,
      paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] }
    };

    if (input.vendor_id) {
      where.vendorId = input.vendor_id;
    }

    const invoices = await this.prisma.purchaseInvoice.findMany({
      where,
      include: { vendor: { select: { name: true } } }
    });

    const aging = {
      '0-7': { count: 0, amount: 0 },
      '8-30': { count: 0, amount: 0 },
      '31-60': { count: 0, amount: 0 },
      '60+': { count: 0, amount: 0 }
    };

    const details = invoices.map(inv => {
      const dueDate = inv.dueDate || inv.invoiceDate;
      const daysPastDue = Math.floor(
        (asOfDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const outstanding = Number(inv.totalWithGst) - Number(inv.amountPaid);

      let bucket = '0-7';
      if (daysPastDue > 60) bucket = '60+';
      else if (daysPastDue > 30) bucket = '31-60';
      else if (daysPastDue > 7) bucket = '8-30';

      aging[bucket].count++;
      aging[bucket].amount += outstanding;

      return {
        invoice_number: inv.invoiceNumber,
        vendor_name: inv.vendor.name,
        invoice_date: inv.invoiceDate,
        due_date: dueDate,
        days_past_due: daysPastDue,
        outstanding_amount: outstanding,
        aging_bucket: bucket
      };
    });

    return {
      as_of_date: asOfDate,
      total_outstanding: details.reduce((sum, d) => sum + d.outstanding_amount, 0),
      aging_summary: aging,
      invoices: details
    };
  }

  private async customerAgingAnalysis(input: any, orgId: string) {
    const asOfDate = input.as_of_date ? new Date(input.as_of_date) : new Date();
    const where: any = {
      orgId,
      paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] }
    };

    if (input.customer_id) {
      where.customerId = input.customer_id;
    }

    const invoices = await this.prisma.salesInvoice.findMany({
      where,
      include: { customer: { select: { name: true } } }
    });

    const aging = {
      '0-7': { count: 0, amount: 0 },
      '8-30': { count: 0, amount: 0 },
      '31-60': { count: 0, amount: 0 },
      '60+': { count: 0, amount: 0 }
    };

    const details = invoices.map(inv => {
      const dueDate = inv.dueDate || inv.invoiceDate;
      const daysPastDue = Math.floor(
        (asOfDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const outstanding = Number(inv.totalWithGst) - Number(inv.amountPaid);

      let bucket = '0-7';
      if (daysPastDue > 60) bucket = '60+';
      else if (daysPastDue > 30) bucket = '31-60';
      else if (daysPastDue > 7) bucket = '8-30';

      aging[bucket].count++;
      aging[bucket].amount += outstanding;

      return {
        invoice_number: inv.invoiceNumber,
        customer_name: inv.customer.name,
        invoice_date: inv.invoiceDate,
        due_date: dueDate,
        days_past_due: daysPastDue,
        outstanding_amount: outstanding,
        aging_bucket: bucket
      };
    });

    return {
      as_of_date: asOfDate,
      total_outstanding: details.reduce((sum, d) => sum + d.outstanding_amount, 0),
      aging_summary: aging,
      invoices: details
    };
  }

  private async getDashboardSummary(input: any, orgId: string) {
    const period = input.period || 'month';
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const [
      purchaseInvoices,
      salesInvoices,
      vendors,
      customers,
      unpaidPurchases,
      unpaidSales
    ] = await Promise.all([
      this.prisma.purchaseInvoice.count({
        where: { orgId, invoiceDate: { gte: startDate } }
      }),
      this.prisma.salesInvoice.count({
        where: { orgId, invoiceDate: { gte: startDate } }
      }),
      this.prisma.vendor.count({ where: { orgId, isActive: true } }),
      this.prisma.customer.count({ where: { orgId, isActive: true } }),
      this.prisma.purchaseInvoice.aggregate({
        where: { orgId, paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] } },
        _sum: { totalWithGst: true },
        _count: true
      }),
      this.prisma.salesInvoice.aggregate({
        where: { orgId, paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] } },
        _sum: { totalWithGst: true },
        _count: true
      })
    ]);

    return {
      period,
      start_date: startDate,
      end_date: now,
      purchase_invoices: purchaseInvoices,
      sales_invoices: salesInvoices,
      active_vendors: vendors,
      active_customers: customers,
      accounts_payable: {
        count: unpaidPurchases._count,
        amount: Number(unpaidPurchases._sum.totalWithGst || 0)
      },
      accounts_receivable: {
        count: unpaidSales._count,
        amount: Number(unpaidSales._sum.totalWithGst || 0)
      }
    };
  }

  // ============================================================
  // ACTION TOOL IMPLEMENTATIONS
  // ============================================================

  private async createVendor(input: any, orgId: string) {
    const vendor = await this.prisma.vendor.create({
      data: {
        orgId,
        name: input.name,
        gstin: input.gstin,
        pan: input.pan,
        email: input.email,
        phone: input.phone,
        address: input.address,
        isActive: true
      }
    });

    return {
      vendor_id: vendor.id,
      name: vendor.name,
      message: 'Vendor created successfully'
    };
  }

  private async saveExtractedInvoice(input: any, orgId: string) {
    const extracted = input.extracted_data;

    // Find or create vendor
    let vendor = await this.prisma.vendor.findFirst({
      where: {
        orgId,
        gstin: extracted.vendor_gstin || undefined
      }
    });

    if (!vendor && extracted.vendor_name) {
      vendor = await this.prisma.vendor.create({
        data: {
          orgId,
          name: extracted.vendor_name,
          gstin: extracted.vendor_gstin,
          isActive: true
        }
      });
    }

    if (!vendor) {
      throw new Error('Could not identify vendor');
    }

    // Create invoice
    const invoice = await this.prisma.purchaseInvoice.create({
      data: {
        orgId,
        vendorId: vendor.id,
        invoiceNumber: extracted.invoice_number,
        invoiceDate: new Date(extracted.invoice_date),
        dueDate: extracted.due_date ? new Date(extracted.due_date) : null,
        totalAmount: extracted.taxable_total || extracted.subtotal,
        cgst: extracted.cgst_total || 0,
        sgst: extracted.sgst_total || 0,
        igst: extracted.igst_total || 0,
        tcs: extracted.tcs || 0,
        roundOff: extracted.round_off || 0,
        totalWithGst: extracted.grand_total,
        vendorGstin: extracted.vendor_gstin,
        irn: extracted.irn,
        status: extracted.arithmetic_verified ? 'EXTRACTED' : 'PROCESSING',
        paymentStatus: 'UNPAID',
        extractedData: extracted,
        aiConfidence: extracted.arithmetic_verified ? 0.95 : 0.75,
        manualReview: !extracted.arithmetic_verified,
        amountPaid: 0
      }
    });

    // Create line items
    if (extracted.line_items && Array.isArray(extracted.line_items)) {
      for (const item of extracted.line_items) {
        await this.prisma.purchaseInvoiceLineItem.create({
          data: {
            invoiceId: invoice.id,
            lineNumber: item.line_number,
            description: item.description,
            hsnCode: item.hsn_code,
            quantity: item.quantity,
            unit: item.unit || 'PCS',
            unitPrice: item.unit_price,
            discountPercent: item.discount_percent || 0,
            discountAmount: item.discount_amount || 0,
            taxableAmount: item.taxable_amount,
            gstRate: item.gst_rate,
            cgst: item.cgst || 0,
            sgst: item.sgst || 0,
            igst: item.igst || 0,
            totalAmount: item.total
          }
        });
      }
    }

    return {
      invoice_id: invoice.id,
      invoice_number: invoice.invoiceNumber,
      vendor_name: vendor.name,
      total_amount: Number(invoice.totalWithGst),
      line_items_created: extracted.line_items?.length || 0,
      message: 'Invoice saved successfully'
    };
  }

  private async updateInvoiceStatus(input: any, orgId: string) {
    const invoice = await this.prisma.purchaseInvoice.update({
      where: { id: input.invoice_id },
      data: {
        status: input.status
      }
    });

    return {
      invoice_id: invoice.id,
      invoice_number: invoice.invoiceNumber,
      new_status: invoice.status,
      message: 'Invoice status updated successfully'
    };
  }

  private async sendPaymentReminderTool(input: any, orgId: string) {
    const reminders = await generateReminders(orgId);
    const reminder = reminders.reminders.find(r => r.invoiceId === input.invoice_id);

    if (reminder) {
      await sendReminder(reminder.id, orgId);
      return {
        message: 'Payment reminder sent successfully',
        invoice_id: input.invoice_id
      };
    }

    return {
      message: 'No reminder needed for this invoice',
      invoice_id: input.invoice_id
    };
  }

  private async sendVendorLedgerConfirmationTool(input: any, orgId: string) {
    const ledgerData = await generateVendorLedger(
      input.vendor_id,
      new Date(input.from_date),
      new Date(input.to_date),
      orgId
    );

    const confirmation = await createConfirmationRequest(input.vendor_id, ledgerData, orgId);
    await sendConfirmationEmail(confirmation.id, orgId);

    return {
      message: 'Ledger confirmation sent successfully',
      vendor_id: input.vendor_id,
      confirmation_id: confirmation.id
    };
  }
}
