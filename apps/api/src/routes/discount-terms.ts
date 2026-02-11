import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import logger from '../lib/logger';

const discountTermTypeSchema = z.enum([
  'TRADE_DISCOUNT',
  'CASH_DISCOUNT',
  'VOLUME_REBATE',
  'LATE_PAYMENT_PENALTY',
  'LATE_DELIVERY_PENALTY',
  'SPECIAL_SCHEME',
]);

const createDiscountTermSchema = z.object({
  vendorId: z.string().cuid(),
  termType: discountTermTypeSchema,
  description: z.string().min(1),
  slabs: z
    .array(
      z.object({
        minValue: z.number().min(0),
        maxValue: z.number().min(0).optional(),
        discountPercent: z.number().min(0).max(100).optional(),
        discountAmount: z.number().min(0).optional(),
      })
    )
    .optional(),
  flatPercent: z.number().min(0).max(100).optional(),
  flatAmount: z.number().min(0).optional(),
  applicableSkus: z.array(z.string()).optional().default([]),
  minOrderValue: z.number().min(0).optional(),
  paymentWithinDays: z.number().int().positive().optional(),
  latePaymentPenaltyPercent: z.number().min(0).max(100).optional(),
  lateDeliveryPenaltyPerDay: z.number().min(0).optional(),
  validFrom: z.string().datetime(),
  validTo: z.string().datetime().optional(),
  isActive: z.boolean().optional().default(true),
});

const updateDiscountTermSchema = createDiscountTermSchema.partial();

