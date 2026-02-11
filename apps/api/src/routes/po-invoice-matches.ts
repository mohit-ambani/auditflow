import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import logger from '../lib/logger';
import { matchInvoiceToPO, findBestPOForInvoice, saveMatch } from '../services/po-invoice-matcher';

const createMatchSchema = z.object({
  invoiceId: z.string().cuid(),
  poId: z.string().cuid(),
});

const autoMatchSchema = z.object({
  invoiceId: z.string().cuid(),
});

const resolveMatchSchema = z.object({
  resolution: z.string().min(1),
});

export default async function poInvoiceMatchesRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/po-invoice-matches
   * Create a manual match between PO and Invoice
   */
  fastify.post(
    '/',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const body = createMatchSchema.parse(request.body);

        // Perform matching
        const matchResult = await matchInvoiceToPO(body.invoiceId, body.poId, user.orgId);

        // Save match
        const matchId = await saveMatch(matchResult);

        return reply.code(201).send({
          success: true,
          data: {
            matchId,
            ...matchResult,
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

        fastify.log.error({ error }, 'Create match error');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create match',
        });
      }
    }
  );

  /**
   * POST /api/po-invoice-matches/auto-match
   * Automatically find and match best PO for an invoice
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

        // Find best matching PO
        const bestMatch = await findBestPOForInvoice(body.invoiceId, user.orgId);

        if (!bestMatch) {
          return reply.send({
            success: true,
            data: {
              matched: false,
              message: 'No suitable PO found for this invoice',
            },
          });
        }

        // Save match
        const matchId = await saveMatch(bestMatch.match);

        return reply.send({
          success: true,
          data: {
            matched: true,
            matchId,
            ...bestMatch.match,
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

        fastify.log.error({ error }, 'Auto-match error');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to auto-match',
        });
      }
    }
  );

  /**
   * GET /api/po-invoice-matches
   * List all matches with filters
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
        const matchType = query.matchType;
        const needsReview = query.needsReview === 'true';
        const resolved = query.resolved;

        const where: any = {
          invoice: { orgId: user.orgId },
        };

        if (matchType) {
          where.matchType = matchType;
        }

        if (resolved === 'true') {
          where.resolvedAt = { not: null };
        } else if (resolved === 'false') {
          where.resolvedAt: null;
        }

        // Filter by needs review based on match score
        if (needsReview) {
          where.matchScore = { lt: 90 };
        }

        const [matches, total] = await Promise.all([
          prisma.purchaseInvoiceMatch.findMany({
            where,
            include: {
              invoice: {
                select: {
                  invoiceNumber: true,
                  invoiceDate: true,
                  totalWithGst: true,
                  vendor: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
              po: {
                select: {
                  poNumber: true,
                  poDate: true,
                  totalWithGst: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: limit,
          }),
          prisma.purchaseInvoiceMatch.count({ where }),
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
        fastify.log.error({ error }, 'List matches error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to list matches',
        });
      }
    }
  );

  /**
   * GET /api/po-invoice-matches/:id
   * Get match details
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

        const match = await prisma.purchaseInvoiceMatch.findFirst({
          where: {
            id,
            invoice: { orgId: user.orgId },
          },
          include: {
            invoice: {
              include: {
                lineItems: {
                  orderBy: { lineNumber: 'asc' },
                  include: {
                    sku: {
                      select: {
                        skuCode: true,
                        name: true,
                      },
                    },
                  },
                },
                vendor: {
                  select: {
                    name: true,
                    gstin: true,
                  },
                },
              },
            },
            po: {
              include: {
                lineItems: {
                  orderBy: { lineNumber: 'asc' },
                  include: {
                    sku: {
                      select: {
                        skuCode: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (!match) {
          return reply.code(404).send({
            success: false,
            error: 'Match not found',
          });
        }

        return reply.send({
          success: true,
          data: match,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get match error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get match',
        });
      }
    }
  );

  /**
   * PUT /api/po-invoice-matches/:id/resolve
   * Resolve a match (approve/reject with notes)
   */
  fastify.put(
    '/:id/resolve',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const { id } = request.params as { id: string };
        const body = resolveMatchSchema.parse(request.body);

        // Verify match exists and belongs to org
        const existing = await prisma.purchaseInvoiceMatch.findFirst({
          where: {
            id,
            invoice: { orgId: user.orgId },
          },
        });

        if (!existing) {
          return reply.code(404).send({
            success: false,
            error: 'Match not found',
          });
        }

        // Update match
        const updated = await prisma.purchaseInvoiceMatch.update({
          where: { id },
          data: {
            resolvedBy: user.userId,
            resolvedAt: new Date(),
            resolution: body.resolution,
          },
        });

        logger.info({ matchId: id, userId: user.userId }, 'Match resolved');

        return reply.send({
          success: true,
          data: updated,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: 'Validation failed',
            details: error.errors,
          });
        }

        fastify.log.error({ error }, 'Resolve match error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to resolve match',
        });
      }
    }
  );

  /**
   * DELETE /api/po-invoice-matches/:id
   * Delete a match
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
        const existing = await prisma.purchaseInvoiceMatch.findFirst({
          where: {
            id,
            invoice: { orgId: user.orgId },
          },
        });

        if (!existing) {
          return reply.code(404).send({
            success: false,
            error: 'Match not found',
          });
        }

        // Delete match
        await prisma.purchaseInvoiceMatch.delete({
          where: { id },
        });

        logger.info({ matchId: id, userId: user.userId }, 'Match deleted');

        return reply.send({
          success: true,
          data: { message: 'Match deleted successfully' },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Delete match error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to delete match',
        });
      }
    }
  );

  /**
   * GET /api/po-invoice-matches/stats
   * Get matching statistics
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
          needsReview,
          resolved,
          unresolved,
        ] = await Promise.all([
          prisma.purchaseInvoiceMatch.count({
            where: { invoice: { orgId: user.orgId } },
          }),
          prisma.purchaseInvoiceMatch.count({
            where: {
              invoice: { orgId: user.orgId },
              matchType: 'EXACT',
            },
          }),
          prisma.purchaseInvoiceMatch.count({
            where: {
              invoice: { orgId: user.orgId },
              matchType: { in: ['PARTIAL_QTY', 'PARTIAL_VALUE', 'PARTIAL_BOTH'] },
            },
          }),
          prisma.purchaseInvoiceMatch.count({
            where: {
              invoice: { orgId: user.orgId },
              matchScore: { lt: 90 },
            },
          }),
          prisma.purchaseInvoiceMatch.count({
            where: {
              invoice: { orgId: user.orgId },
              resolvedAt: { not: null },
            },
          }),
          prisma.purchaseInvoiceMatch.count({
            where: {
              invoice: { orgId: user.orgId },
              resolvedAt: null,
            },
          }),
        ]);

        return reply.send({
          success: true,
          data: {
            totalMatches,
            exactMatches,
            partialMatches,
            needsReview,
            resolved,
            unresolved,
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get match stats error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get match statistics',
        });
      }
    }
  );

  /**
   * GET /api/po-invoice-matches/invoice/:invoiceId
   * Get matches for a specific invoice
   */
  fastify.get(
    '/invoice/:invoiceId',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const { invoiceId } = request.params as { invoiceId: string };

        const matches = await prisma.purchaseInvoiceMatch.findMany({
          where: {
            invoiceId,
            invoice: { orgId: user.orgId },
          },
          include: {
            po: {
              select: {
                poNumber: true,
                poDate: true,
                totalWithGst: true,
              },
            },
          },
          orderBy: { matchScore: 'desc' },
        });

        return reply.send({
          success: true,
          data: matches,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get invoice matches error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get invoice matches',
        });
      }
    }
  );

  /**
   * GET /api/po-invoice-matches/po/:poId
   * Get matches for a specific PO
   */
  fastify.get(
    '/po/:poId',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const { poId } = request.params as { poId: string };

        const matches = await prisma.purchaseInvoiceMatch.findMany({
          where: {
            poId,
            invoice: { orgId: user.orgId },
          },
          include: {
            invoice: {
              select: {
                invoiceNumber: true,
                invoiceDate: true,
                totalWithGst: true,
              },
            },
          },
          orderBy: { matchScore: 'desc' },
        });

        return reply.send({
          success: true,
          data: matches,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get PO matches error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get PO matches',
        });
      }
    }
  );
}
