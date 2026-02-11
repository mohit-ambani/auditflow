import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import logger from '../lib/logger';
import { mapLineItemToSKU, bulkMapLineItems, learnFromMapping } from '../services/sku-mapper';

const createSKUSchema = z.object({
  skuCode: z.string().min(1, 'SKU code is required'),
  name: z.string().min(1, 'SKU name is required'),
  description: z.string().optional(),
  hsnCode: z.string().optional(),
  unit: z.string().default('PCS'),
  gstRate: z.number().min(0).max(28).optional(),
  aliases: z.array(z.string()).optional().default([]),
  category: z.string().optional(),
  subCategory: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

const updateSKUSchema = createSKUSchema.partial();

const bulkImportSchema = z.object({
  skus: z.array(createSKUSchema),
  skipDuplicates: z.boolean().optional().default(true),
});

export default async function skusRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/skus
   * Create a new SKU
   */
  fastify.post(
    '/',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const body = createSKUSchema.parse(request.body);

        // Check for duplicate SKU code
        const existing = await prisma.sKU.findFirst({
          where: {
            orgId: user.orgId,
            skuCode: body.skuCode,
          },
        });

        if (existing) {
          return reply.code(400).send({
            success: false,
            error: `SKU with code ${body.skuCode} already exists`,
          });
        }

        // Create SKU
        const sku = await prisma.sKU.create({
          data: {
            ...body,
            orgId: user.orgId,
          },
        });

        logger.info({ skuId: sku.id, orgId: user.orgId }, 'SKU created');

        return reply.code(201).send({
          success: true,
          data: sku,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: 'Validation failed',
            details: error.errors,
          });
        }

        fastify.log.error({ error }, 'Create SKU error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to create SKU',
        });
      }
    }
  );

  /**
   * GET /api/skus
   * List SKUs with filters and pagination
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
        const search = query.search;
        const category = query.category;
        const isActive = query.isActive !== undefined ? query.isActive === 'true' : undefined;

        const where: any = {
          orgId: user.orgId,
        };

        if (isActive !== undefined) {
          where.isActive = isActive;
        }

        if (category) {
          where.category = category;
        }

        if (search) {
          where.OR = [
            { skuCode: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { hsnCode: { contains: search, mode: 'insensitive' } },
            { aliases: { has: search } },
          ];
        }

        const [skus, total] = await Promise.all([
          prisma.sKU.findMany({
            where,
            orderBy: { skuCode: 'asc' },
            skip: offset,
            take: limit,
          }),
          prisma.sKU.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: {
            skus,
            total,
            limit,
            offset,
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'List SKUs error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to list SKUs',
        });
      }
    }
  );

  /**
   * GET /api/skus/:id
   * Get SKU details with usage statistics
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

        const sku = await prisma.sKU.findFirst({
          where: {
            id,
            orgId: user.orgId,
          },
          include: {
            _count: {
              select: {
                poLineItems: true,
                purchaseLineItems: true,
                salesLineItems: true,
              },
            },
          },
        });

        if (!sku) {
          return reply.code(404).send({
            success: false,
            error: 'SKU not found',
          });
        }

        // Get usage statistics
        const [purchaseStats, salesStats] = await Promise.all([
          prisma.purchaseInvoiceLineItem.aggregate({
            where: {
              skuId: id,
              invoice: {
                orgId: user.orgId,
              },
            },
            _sum: { quantity: true, totalAmount: true },
          }),
          prisma.salesInvoiceLineItem.aggregate({
            where: {
              skuId: id,
              invoice: {
                orgId: user.orgId,
              },
            },
            _sum: { quantity: true, totalAmount: true },
          }),
        ]);

        return reply.send({
          success: true,
          data: {
            ...sku,
            usageStats: {
              purchaseOrderLines: sku._count.poLineItems,
              purchaseInvoiceLines: sku._count.purchaseLineItems,
              salesInvoiceLines: sku._count.salesLineItems,
              totalPurchaseQuantity: purchaseStats._sum.quantity || 0,
              totalPurchaseValue: purchaseStats._sum.totalAmount || 0,
              totalSalesQuantity: salesStats._sum.quantity || 0,
              totalSalesValue: salesStats._sum.totalAmount || 0,
            },
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get SKU error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get SKU',
        });
      }
    }
  );

  /**
   * PUT /api/skus/:id
   * Update SKU
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
        const body = updateSKUSchema.parse(request.body);

        // Verify SKU exists and belongs to org
        const existing = await prisma.sKU.findFirst({
          where: {
            id,
            orgId: user.orgId,
          },
        });

        if (!existing) {
          return reply.code(404).send({
            success: false,
            error: 'SKU not found',
          });
        }

        // Check for duplicate SKU code (excluding current SKU)
        if (body.skuCode) {
          const duplicate = await prisma.sKU.findFirst({
            where: {
              orgId: user.orgId,
              skuCode: body.skuCode,
              id: { not: id },
            },
          });

          if (duplicate) {
            return reply.code(400).send({
              success: false,
              error: `Another SKU with code ${body.skuCode} already exists`,
            });
          }
        }

        // Update SKU
        const sku = await prisma.sKU.update({
          where: { id },
          data: body,
        });

        logger.info({ skuId: id, orgId: user.orgId }, 'SKU updated');

        return reply.send({
          success: true,
          data: sku,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: 'Validation failed',
            details: error.errors,
          });
        }

        fastify.log.error({ error }, 'Update SKU error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to update SKU',
        });
      }
    }
  );

  /**
   * DELETE /api/skus/:id
   * Delete SKU (soft delete by setting isActive = false)
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

        // Verify SKU exists and belongs to org
        const existing = await prisma.sKU.findFirst({
          where: {
            id,
            orgId: user.orgId,
          },
        });

        if (!existing) {
          return reply.code(404).send({
            success: false,
            error: 'SKU not found',
          });
        }

        // Check if SKU is used in any transactions
        const hasUsage =
          (await prisma.pOLineItem.count({ where: { skuId: id } })) > 0 ||
          (await prisma.purchaseInvoiceLineItem.count({ where: { skuId: id } })) > 0 ||
          (await prisma.salesInvoiceLineItem.count({ where: { skuId: id } })) > 0;

        if (hasUsage) {
          // Soft delete - don't actually remove, just deactivate
          await prisma.sKU.update({
            where: { id },
            data: { isActive: false },
          });

          logger.info({ skuId: id, orgId: user.orgId }, 'SKU deactivated');

          return reply.send({
            success: true,
            data: {
              message: 'SKU deactivated (has existing usage)',
              deactivated: true,
            },
          });
        } else {
          // Hard delete if no usage
          await prisma.sKU.delete({
            where: { id },
          });

          logger.info({ skuId: id, orgId: user.orgId }, 'SKU deleted');

          return reply.send({
            success: true,
            data: { message: 'SKU deleted successfully' },
          });
        }
      } catch (error) {
        fastify.log.error({ error }, 'Delete SKU error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to delete SKU',
        });
      }
    }
  );

  /**
   * POST /api/skus/bulk-import
   * Bulk import SKUs from CSV/Excel
   */
  fastify.post(
    '/bulk-import',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const body = bulkImportSchema.parse(request.body);

        const results = {
          created: 0,
          skipped: 0,
          failed: 0,
          errors: [] as Array<{ row: number; error: string; data: any }>,
        };

        for (let i = 0; i < body.skus.length; i++) {
          const skuData = body.skus[i];

          try {
            // Validate
            const validated = createSKUSchema.parse(skuData);

            // Check for duplicates
            const existing = await prisma.sKU.findFirst({
              where: {
                orgId: user.orgId,
                skuCode: validated.skuCode,
              },
            });

            if (existing) {
              if (body.skipDuplicates) {
                results.skipped++;
                continue;
              } else {
                results.errors.push({
                  row: i + 1,
                  error: `SKU with code ${validated.skuCode} already exists`,
                  data: skuData,
                });
                results.failed++;
                continue;
              }
            }

            // Create SKU
            await prisma.sKU.create({
              data: {
                ...validated,
                orgId: user.orgId,
              },
            });

            results.created++;
          } catch (error) {
            results.failed++;
            results.errors.push({
              row: i + 1,
              error: error instanceof Error ? error.message : 'Unknown error',
              data: skuData,
            });
          }
        }

        logger.info(
          {
            orgId: user.orgId,
            created: results.created,
            failed: results.failed,
            skipped: results.skipped,
          },
          'SKU bulk import completed'
        );

        return reply.send({
          success: true,
          data: results,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: 'Validation failed',
            details: error.errors,
          });
        }

        fastify.log.error({ error }, 'Bulk import SKUs error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to import SKUs',
        });
      }
    }
  );

  /**
   * GET /api/skus/categories
   * Get list of unique categories
   */
  fastify.get(
    '/categories',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;

        const categories = await prisma.sKU.findMany({
          where: {
            orgId: user.orgId,
            category: { not: null },
          },
          select: {
            category: true,
            subCategory: true,
          },
          distinct: ['category', 'subCategory'],
        });

        // Group by category
        const grouped = categories.reduce((acc, item) => {
          if (item.category) {
            if (!acc[item.category]) {
              acc[item.category] = new Set();
            }
            if (item.subCategory) {
              acc[item.category].add(item.subCategory);
            }
          }
          return acc;
        }, {} as Record<string, Set<string>>);

        const result = Object.entries(grouped).map(([category, subCategories]) => ({
          category,
          subCategories: Array.from(subCategories),
        }));

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get categories error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get categories',
        });
      }
    }
  );

  /**
   * GET /api/skus/stats
   * Get SKU statistics
   */
  fastify.get(
    '/stats',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;

        const [totalSKUs, activeSKUs, inactiveSKUs, byCategory] = await Promise.all([
          prisma.sKU.count({
            where: { orgId: user.orgId },
          }),
          prisma.sKU.count({
            where: { orgId: user.orgId, isActive: true },
          }),
          prisma.sKU.count({
            where: { orgId: user.orgId, isActive: false },
          }),
          prisma.sKU.groupBy({
            by: ['category'],
            where: {
              orgId: user.orgId,
              category: { not: null },
            },
            _count: true,
          }),
        ]);

        return reply.send({
          success: true,
          data: {
            totalSKUs,
            activeSKUs,
            inactiveSKUs,
            byCategory: byCategory.map((item) => ({
              category: item.category,
              count: item._count,
            })),
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get SKU stats error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get SKU statistics',
        });
      }
    }
  );

  /**
   * POST /api/skus/map
   * Map a line item description to SKU master
   */
  fastify.post(
    '/map',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const body = z
          .object({
            description: z.string().min(1),
            skuCode: z.string().optional(),
            hsnCode: z.string().optional(),
          })
          .parse(request.body);

        const result = await mapLineItemToSKU(
          user.orgId,
          body.description,
          body.skuCode,
          body.hsnCode
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

        fastify.log.error({ error }, 'SKU mapping error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to map SKU',
        });
      }
    }
  );

  /**
   * POST /api/skus/map-bulk
   * Bulk map multiple line items
   */
  fastify.post(
    '/map-bulk',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const body = z
          .object({
            lineItems: z.array(
              z.object({
                description: z.string().min(1),
                skuCode: z.string().optional(),
                hsnCode: z.string().optional(),
              })
            ),
          })
          .parse(request.body);

        const results = await bulkMapLineItems(user.orgId, body.lineItems);

        const summary = {
          total: results.length,
          autoMapped: results.filter((r) => !r.needsReview).length,
          needsReview: results.filter((r) => r.needsReview).length,
        };

        return reply.send({
          success: true,
          data: {
            results,
            summary,
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

        fastify.log.error({ error }, 'Bulk SKU mapping error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to map SKUs',
        });
      }
    }
  );

  /**
   * POST /api/skus/:id/learn
   * Learn from user confirmation - add alias to SKU
   */
  fastify.post(
    '/:id/learn',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const { id } = request.params as { id: string };
        const body = z
          .object({
            alias: z.string().min(1),
          })
          .parse(request.body);

        // Verify SKU exists and belongs to org
        const sku = await prisma.sKU.findFirst({
          where: {
            id,
            orgId: user.orgId,
          },
        });

        if (!sku) {
          return reply.code(404).send({
            success: false,
            error: 'SKU not found',
          });
        }

        await learnFromMapping(id, body.alias);

        return reply.send({
          success: true,
          data: {
            message: 'SKU alias learned successfully',
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

        fastify.log.error({ error }, 'Learn from mapping error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to learn from mapping',
        });
      }
    }
  );
}
