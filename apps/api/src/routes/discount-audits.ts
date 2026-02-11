import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { discountValidator } from '../services/discount-validator';
import logger from '../lib/logger';

export default async function discountAuditsRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/discount-audits/run
   * Run discount audit for specific invoices or vendor
   */
  fastify.post(
    '/run',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const body = z
          .object({
            vendorId: z.string().cuid().optional(),
            invoiceId: z.string().cuid().optional(),
          })
          .parse(request.body);

        if (!body.vendorId && !body.invoiceId) {
          return reply.code(400).send({
            success: false,
            error: 'Either vendorId or invoiceId is required',
          });
        }

        let results;

        if (body.invoiceId) {
          // Audit single invoice
          const result = await discountValidator.validateInvoiceDiscounts(
            body.invoiceId,
            user.orgId
          );

          // Save audit result
          await prisma.discountAudit.create({
            data: {
              invoiceId: result.invoiceId,
              termId: result.termId,
              expectedDiscount: result.expectedDiscount,
              actualDiscount: result.actualDiscount,
              difference: result.difference,
              status: result.status,
              notes: result.notes,
            },
          });

          results = [result];
        } else if (body.vendorId) {
          // Audit all invoices for vendor
          results = await discountValidator.auditVendorDiscounts(
            body.vendorId,
            user.orgId
          );
        }

        logger.info(
          { orgId: user.orgId, vendorId: body.vendorId, invoiceId: body.invoiceId },
          'Discount audit completed'
        );

        return reply.send({
          success: true,
          data: {
            audited: results?.length || 0,
            results,
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

        fastify.log.error({ error }, 'Run discount audit error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to run discount audit',
        });
      }
    }
  );

  /**
   * GET /api/discount-audits
   * List discount audits with filters
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
        const status = query.status;
        const vendorId = query.vendorId;

        const where: any = {
          invoice: { orgId: user.orgId },
        };

        if (status) {
          where.status = status;
        }

        if (vendorId) {
          where.invoice = {
            ...where.invoice,
            vendorId,
          };
        }

        const [audits, total] = await Promise.all([
          prisma.discountAudit.findMany({
            where,
            include: {
              invoice: {
                select: {
                  id: true,
                  invoiceNumber: true,
                  invoiceDate: true,
                  totalAmount: true,
                  totalWithGst: true,
                  vendor: {
                    select: {
                      id: true,
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
          prisma.discountAudit.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: {
            audits,
            total,
            limit,
            offset,
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'List discount audits error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to list discount audits',
        });
      }
    }
  );

  /**
   * GET /api/discount-audits/stats
   * Get discount audit statistics
   */
  fastify.get(
    '/stats',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;

        const summary = await discountValidator.getAuditSummary(user.orgId);

        return reply.send({
          success: true,
          data: summary,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get discount audit stats error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get discount audit stats',
        });
      }
    }
  );

  /**
   * GET /api/discount-audits/invoice/:invoiceId
   * Get audit results for a specific invoice
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

        const audits = await prisma.discountAudit.findMany({
          where: {
            invoiceId,
            invoice: { orgId: user.orgId },
          },
          include: {
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                invoiceDate: true,
                totalAmount: true,
                totalWithGst: true,
                vendor: {
                  select: {
                    id: true,
                    name: true,
                    gstin: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (audits.length === 0) {
          return reply.code(404).send({
            success: false,
            error: 'No audit found for this invoice',
          });
        }

        return reply.send({
          success: true,
          data: audits,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get invoice audit error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get invoice audit',
        });
      }
    }
  );

  /**
   * POST /api/discount-audits/penalty/calculate
   * Calculate late payment penalty
   */
  fastify.post(
    '/penalty/calculate',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const body = z
          .object({
            invoiceId: z.string().cuid(),
            paymentDate: z.string().datetime(),
          })
          .parse(request.body);

        const result = await discountValidator.calculateLatePaymentPenalty(
          body.invoiceId,
          user.orgId,
          new Date(body.paymentDate)
        );

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: 'Validation failed',
            details: error.errors,
          });
        }

        fastify.log.error({ error }, 'Calculate penalty error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to calculate penalty',
        });
      }
    }
  );

  /**
   * GET /api/discount-audits/vendor/:vendorId/summary
   * Get discount audit summary for a vendor
   */
  fastify.get(
    '/vendor/:vendorId/summary',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const { vendorId } = request.params as { vendorId: string };

        // Verify vendor belongs to org
        const vendor = await prisma.vendor.findFirst({
          where: {
            id: vendorId,
            orgId: user.orgId,
          },
        });

        if (!vendor) {
          return reply.code(404).send({
            success: false,
            error: 'Vendor not found',
          });
        }

        const audits = await prisma.discountAudit.findMany({
          where: {
            invoice: {
              orgId: user.orgId,
              vendorId,
            },
          },
        });

        const summary = {
          vendorId,
          vendorName: vendor.name,
          totalAudited: audits.length,
          correct: 0,
          underDiscounted: 0,
          overDiscounted: 0,
          needsReview: 0,
          totalUnderDiscountedAmount: 0,
          totalOverDiscountedAmount: 0,
        };

        for (const audit of audits) {
          switch (audit.status) {
            case 'CORRECT':
              summary.correct++;
              break;
            case 'UNDER_DISCOUNTED':
              summary.underDiscounted++;
              summary.totalUnderDiscountedAmount += Math.abs(audit.difference);
              break;
            case 'OVER_DISCOUNTED':
              summary.overDiscounted++;
              summary.totalOverDiscountedAmount += audit.difference;
              break;
            case 'NEEDS_REVIEW':
              summary.needsReview++;
              break;
          }
        }

        summary.totalUnderDiscountedAmount =
          Math.round(summary.totalUnderDiscountedAmount * 100) / 100;
        summary.totalOverDiscountedAmount =
          Math.round(summary.totalOverDiscountedAmount * 100) / 100;

        return reply.send({
          success: true,
          data: summary,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get vendor audit summary error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get vendor audit summary',
        });
      }
    }
  );
}
