import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import logger from '../lib/logger';

const createBankTxnSchema = z.object({
  transactionDate: z.string().datetime(),
  description: z.string().min(1),
  referenceNumber: z.string().optional(),
  debit: z.number().optional(),
  credit: z.number().optional(),
  balance: z.number().optional(),
  transactionType: z.enum(['NEFT', 'RTGS', 'IMPS', 'UPI', 'CHEQUE', 'CASH', 'OTHER']).optional(),
});

const uploadStatementSchema = z.object({
  statementPeriod: z.string(),
  bankName: z.string(),
  accountNumber: z.string(),
  openingBalance: z.number(),
  closingBalance: z.number(),
});

export default async function bankTransactionsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/bank-transactions
   * List all bank transactions
   */
  fastify.get(
    '/',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const { page = 1, limit = 50, matchStatus, search } = request.query as any;

        const skip = (page - 1) * limit;
        const where: any = {
          orgId: user.orgId,
        };

        if (matchStatus) {
          where.matchStatus = matchStatus;
        }

        if (search) {
          where.OR = [
            { description: { contains: search, mode: 'insensitive' } },
            { referenceNumber: { contains: search, mode: 'insensitive' } },
          ];
        }

        const [transactions, total] = await Promise.all([
          prisma.bankTransaction.findMany({
            where,
            orderBy: { transactionDate: 'desc' },
            take: limit,
            skip,
            include: {
              statement: {
                select: {
                  id: true,
                  statementDate: true,
                  fromDate: true,
                  toDate: true,
                  bankName: true,
                },
              },
            },
          }),
          prisma.bankTransaction.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: {
            transactions,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        });
      } catch (error) {
        logger.error({ error }, 'Error listing bank transactions');
        return reply.code(500).send({
          success: false,
          error: 'Failed to list bank transactions',
        });
      }
    }
  );

  /**
   * GET /api/bank-transactions/:id
   * Get single bank transaction
   */
  fastify.get(
    '/:id',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const { id } = request.params as any;

        const transaction = await prisma.bankTransaction.findFirst({
          where: {
            id,
            orgId: user.orgId,
          },
          include: {
            statement: true,
            paymentMatches: {
              include: {
                purchaseInvoice: true,
                salesInvoice: true,
              },
            },
          },
        });

        if (!transaction) {
          return reply.code(404).send({
            success: false,
            error: 'Bank transaction not found',
          });
        }

        return reply.send({
          success: true,
          data: transaction,
        });
      } catch (error) {
        logger.error({ error }, 'Error fetching bank transaction');
        return reply.code(500).send({
          success: false,
          error: 'Failed to fetch bank transaction',
        });
      }
    }
  );

  /**
   * POST /api/bank-transactions
   * Create a bank transaction
   */
  fastify.post(
    '/',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const body = createBankTxnSchema.parse(request.body);

        const transaction = await prisma.bankTransaction.create({
          data: {
            ...body,
            transactionDate: new Date(body.transactionDate),
            orgId: user.orgId,
          },
        });

        logger.info({ transactionId: transaction.id }, 'Bank transaction created');

        return reply.code(201).send({
          success: true,
          data: transaction,
        });
      } catch (error) {
        logger.error({ error }, 'Error creating bank transaction');
        return reply.code(500).send({
          success: false,
          error: 'Failed to create bank transaction',
        });
      }
    }
  );

  /**
   * GET /api/bank-transactions/stats
   * Get bank transaction statistics
   */
  fastify.get(
    '/stats',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;

        const [total, matched, unmatched] = await Promise.all([
          prisma.bankTransaction.count({
            where: { orgId: user.orgId },
          }),
          prisma.bankTransaction.count({
            where: {
              orgId: user.orgId,
              matchStatus: { in: ['AUTO_MATCHED', 'MANUALLY_MATCHED'] },
            },
          }),
          prisma.bankTransaction.count({
            where: {
              orgId: user.orgId,
              matchStatus: 'UNMATCHED',
            },
          }),
        ]);

        // Calculate matched amount
        const matchedTransactions = await prisma.bankTransaction.findMany({
          where: {
            orgId: user.orgId,
            matchStatus: { in: ['AUTO_MATCHED', 'MANUALLY_MATCHED'] },
          },
          select: {
            debit: true,
            credit: true,
          },
        });

        const matchedAmount = matchedTransactions.reduce((sum, txn) => {
          return sum + (txn.debit || 0) + (txn.credit || 0);
        }, 0);

        return reply.send({
          success: true,
          data: {
            total,
            matched,
            unmatched,
            matchedAmount,
          },
        });
      } catch (error) {
        logger.error({ error }, 'Error fetching bank transaction stats');
        return reply.code(500).send({
          success: false,
          error: 'Failed to fetch statistics',
        });
      }
    }
  );

  /**
   * DELETE /api/bank-transactions/:id
   * Delete a bank transaction
   */
  fastify.delete(
    '/:id',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const { id } = request.params as any;

        // Check if transaction exists and belongs to org
        const transaction = await prisma.bankTransaction.findFirst({
          where: {
            id,
            orgId: user.orgId,
          },
        });

        if (!transaction) {
          return reply.code(404).send({
            success: false,
            error: 'Bank transaction not found',
          });
        }

        // Delete the transaction
        await prisma.bankTransaction.delete({
          where: { id },
        });

        logger.info({ transactionId: id }, 'Bank transaction deleted');

        return reply.send({
          success: true,
          message: 'Bank transaction deleted successfully',
        });
      } catch (error) {
        logger.error({ error }, 'Error deleting bank transaction');
        return reply.code(500).send({
          success: false,
          error: 'Failed to delete bank transaction',
        });
      }
    }
  );
}
