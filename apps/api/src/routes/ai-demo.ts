import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { extractPurchaseInvoice, extractPurchaseOrder, extractBankStatement } from '../services/ai-extractor';
import { prisma } from '../lib/prisma';
import logger from '../lib/logger';

export default async function aiDemoRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/ai-demo/extract-invoice
   * Demo: Extract invoice data from text using AI
   */
  fastify.post(
    '/extract-invoice',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const body = z
          .object({
            documentText: z.string().min(10),
          })
          .parse(request.body);

        logger.info({ orgId: user.orgId }, 'AI invoice extraction started');

        const extracted = await extractPurchaseInvoice(body.documentText);

        return reply.send({
          success: true,
          data: {
            extracted,
            confidence: extracted.arithmetic_verified ? 0.95 : 0.75,
            needsReview: !extracted.arithmetic_verified,
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: 'Validation failed',
            details: error.errors,
          });
        }

        fastify.log.error({ error }, 'AI invoice extraction error');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to extract invoice',
        });
      }
    }
  );

  /**
   * POST /api/ai-demo/extract-po
   * Demo: Extract PO data from text using AI
   */
  fastify.post(
    '/extract-po',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const body = z
          .object({
            documentText: z.string().min(10),
          })
          .parse(request.body);

        logger.info({ orgId: user.orgId }, 'AI PO extraction started');

        const extracted = await extractPurchaseOrder(body.documentText);

        return reply.send({
          success: true,
          data: {
            extracted,
            confidence: 0.9,
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: 'Validation failed',
            details: error.errors,
          });
        }

        fastify.log.error({ error }, 'AI PO extraction error');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to extract PO',
        });
      }
    }
  );

  /**
   * POST /api/ai-demo/extract-bank-statement
   * Demo: Extract bank statement data from text using AI
   */
  fastify.post(
    '/extract-bank-statement',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const body = z
          .object({
            documentText: z.string().min(10),
          })
          .parse(request.body);

        logger.info({ orgId: user.orgId }, 'AI bank statement extraction started');

        const extracted = await extractBankStatement(body.documentText);

        return reply.send({
          success: true,
          data: {
            extracted,
            transactionCount: extracted.transactions?.length || 0,
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: 'Validation failed',
            details: error.errors,
          });
        }

        fastify.log.error({ error }, 'AI bank statement extraction error');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to extract bank statement',
        });
      }
    }
  );

  /**
   * POST /api/ai-demo/process-and-save-invoice
   * Demo: Extract invoice and save to database
   */
  fastify.post(
    '/process-and-save-invoice',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const body = z
          .object({
            documentText: z.string().min(10),
          })
          .parse(request.body);

        // Extract data using AI
        const extracted = await extractPurchaseInvoice(body.documentText);

        // Find or create vendor
        let vendor = await prisma.vendor.findFirst({
          where: {
            orgId: user.orgId,
            gstin: extracted.vendor_gstin || undefined,
          },
        });

        if (!vendor && extracted.vendor_name) {
          vendor = await prisma.vendor.create({
            data: {
              orgId: user.orgId,
              name: extracted.vendor_name,
              gstin: extracted.vendor_gstin,
              isActive: true,
            },
          });
        }

        if (!vendor) {
          return reply.code(400).send({
            success: false,
            error: 'Could not identify vendor',
          });
        }

        // Create invoice
        const invoice = await prisma.purchaseInvoice.create({
          data: {
            orgId: user.orgId,
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
          },
        });

        // Create line items
        if (extracted.line_items && Array.isArray(extracted.line_items)) {
          for (const item of extracted.line_items) {
            await prisma.purchaseInvoiceLineItem.create({
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
                totalAmount: item.total,
              },
            });
          }
        }

        logger.info({ invoiceId: invoice.id }, 'AI-extracted invoice saved to database');

        return reply.send({
          success: true,
          data: {
            invoice,
            extracted,
            vendor,
            lineItemsCount: extracted.line_items?.length || 0,
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: 'Validation failed',
            details: error.errors,
          });
        }

        fastify.log.error({ error }, 'AI invoice processing error');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to process invoice',
        });
      }
    }
  );
}
