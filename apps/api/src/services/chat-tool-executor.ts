import { PrismaClient } from '@prisma/client';
import { extractPurchaseInvoice, extractPurchaseOrder, extractBankStatement } from './ai-extractor';
import { matchInvoiceToPO } from './po-invoice-matcher';
import { generateVendorLedger, createConfirmationRequest, sendConfirmationEmail } from './ledger-confirmation';
import { generateReminders, sendReminder } from './payment-reminder';
import { reconcileAllInventory } from './inventory-reconciliation';
import { classifyDocument } from './document-classifier';
import { parsePDF } from './parsers/pdf-parser';
import { parseExcel } from './parsers/excel-parser';
import { parseImage } from './parsers/image-parser';
import { uploadFile } from './file-storage-local';
import { matchPaymentToInvoices } from './payment-matcher';
import { matchGSTEntryToInvoice } from './gst-reconciliation';
import logger from '../lib/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

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

        // File Processing & Auto-Classification Tools
        case 'classify_and_process_file':
          return await this.classifyAndProcessFile(toolInput, orgId);
        case 'get_file_processing_status':
          return await this.getFileProcessingStatus(toolInput, orgId);
        case 'process_file_batch':
          return await this.processFileBatch(toolInput, orgId);
        case 'save_extracted_data':
          return await this.saveExtractedData(toolInput, orgId);
        case 'auto_reconcile_after_save':
          return await this.autoReconcileAfterSave(toolInput, orgId);
        case 'present_data_table':
          return await this.presentDataTable(toolInput, orgId);

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
        case 'show_dashboard_widget':
          return await this.showDashboardWidget(toolInput, orgId);

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

  private async showDashboardWidget(input: any, orgId: string) {
    const { widget_type, data, period } = input;

    // This tool simply returns the widget configuration for the frontend to render
    // The actual widget rendering happens in the chat UI
    return {
      widget_type,
      data,
      period: period || 'month',
      render_as: 'dashboard_widget'
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

  // ============================================================
  // FILE PROCESSING & AUTO-CLASSIFICATION METHODS
  // ============================================================

  private async classifyAndProcessFile(input: any, orgId: string) {
    const fileId = input.file_id;

    // Get the uploaded file record
    const uploadedFile = await this.prisma.uploadedFile.findFirst({
      where: { id: fileId, orgId }
    });

    if (!uploadedFile) {
      throw new Error('File not found');
    }

    // Read file from storage
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadDir, uploadedFile.storagePath);
    const fileBuffer = await fs.readFile(filePath);

    // Parse file based on MIME type
    let extractedText = '';
    let metadata: any = {};

    if (uploadedFile.mimeType === 'application/pdf') {
      const pdfResult = await parsePDF(fileBuffer);
      extractedText = pdfResult.rawText;
      metadata = pdfResult.metadata;
    } else if (uploadedFile.mimeType.includes('excel') || uploadedFile.mimeType === 'text/csv' ||
               uploadedFile.mimeType.includes('spreadsheet')) {
      const excelResult = await parseExcel(fileBuffer, uploadedFile.mimeType);
      extractedText = excelResult.rawText;
      metadata = { sheets: excelResult.sheets.length };
    } else if (uploadedFile.mimeType.startsWith('image/')) {
      const imageResult = await parseImage(fileBuffer);
      extractedText = imageResult.rawText;
      metadata = imageResult.metadata;
    }

    // Classify document
    const classification = await classifyDocument(extractedText);

    // Extract data based on document type
    let extractedData: any = null;
    let confidence = classification.confidence;
    let arithmeticVerified = false;

    if (classification.documentType === 'PURCHASE_INVOICE' || classification.documentType === 'SALES_INVOICE') {
      extractedData = await extractPurchaseInvoice(extractedText);
      arithmeticVerified = extractedData.arithmetic_verified || false;
      // Adjust confidence based on extraction quality
      if (extractedData.invoice_number && extractedData.vendor_name && extractedData.grand_total) {
        confidence = Math.max(confidence, 0.85);
      }
    } else if (classification.documentType === 'PURCHASE_ORDER') {
      extractedData = await extractPurchaseOrder(extractedText);
      if (extractedData.po_number && extractedData.vendor_name) {
        confidence = Math.max(confidence, 0.85);
      }
    } else if (classification.documentType === 'BANK_STATEMENT') {
      extractedData = await extractBankStatement(extractedText);
      if (extractedData.bank_name && extractedData.transactions && extractedData.transactions.length > 0) {
        confidence = Math.max(confidence, 0.90);
      }
    }

    // Update uploaded file record
    await this.prisma.uploadedFile.update({
      where: { id: fileId },
      data: {
        extractedText,
        documentType: classification.documentType,
        aiExtractionResult: extractedData,
        processingStatus: 'COMPLETED'
      }
    });

    const needsReview = confidence < 0.85 || !arithmeticVerified;

    return {
      file_id: fileId,
      classification: {
        document_type: classification.documentType,
        confidence,
        reasoning: classification.reasoning
      },
      extracted_data: extractedData,
      arithmetic_verified: arithmeticVerified,
      needs_manual_review: needsReview,
      metadata,
      message: needsReview
        ? 'Document classified and extracted. Please review the data before saving.'
        : 'Document classified and extracted successfully. Data looks accurate.'
    };
  }

  private async getFileProcessingStatus(input: any, orgId: string) {
    const uploadedFile = await this.prisma.uploadedFile.findFirst({
      where: {
        id: input.file_id,
        orgId
      }
    });

    if (!uploadedFile) {
      throw new Error('File not found');
    }

    return {
      file_id: uploadedFile.id,
      file_name: uploadedFile.originalName,
      status: uploadedFile.processingStatus,
      document_type: uploadedFile.documentType,
      has_extracted_data: !!uploadedFile.aiExtractionResult,
      uploaded_at: uploadedFile.createdAt
    };
  }

  private async processFileBatch(input: any, orgId: string) {
    const { file_ids } = input;

    if (!Array.isArray(file_ids) || file_ids.length === 0) {
      throw new Error('file_ids must be a non-empty array');
    }

    // Import batch processor
    const { processBatchFilesSync } = require('./batch-processor');

    // Process all files
    const results = await processBatchFilesSync(file_ids, this.prisma, orgId);

    // Summary statistics
    const successCount = results.filter((r: any) => r.success).length;
    const failureCount = results.filter((r: any) => !r.success).length;

    return {
      total: file_ids.length,
      success: successCount,
      failed: failureCount,
      results: results.map((r: any) => ({
        file_id: r.fileId,
        file_name: r.fileName,
        success: r.success,
        document_type: r.documentType,
        confidence: r.confidence,
        has_extracted_data: !!r.extractedData,
        arithmetic_verified: r.extractedData?.arithmetic_verified,
        error: r.error
      }))
    };
  }

  private async saveExtractedData(input: any, orgId: string) {
    const { file_id, document_type, extracted_data, corrections } = input;

    // Merge corrections into extracted data
    const finalData = corrections ? { ...extracted_data, ...corrections } : extracted_data;

    // Save based on document type
    let savedEntity: any = null;
    let entityType = document_type;

    if (document_type === 'PURCHASE_INVOICE') {
      savedEntity = await this.savePurchaseInvoice(finalData, orgId);
    } else if (document_type === 'PURCHASE_ORDER') {
      savedEntity = await this.savePurchaseOrder(finalData, orgId);
    } else if (document_type === 'SALES_INVOICE') {
      savedEntity = await this.saveSalesInvoice(finalData, orgId);
    } else if (document_type === 'BANK_STATEMENT') {
      savedEntity = await this.saveBankStatement(finalData, orgId);
    } else if (document_type === 'GST_RETURN') {
      savedEntity = await this.saveGSTReturn(finalData, orgId);
    } else {
      throw new Error(`Unsupported document type: ${document_type}`);
    }

    // Update uploaded file to link to saved entity
    await this.prisma.uploadedFile.update({
      where: { id: file_id },
      data: {
        processingStatus: 'COMPLETED'
      }
    });

    return {
      success: true,
      document_type: entityType,
      document_id: savedEntity.id,
      document_number: savedEntity.number,
      message: `${entityType} saved successfully`
    };
  }

  private async savePurchaseInvoice(data: any, orgId: string) {
    // Find or create vendor
    let vendor = await this.prisma.vendor.findFirst({
      where: { orgId, gstin: data.vendor_gstin || undefined }
    });

    if (!vendor && data.vendor_name) {
      vendor = await this.prisma.vendor.create({
        data: {
          orgId,
          name: data.vendor_name,
          gstin: data.vendor_gstin,
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
        invoiceNumber: data.invoice_number,
        invoiceDate: new Date(data.invoice_date),
        dueDate: data.due_date ? new Date(data.due_date) : null,
        totalAmount: data.taxable_total || data.subtotal,
        cgst: data.cgst_total || 0,
        sgst: data.sgst_total || 0,
        igst: data.igst_total || 0,
        tcs: data.tcs || 0,
        roundOff: data.round_off || 0,
        totalWithGst: data.grand_total,
        vendorGstin: data.vendor_gstin,
        irn: data.irn,
        status: 'EXTRACTED',
        paymentStatus: 'UNPAID',
        extractedData: data,
        amountPaid: 0
      }
    });

    // Create line items
    if (data.line_items && Array.isArray(data.line_items)) {
      for (const item of data.line_items) {
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

    return { id: invoice.id, number: invoice.invoiceNumber };
  }

  private async savePurchaseOrder(data: any, orgId: string) {
    // Find or create vendor
    let vendor = await this.prisma.vendor.findFirst({
      where: { orgId, gstin: data.vendor_gstin || undefined }
    });

    if (!vendor && data.vendor_name) {
      vendor = await this.prisma.vendor.create({
        data: {
          orgId,
          name: data.vendor_name,
          gstin: data.vendor_gstin,
          isActive: true
        }
      });
    }

    const po = await this.prisma.purchaseOrder.create({
      data: {
        orgId,
        vendorId: vendor!.id,
        poNumber: data.po_number,
        poDate: new Date(data.po_date),
        expectedDeliveryDate: data.expected_delivery_date ? new Date(data.expected_delivery_date) : null,
        totalAmount: data.grand_total,
        status: 'OPEN',
        extractedData: data
      }
    });

    // Create line items
    if (data.line_items && Array.isArray(data.line_items)) {
      for (const item of data.line_items) {
        await this.prisma.pOLineItem.create({
          data: {
            poId: po.id,
            lineNumber: item.line_number,
            description: item.description,
            hsnCode: item.hsn_code,
            quantity: item.quantity,
            unit: item.unit || 'PCS',
            unitPrice: item.unit_price,
            totalAmount: item.total
          }
        });
      }
    }

    return { id: po.id, number: po.poNumber };
  }

  private async saveSalesInvoice(data: any, orgId: string) {
    // Find or create customer
    let customer = await this.prisma.customer.findFirst({
      where: { orgId, gstin: data.customer_gstin || undefined }
    });

    if (!customer && data.customer_name) {
      customer = await this.prisma.customer.create({
        data: {
          orgId,
          name: data.customer_name,
          gstin: data.customer_gstin,
          isActive: true
        }
      });
    }

    const invoice = await this.prisma.salesInvoice.create({
      data: {
        orgId,
        customerId: customer!.id,
        invoiceNumber: data.invoice_number,
        invoiceDate: new Date(data.invoice_date),
        totalAmount: data.taxable_total || data.subtotal,
        cgst: data.cgst_total || 0,
        sgst: data.sgst_total || 0,
        igst: data.igst_total || 0,
        totalWithGst: data.grand_total,
        status: 'EXTRACTED',
        paymentStatus: 'UNPAID',
        extractedData: data,
        amountReceived: 0
      }
    });

    return { id: invoice.id, number: invoice.invoiceNumber };
  }

  private async saveBankStatement(data: any, orgId: string) {
    // Create bank statement record
    const statement = await this.prisma.bankStatement.create({
      data: {
        orgId,
        bankName: data.bank_name,
        accountNumber: data.account_number,
        statementDate: new Date(),
        fromDate: new Date(data.statement_period.split(' to ')[0]),
        toDate: new Date(data.statement_period.split(' to ')[1]),
        openingBalance: data.opening_balance,
        closingBalance: data.closing_balance,
        transactionCount: data.transactions?.length || 0
      }
    });

    // Create transactions
    if (data.transactions && Array.isArray(data.transactions)) {
      for (const txn of data.transactions) {
        await this.prisma.bankTransaction.create({
          data: {
            orgId,
            statementId: statement.id,
            transactionDate: new Date(txn.date),
            description: txn.description,
            referenceNumber: txn.reference_number,
            debit: txn.debit || null,
            credit: txn.credit || null,
            balance: txn.balance,
            matchStatus: 'UNMATCHED'
          }
        });
      }
    }

    return { id: statement.id, number: `STMT-${statement.bankName}-${statement.fromDate.toISOString().split('T')[0]}` };
  }

  private async saveGSTReturn(data: any, orgId: string) {
    const gstReturn = await this.prisma.gSTReturn.create({
      data: {
        orgId,
        returnType: data.return_type || 'GSTR2A',
        period: `${data.month}-${data.year}`,
        filingDate: new Date(),
        status: 'FILED',
        entryCount: data.entries?.length || 0
      }
    });

    // Create GST entries
    if (data.entries && Array.isArray(data.entries)) {
      for (const entry of data.entries) {
        await this.prisma.gSTReturnEntry.create({
          data: {
            returnId: gstReturn.id,
            counterpartyGstin: entry.gstin,
            counterpartyName: entry.supplier_name,
            invoiceNumber: entry.invoice_number,
            invoiceDate: new Date(entry.invoice_date),
            invoiceValue: entry.invoice_value,
            taxableValue: entry.taxable_value,
            cgst: entry.cgst || 0,
            sgst: entry.sgst || 0,
            igst: entry.igst || 0
          }
        });
      }
    }

    return { id: gstReturn.id, number: `${gstReturn.returnType}-${gstReturn.period}` };
  }

  private async autoReconcileAfterSave(input: any, orgId: string) {
    const { document_type, document_id, run_matching = true } = input;

    if (!run_matching) {
      return { message: 'Auto-reconciliation skipped', matches: [] };
    }

    const matches: any[] = [];

    if (document_type === 'PURCHASE_INVOICE') {
      // Find matching PO
      const invoice = await this.prisma.purchaseInvoice.findUnique({
        where: { id: document_id }
      });

      if (invoice) {
        const pos = await this.prisma.purchaseOrder.findMany({
          where: {
            orgId,
            vendorId: invoice.vendorId,
            status: { in: ['OPEN', 'PARTIALLY_FULFILLED'] }
          },
          take: 5
        });

        for (const po of pos) {
          const matchResult = await matchInvoiceToPO(invoice.id, po.id, orgId);
          if (matchResult.matchScore >= 70) {
            matches.push({
              po_id: po.id,
              po_number: po.poNumber,
              match_score: matchResult.matchScore,
              match_type: matchResult.matchType,
              discrepancies: matchResult.discrepancies
            });
          }
        }
      }
    } else if (document_type === 'BANK_STATEMENT') {
      // Match bank transactions to invoices
      const transactions = await this.prisma.bankTransaction.findMany({
        where: {
          orgId,
          matchStatus: 'UNMATCHED'
        },
        orderBy: { transactionDate: 'desc' },
        take: 100
      });

      for (const txn of transactions.slice(0, 10)) {  // Match first 10
        try {
          const matchResult = await matchPaymentToInvoices(txn.id, orgId, 'purchase');
          if (matchResult.bestMatch && matchResult.bestMatch.confidence >= 0.90) {
            matches.push({
              transaction_id: txn.id,
              transaction_date: txn.transactionDate,
              amount: txn.debit || txn.credit,
              matched_invoice: matchResult.bestMatch.invoiceNumber,
              confidence: matchResult.bestMatch.confidence
            });
          }
        } catch (error) {
          // Continue on error
        }
      }
    }

    return {
      document_type,
      document_id,
      matches_found: matches.length,
      matches,
      message: matches.length > 0
        ? `Found ${matches.length} potential match(es)`
        : 'No matches found'
    };
  }

  private async presentDataTable(input: any, orgId: string) {
    // This method just returns the table data structure
    // The actual rendering happens on the frontend via SSE event
    const { title, columns, rows, summary } = input;

    return {
      type: 'data_table',
      title,
      columns: columns || this.inferColumns(rows),
      rows,
      summary,
      row_count: rows.length
    };
  }

  private inferColumns(rows: any[]): any[] {
    if (!rows || rows.length === 0) return [];

    const firstRow = rows[0];
    const keys = Object.keys(firstRow);

    return keys.map(key => ({
      key,
      label: this.formatColumnLabel(key),
      format: this.inferColumnFormat(key, firstRow[key])
    }));
  }

  private formatColumnLabel(key: string): string {
    return key.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  private inferColumnFormat(key: string, value: any): string {
    if (key.includes('amount') || key.includes('total') || key.includes('price')) {
      return 'currency';
    }
    if (key.includes('date')) {
      return 'date';
    }
    if (key.includes('status')) {
      return 'status';
    }
    if (typeof value === 'number') {
      return 'number';
    }
    if (typeof value === 'boolean') {
      return 'boolean';
    }
    return 'text';
  }
}
