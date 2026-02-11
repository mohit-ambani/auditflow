import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import logger from '../lib/logger';
import {
  matchGSTEntryToInvoice,
  reconcileGSTReturn,
  saveReconciliationMatches,
} from '../services/gst-reconciliation';

const reconcileReturnSchema = z.object({
  returnId: z.string().cuid(),
  autoSave: z.boolean().optional().default(false),
});

export default async function gstMatchesRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/gst-matches/reconcile
   * Reconcile all entries in a GST return
   */
  fastify.post(
    '/reconcile',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const body = reconcileReturnSchema.parse(request.body);

        // Verify GST return belongs to org
        const gstReturn = await prisma.gSTReturn.findFirst({
          where: {
            id: body.returnId,
            orgId: user.orgId,
          },
        });

        if (!gstReturn) {
          return reply.code(404).send({
            success: false,
            error: 'GST return not found',
          });
        }

        // Perform reconciliation
        const { matches, summary } = await reconcileGSTReturn(body.returnId, user.orgId);

        // Auto-save matches if requested
        let saveResult = null;
        if (body.autoSave) {
          saveResult = await saveReconciliationMatches(matches);

          // Update GST return status
          await prisma.gSTReturn.update({
            where: { id: body.returnId },
            data: { status: 'COMPLETED' },
          });
        }

        return reply.send({
          success: true,
          data: {
            matches,
            summary,
            saveResult,
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

        fastify.log.error({ error }, 'Reconcile GST return error');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to reconcile GST return',
        });
      }
    }
  );

  /**
   * GET /api/gst-matches
   * List GST matches with filters
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
        const returnId = query.returnId;
        const matchType = query.matchType;
        const itcStatus = query.itcStatus;

        const where: any = {
          gstEntry: {
            return_: {
              orgId: user.orgId,
            },
          },
        };

        if (returnId) {
          where.gstEntry.returnId = returnId;
        }

        if (matchType) {
          where.matchType = matchType;
        }

        if (itcStatus) {
          where.itcStatus = itcStatus;
        }

        const [matches, total] = await Promise.all([
          prisma.gSTMatch.findMany({
            where,
            include: {
              gstEntry: {
                select: {
                  counterpartyGstin: true,
                  counterpartyName: true,
                  invoiceNumber: true,
                  invoiceDate: true,
                  invoiceValue: true,
                  cgst: true,
                  sgst: true,
                  igst: true,
                },
              },
              purchaseInvoice: {
                select: {
                  invoiceNumber: true,
                  invoiceDate: true,
                  totalWithGst: true,
                  cgst: true,
                  sgst: true,
                  igst: true,
                  vendor: {
                    select: {
                      name: true,
                      gstin: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: limit,
          }),
          prisma.gSTMatch.count({ where }),
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
        fastify.log.error({ error }, 'List GST matches error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to list GST matches',
        });
      }
    }
  );

  /**
   * GET /api/gst-matches/:id
   * Get GST match details
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

        const match = await prisma.gSTMatch.findFirst({
          where: {
            id,
            gstEntry: {
              return_: {
                orgId: user.orgId,
              },
            },
          },
          include: {
            gstEntry: {
              include: {
                return_: true,
              },
            },
            purchaseInvoice: {
              include: {
                vendor: true,
                lineItems: true,
              },
            },
          },
        });

        if (!match) {
          return reply.code(404).send({
            success: false,
            error: 'GST match not found',
          });
        }

        return reply.send({
          success: true,
          data: match,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get GST match error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get GST match',
        });
      }
    }
  );

  /**
   * DELETE /api/gst-matches/:id
   * Delete GST match
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

        // Verify match exists and belongs to org
        const existing = await prisma.gSTMatch.findFirst({
          where: {
            id,
            gstEntry: {
              return_: {
                orgId: user.orgId,
              },
            },
          },
        });

        if (!existing) {
          return reply.code(404).send({
            success: false,
            error: 'GST match not found',
          });
        }

        // Delete match
        await prisma.gSTMatch.delete({
          where: { id },
        });

        logger.info({ matchId: id }, 'GST match deleted');

        return reply.send({
          success: true,
          data: { message: 'GST match deleted successfully' },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Delete GST match error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to delete GST match',
        });
      }
    }
  );

  /**
   * GET /api/gst-matches/return/:returnId/summary
   * Get reconciliation summary for a GST return
   */
  fastify.get(
    '/return/:returnId/summary',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const { returnId } = request.params as { returnId: string };

        // Verify GST return belongs to org
        const gstReturn = await prisma.gSTReturn.findFirst({
          where: {
            id: returnId,
            orgId: user.orgId,
          },
        });

        if (!gstReturn) {
          return reply.code(404).send({
            success: false,
            error: 'GST return not found',
          });
        }

        // Get reconciliation summary
        const { summary } = await reconcileGSTReturn(returnId, user.orgId);

        return reply.send({
          success: true,
          data: summary,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get GST return summary error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get GST return summary',
        });
      }
    }
  );

  /**
   * GET /api/gst-matches/stats
   * Get overall GST matching statistics
   */
  fastify.get(
    '/stats',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;

        const [
          totalMatches,
          exactMatches,
          partialMatches,
          itcAvailable,
          itcMismatch,
          totalITC,
        ] = await Promise.all([
          prisma.gSTMatch.count({
            where: {
              gstEntry: {
                return_: {
                  orgId: user.orgId,
                },
              },
            },
          }),
          prisma.gSTMatch.count({
            where: {
              gstEntry: {
                return_: {
                  orgId: user.orgId,
                },
              },
              matchType: 'EXACT',
            },
          }),
          prisma.gSTMatch.count({
            where: {
              gstEntry: {
                return_: {
                  orgId: user.orgId,
                },
              },
              matchType: 'PARTIAL_QTY',
            },
          }),
          prisma.gSTMatch.count({
            where: {
              gstEntry: {
                return_: {
                  orgId: user.orgId,
                },
              },
              itcStatus: 'AVAILABLE',
            },
          }),
          prisma.gSTMatch.count({
            where: {
              gstEntry: {
                return_: {
                  orgId: user.orgId,
                },
              },
              itcStatus: 'MISMATCH',
            },
          }),
          prisma.gSTReturnEntry.aggregate({
            where: {
              return_: {
                orgId: user.orgId,
              },
            },
            _sum: {
              cgst: true,
              sgst: true,
              igst: true,
            },
          }),
        ]);

        const totalITCValue =
          (totalITC._sum.cgst || 0) + (totalITC._sum.sgst || 0) + (totalITC._sum.igst || 0);

        return reply.send({
          success: true,
          data: {
            totalMatches,
            exactMatches,
            partialMatches,
            itcAvailable,
            itcMismatch,
            totalITCValue,
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get GST match stats error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get GST match statistics',
        });
      }
    }
  );

  /**
   * GET /api/gst-matches/return/:returnId/exceptions
   * Get exception report for a GST return
   */
  fastify.get(
    '/return/:returnId/exceptions',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const { returnId } = request.params as { returnId: string };

        // Verify GST return belongs to org
        const gstReturn = await prisma.gSTReturn.findFirst({
          where: {
            id: returnId,
            orgId: user.orgId,
          },
        });

        if (!gstReturn) {
          return reply.code(404).send({
            success: false,
            error: 'GST return not found',
          });
        }

        // Get all matches with discrepancies
        const matches = await prisma.gSTMatch.findMany({
          where: {
            gstEntry: {
              returnId,
            },
          },
          include: {
            gstEntry: {
              select: {
                counterpartyGstin: true,
                counterpartyName: true,
                invoiceNumber: true,
                invoiceValue: true,
              },
            },
            purchaseInvoice: {
              select: {
                invoiceNumber: true,
                totalWithGst: true,
              },
            },
          },
        });

        // Group by exception type
        const exceptions = {
          amountMismatches: matches.filter((m) => Math.abs(m.valueDiff || 0) > 1),
          gstMismatches: matches.filter((m) => Math.abs(m.gstDiff || 0) > 1),
          itcIssues: matches.filter((m) => m.itcStatus === 'MISMATCH' || m.itcStatus === 'NOT_FILED'),
        };

        return reply.send({
          success: true,
          data: exceptions,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get GST exceptions error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get GST exceptions',
        });
      }
    }
  );
}