export default async function discountTermsRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/discount-terms
   * Create a new discount term
   */
  fastify.post(
    '/',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const body = createDiscountTermSchema.parse(request.body);

        // Verify vendor exists and belongs to org
        const vendor = await prisma.vendor.findFirst({
          where: {
            id: body.vendorId,
            orgId: user.orgId,
          },
        });

        if (!vendor) {
          return reply.code(404).send({
            success: false,
            error: 'Vendor not found',
          });
        }

        // Validate dates
        const validFrom = new Date(body.validFrom);
        const validTo = body.validTo ? new Date(body.validTo) : null;

        if (validTo && validTo <= validFrom) {
          return reply.code(400).send({
            success: false,
            error: 'Valid to date must be after valid from date',
          });
        }

        // Create discount term
        const discountTerm = await prisma.discountTerm.create({
          data: {
            ...body,
            orgId: user.orgId,
            validFrom,
            validTo,
            slabs: body.slabs || undefined,
          },
        });

        logger.info(
          { discountTermId: discountTerm.id, orgId: user.orgId },
          'Discount term created'
        );

        return reply.code(201).send({
          success: true,
          data: discountTerm,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: 'Validation failed',
            details: error.errors,
          });
        }

        fastify.log.error({ error }, 'Create discount term error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to create discount term',
        });
      }
    }
  );

  /**
   * GET /api/discount-terms
   * List discount terms with filters and pagination
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
        const vendorId = query.vendorId;
        const termType = query.termType;
        const isActive = query.isActive !== undefined ? query.isActive === 'true' : undefined;

        const where: any = {
          orgId: user.orgId,
        };

        if (vendorId) {
          where.vendorId = vendorId;
        }

        if (termType) {
          where.termType = termType;
        }

        if (isActive !== undefined) {
          where.isActive = isActive;
        }

        const [discountTerms, total] = await Promise.all([
          prisma.discountTerm.findMany({
            where,
            include: {
              vendor: {
                select: {
                  id: true,
                  name: true,
                  gstin: true,
                },
              },
            },
            orderBy: { validFrom: 'desc' },
            skip: offset,
            take: limit,
          }),
          prisma.discountTerm.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: {
            discountTerms,
            total,
            limit,
            offset,
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'List discount terms error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to list discount terms',
        });
      }
    }
  );

  /**
   * GET /api/discount-terms/:id
   * Get discount term details
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

        const discountTerm = await prisma.discountTerm.findFirst({
          where: {
            id,
            orgId: user.orgId,
          },
          include: {
            vendor: {
              select: {
                id: true,
                name: true,
                gstin: true,
              },
            },
          },
        });

        if (!discountTerm) {
          return reply.code(404).send({
            success: false,
            error: 'Discount term not found',
          });
        }

        return reply.send({
          success: true,
          data: discountTerm,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get discount term error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get discount term',
        });
      }
    }
  );

  /**
   * PUT /api/discount-terms/:id
   * Update discount term
   */
  fastify.put(
    '/:id',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const { id } = request.params as { id: string };
        const body = updateDiscountTermSchema.parse(request.body);

        // Verify discount term exists and belongs to org
        const existing = await prisma.discountTerm.findFirst({
          where: {
            id,
            orgId: user.orgId,
          },
        });

        if (!existing) {
          return reply.code(404).send({
            success: false,
            error: 'Discount term not found',
          });
        }

        // Validate dates if provided
        if (body.validFrom || body.validTo) {
          const validFrom = body.validFrom
            ? new Date(body.validFrom)
            : existing.validFrom;
          const validTo = body.validTo
            ? new Date(body.validTo)
            : existing.validTo;

          if (validTo && validTo <= validFrom) {
            return reply.code(400).send({
              success: false,
              error: 'Valid to date must be after valid from date',
            });
          }
        }

        // Update discount term
        const updateData: any = { ...body };
        if (body.validFrom) {
          updateData.validFrom = new Date(body.validFrom);
        }
        if (body.validTo) {
          updateData.validTo = new Date(body.validTo);
        }

        const discountTerm = await prisma.discountTerm.update({
          where: { id },
          data: updateData,
        });

        logger.info({ discountTermId: id, orgId: user.orgId }, 'Discount term updated');

        return reply.send({
          success: true,
          data: discountTerm,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: 'Validation failed',
            details: error.errors,
          });
        }

        fastify.log.error({ error }, 'Update discount term error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to update discount term',
        });
      }
    }
  );

  /**
   * DELETE /api/discount-terms/:id
   * Delete discount term
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

        // Verify discount term exists and belongs to org
        const existing = await prisma.discountTerm.findFirst({
          where: {
            id,
            orgId: user.orgId,
          },
        });

        if (!existing) {
          return reply.code(404).send({
            success: false,
            error: 'Discount term not found',
          });
        }

        // Soft delete - just deactivate
        await prisma.discountTerm.update({
          where: { id },
          data: { isActive: false },
        });

        logger.info({ discountTermId: id, orgId: user.orgId }, 'Discount term deactivated');

        return reply.send({
          success: true,
          data: { message: 'Discount term deactivated successfully' },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Delete discount term error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to delete discount term',
        });
      }
    }
  );

  /**
   * GET /api/discount-terms/vendor/:vendorId/active
   * Get active discount terms for a vendor
   */
  fastify.get(
    '/vendor/:vendorId/active',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const { vendorId } = request.params as { vendorId: string };
        const now = new Date();

        const discountTerms = await prisma.discountTerm.findMany({
          where: {
            orgId: user.orgId,
            vendorId,
            isActive: true,
            validFrom: { lte: now },
            OR: [{ validTo: null }, { validTo: { gte: now } }],
          },
          orderBy: { validFrom: 'desc' },
        });

        return reply.send({
          success: true,
          data: discountTerms,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get active discount terms error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get active discount terms',
        });
      }
    }
  );

  /**
   * POST /api/discount-terms/calculate
   * Calculate applicable discount for given parameters
   */
  fastify.post(
    '/calculate',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const body = z
          .object({
            vendorId: z.string().cuid(),
            orderValue: z.number().min(0),
            skuIds: z.array(z.string()).optional(),
            paymentDays: z.number().int().positive().optional(),
          })
          .parse(request.body);

        const now = new Date();

        // Get active discount terms for vendor
        const discountTerms = await prisma.discountTerm.findMany({
          where: {
            orgId: user.orgId,
            vendorId: body.vendorId,
            isActive: true,
            validFrom: { lte: now },
            OR: [{ validTo: null }, { validTo: { gte: now } }],
          },
        });

        const applicableDiscounts = [];

        for (const term of discountTerms) {
          // Check min order value
          if (term.minOrderValue && body.orderValue < term.minOrderValue) {
            continue;
          }

          // Check SKU applicability
          if (
            term.applicableSkus.length > 0 &&
            body.skuIds &&
            !body.skuIds.some((id) => term.applicableSkus.includes(id))
          ) {
            continue;
          }

          let discountAmount = 0;
          let discountPercent = 0;

          // Calculate discount based on type
          if (term.flatPercent) {
            discountPercent = term.flatPercent;
            discountAmount = (body.orderValue * term.flatPercent) / 100;
          } else if (term.flatAmount) {
            discountAmount = term.flatAmount;
            discountPercent = (term.flatAmount / body.orderValue) * 100;
          } else if (term.slabs && Array.isArray(term.slabs)) {
            // Find applicable slab
            for (const slab of term.slabs as any[]) {
              const minValue = slab.minValue || 0;
              const maxValue = slab.maxValue || Infinity;

              if (body.orderValue >= minValue && body.orderValue < maxValue) {
                if (slab.discountPercent) {
                  discountPercent = slab.discountPercent;
                  discountAmount = (body.orderValue * slab.discountPercent) / 100;
                } else if (slab.discountAmount) {
                  discountAmount = slab.discountAmount;
                  discountPercent = (slab.discountAmount / body.orderValue) * 100;
                }
                break;
              }
            }
          }

          // Check cash discount with payment terms
          if (
            term.termType === 'CASH_DISCOUNT' &&
            term.paymentWithinDays &&
            body.paymentDays
          ) {
            if (body.paymentDays > term.paymentWithinDays) {
              continue; // Not applicable if payment is late
            }
          }

          if (discountAmount > 0) {
            applicableDiscounts.push({
              termId: term.id,
              termType: term.termType,
              description: term.description,
              discountAmount: Math.round(discountAmount * 100) / 100,
              discountPercent: Math.round(discountPercent * 100) / 100,
            });
          }
        }

        const totalDiscount = applicableDiscounts.reduce(
          (sum, d) => sum + d.discountAmount,
          0
        );

        return reply.send({
          success: true,
          data: {
            orderValue: body.orderValue,
            applicableDiscounts,
            totalDiscountAmount: Math.round(totalDiscount * 100) / 100,
            netValue: Math.round((body.orderValue - totalDiscount) * 100) / 100,
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

        fastify.log.error({ error }, 'Calculate discount error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to calculate discount',
        });
      }
    }
  );
}
