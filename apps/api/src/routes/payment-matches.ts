import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import logger from '../lib/logger';
import {
  matchPaymentToInvoices,
  createPaymentMatch,
  createSplitPayment,
} from '../services/payment-matcher';

const autoMatchSchema = z.object({
  bankTxnId: z.string().cuid(),
  invoiceType: z.enum(['purchase', 'sales']),
});

const manualMatchSchema = z.object({
  bankTxnId: z.string().cuid(),
  invoiceId: z.string().cuid(),
  invoiceType: z.enum(['purchase', 'sales']),
  matchedAmount: z.number().positive(),
  notes: z.string().optional(),
});

const splitPaymentSchema = z.object({
  bankTxnId: z.string().cuid(),
  splits: z.array(
    z.object({
      invoiceId: z.string().cuid(),
      invoiceType: z.enum(['purchase', 'sales']),
      amount: z.number().positive(),
    })
  ),
  notes: z.string().optional(),
});

export default async function paymentMatchesRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/payment-matches/auto-match
   * Automatically find and match payment to invoices
   */
  fastify.post(
    '/auto-match',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const body = autoMatchSchema.parse(request.body);

        // Find matching invoices
        const matchResult = await matchPaymentToInvoices(
          body.bankTxnId,
          user.orgId,
          body.invoiceType
        );

        // Auto-create match if confidence is high
        let matchId: string | null = null;
        if (matchResult.autoMatch && matchResult.bestMatch) {
          matchId = await createPaymentMatch(
            body.bankTxnId,
            matchResult.bestMatch.invoiceId,
            body.invoiceType,
            matchResult.totalMatched,
            matchResult.confidence,
            'Auto-matched'
          );
        }

        return reply.send({
          success: true,
          data: {
            ...matchResult,
            matchId,
            autoMatched: !!matchId,
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

        fastify.log.error({ error }, 'Auto-match payment error');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to auto-match payment',
        });
      }
    }
  );

  /**
   * POST /api/payment-matches
   * Manually create payment match
   */
  fastify.post(
    '/',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const body = manualMatchSchema.parse(request.body);

        // Verify bank transaction belongs to org
        const bankTxn = await prisma.bankTransaction.findFirst({
          where: {
            id: body.bankTxnId,
            orgId: user.orgId,
          },
        });

        if (!bankTxn) {
          return reply.code(404).send({
            success: false,
            error: 'Bank transaction not found',
          });
        }

        // Verify invoice belongs to org
        if (body.invoiceType === 'purchase') {
          const invoice = await prisma.purchaseInvoice.findFirst({
            where: {
              id: body.invoiceId,
              orgId: user.orgId,
            },
          });

          if (!invoice) {
            return reply.code(404).send({
              success: false,
              error: 'Purchase invoice not found',
            });
          }
        } else {
          const invoice = await prisma.salesInvoice.findFirst({
            where: {
              id: body.invoiceId,
              orgId: user.orgId,
            },
          });

          if (!invoice) {
            return reply.code(404).send({
              success: false,
              error: 'Sales invoice not found',
            });
          }
        }

        // Create match
        const matchId = await createPaymentMatch(
          body.bankTxnId,
          body.invoiceId,
          body.invoiceType,
          body.matchedAmount,
          100, // Manual matches get perfect score
          body.notes
        );

        return reply.code(201).send({
          success: true,
          data: { matchId },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: 'Validation failed',
            details: error.errors,
          });
        }

        fastify.log.error({ error }, 'Create payment match error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to create payment match',
        });
      }
    }
  );

  /**
   * POST /api/payment-matches/split
   * Create split payment (one transaction to multiple invoices)
   */
  fastify.post(
    '/split',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const body = splitPaymentSchema.parse(request.body);

        // Verify bank transaction
        const bankTxn = await prisma.bankTransaction.findFirst({
          where: {
            id: body.bankTxnId,
            orgId: user.orgId,
          },
        });

        if (!bankTxn) {
          return reply.code(404).send({
            success: false,
            error: 'Bank transaction not found',
          });
        }

        // Verify total split amount doesn't exceed transaction amount
        const txnAmount = bankTxn.debit || bankTxn.credit || 0;
        const totalSplit = body.splits.reduce((sum, s) => sum + s.amount, 0);

        if (totalSplit > txnAmount + 10) {
          // Allow ±₹10 tolerance
          return reply.code(400).send({
            success: false,
            error: `Split total (₹${totalSplit}) exceeds transaction amount (₹${txnAmount})`,
          });
        }

        // Create split payment matches
        const matchIds = await createSplitPayment(body.bankTxnId, body.splits, body.notes);

        return reply.code(201).send({
          success: true,
          data: {
            matchIds,
            count: matchIds.length,
            totalMatched: totalSplit,
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

        fastify.log.error({ error }, 'Create split payment error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to create split payment',
        });
      }
    }
  );

  /**
   * GET /api/payment-matches
   * List payment matches with filters
   */
  fastify.get(
    '/',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const query = request.query as any;

        const limit = parseInt(query.limit || '50');
        const offset = parseInt(query.offset || '0');
        const invoiceType = query.invoiceType; // 'purchase' or 'sales'

        const where: any = {
          bankTransaction: { orgId: user.orgId },
        };

        if (invoiceType === 'purchase') {
          where.purchaseInvoiceId = { not: null };
        } else if (invoiceType === 'sales') {
          where.salesInvoiceId = { not: null };
        }

        const [matches, total] = await Promise.all([
          prisma.paymentMatch.findMany({
            where,
            include: {
              bankTransaction: {
                select: {
                  transactionDate: true,
                  description: true,
                  debit: true,
                  credit: true,
                  referenceNumber: true,
                },
              },
              purchaseInvoice: {
                select: {
                  invoiceNumber: true,
                  totalWithGst: true,
                  vendor: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
              salesInvoice: {
                select: {
                  invoiceNumber: true,
                  totalWithGst: true,
                  customer: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: limit,
          }),
          prisma.paymentMatch.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: {
            matches,
            total,
            limit,
            offset,
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'List payment matches error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to list payment matches',
        });
      }
    }
  );

  /**
   * GET /api/payment-matches/:id
   * Get payment match details
   */
  fastify.get(
    '/:id',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const { id } = request.params as { id: string };

        const match = await prisma.paymentMatch.findFirst({
          where: {
            id,
            bankTransaction: { orgId: user.orgId },
          },
          include: {
            bankTransaction: true,
            purchaseInvoice: {
              include: {
                vendor: true,
              },
            },
            salesInvoice: {
              include: {
                customer: true,
              },
            },
          },
        });

        if (!match) {
          return reply.code(404).send({
            success: false,
            error: 'Payment match not found',
          });
        }

        return reply.send({
          success: true,
          data: match,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get payment match error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get payment match',
        });
      }
    }
  );

  /**
   * DELETE /api/payment-matches/:id
   * Delete payment match and revert invoice status
   */
  fastify.delete(
    '/:id',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const { id } = request.params as { id: string };

        // Get match details
        const match = await prisma.paymentMatch.findFirst({
          where: {
            id,
            bankTransaction: { orgId: user.orgId },
          },
          include: {
            purchaseInvoice: true,
            salesInvoice: true,
          },
        });

        if (!match) {
          return reply.code(404).send({
            success: false,
            error: 'Payment match not found',
          });
        }

        // Delete match and revert invoice payment
        await prisma.$transaction(async (tx) => {
          // Revert purchase invoice payment
          if (match.purchaseInvoiceId && match.purchaseInvoice) {
            const invoice = match.purchaseInvoice;
            const newAmountPaid = Math.max(0, invoice.amountPaid - match.matchedAmount);
            const paymentStatus =
              newAmountPaid === 0
                ? 'UNPAID'
                : newAmountPaid < invoice.totalWithGst
                ? 'PARTIALLY_PAID'
                : 'PAID';

            await tx.purchaseInvoice.update({
              where: { id: match.purchaseInvoiceId },
              data: {
                amountPaid: newAmountPaid,
                paymentStatus,
              },
            });
          }

          // Revert sales invoice payment
          if (match.salesInvoiceId && match.salesInvoice) {
            const invoice = match.salesInvoice;
            const newAmountPaid = Math.max(0, invoice.amountPaid - match.matchedAmount);
            const paymentStatus =
              newAmountPaid === 0
                ? 'UNPAID'
                : newAmountPaid < invoice.totalWithGst
                ? 'PARTIALLY_PAID'
                : 'PAID';

            await tx.salesInvoice.update({
              where: { id: match.salesInvoiceId },
              data: {
                amountPaid: newAmountPaid,
                paymentStatus,
              },
            });
          }

          // Update bank transaction status
          const remainingMatches = await tx.paymentMatch.count({
            where: {
              bankTxnId: match.bankTxnId,
              id: { not: id },
            },
          });

          if (remainingMatches === 0) {
            await tx.bankTransaction.update({
              where: { id: match.bankTxnId },
              data: { matchStatus: 'UNMATCHED' },
            });
          }

          // Delete match
          await tx.paymentMatch.delete({
            where: { id },
          });
        });

        logger.info({ matchId: id }, 'Payment match deleted');

        return reply.send({
          success: true,
          data: { message: 'Payment match deleted successfully' },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Delete payment match error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to delete payment match',
        });
      }
    }
  );

  /**
   * GET /api/payment-matches/stats
   * Get payment matching statistics
   */
  fastify.get(
    '/stats',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;

        const [totalMatches, totalMatchedAmount, unmatchedTxns] = await Promise.all([
          prisma.paymentMatch.count({
            where: { bankTransaction: { orgId: user.orgId } },
          }),
          prisma.paymentMatch.aggregate({
            where: { bankTransaction: { orgId: user.orgId } },
            _sum: { matchedAmount: true },
          }),
          prisma.bankTransaction.count({
            where: {
              orgId: user.orgId,
              matchStatus: 'UNMATCHED',
            },
          }),
        ]);

        return reply.send({
          success: true,
          data: {
            totalMatches,
            totalMatchedAmount: totalMatchedAmount._sum.matchedAmount || 0,
            unmatchedTxns,
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get payment match stats error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get payment match statistics',
        });
      }
    }
  );
}
