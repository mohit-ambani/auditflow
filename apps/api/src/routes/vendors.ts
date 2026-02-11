import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validateGSTIN, validatePAN } from '@auditflow/shared';
import logger from '../lib/logger';

const createVendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  gstin: z.string().optional().refine(
    (val) => !val || validateGSTIN(val),
    'Invalid GSTIN format'
  ),
  pan: z.string().optional().refine(
    (val) => !val || validatePAN(val),
    'Invalid PAN format'
  ),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  contactPerson: z.string().optional(),
  paymentTermsDays: z.number().int().positive().optional(),
  erpVendorCode: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

const updateVendorSchema = createVendorSchema.partial();

const bulkImportSchema = z.object({
  vendors: z.array(createVendorSchema),
  skipDuplicates: z.boolean().optional().default(true),
});

export default async function vendorsRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/vendors
   * Create a new vendor
   */
  fastify.post(
    '/',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const body = createVendorSchema.parse(request.body);

        // Check for duplicates by GSTIN or ERP code
        if (body.gstin) {
          const existing = await prisma.vendor.findFirst({
            where: {
              orgId: user.orgId,
              gstin: body.gstin,
            },
          });

          if (existing) {
            return reply.code(400).send({
              success: false,
              error: `Vendor with GSTIN ${body.gstin} already exists`,
            });
          }
        }

        if (body.erpVendorCode) {
          const existing = await prisma.vendor.findFirst({
            where: {
              orgId: user.orgId,
              erpVendorCode: body.erpVendorCode,
            },
          });

          if (existing) {
            return reply.code(400).send({
              success: false,
              error: `Vendor with ERP code ${body.erpVendorCode} already exists`,
            });
          }
        }

        // Create vendor
        const vendor = await prisma.vendor.create({
          data: {
            ...body,
            orgId: user.orgId,
          },
        });

        logger.info({ vendorId: vendor.id, orgId: user.orgId }, 'Vendor created');

        return reply.code(201).send({
          success: true,
          data: vendor,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: 'Validation failed',
            details: error.errors,
          });
        }

        fastify.log.error({ error }, 'Create vendor error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to create vendor',
        });
      }
    }
  );

  /**
   * GET /api/vendors
   * List vendors with filters and pagination
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
        const isActive = query.isActive !== undefined ? query.isActive === 'true' : undefined;

        const where: any = {
          orgId: user.orgId,
        };

        if (isActive !== undefined) {
          where.isActive = isActive;
        }

        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { gstin: { contains: search, mode: 'insensitive' } },
            { erpVendorCode: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ];
        }

        const [vendors, total] = await Promise.all([
          prisma.vendor.findMany({
            where,
            orderBy: { name: 'asc' },
            skip: offset,
            take: limit,
          }),
          prisma.vendor.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: {
            vendors,
            total,
            limit,
            offset,
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'List vendors error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to list vendors',
        });
      }
    }
  );

  /**
   * GET /api/vendors/:id
   * Get vendor details with transaction summary
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

        const vendor = await prisma.vendor.findFirst({
          where: {
            id,
            orgId: user.orgId,
          },
          include: {
            _count: {
              select: {
                purchaseOrders: true,
                purchaseInvoices: true,
                discountTerms: true,
              },
            },
          },
        });

        if (!vendor) {
          return reply.code(404).send({
            success: false,
            error: 'Vendor not found',
          });
        }

        // Get transaction summary
        const [totalPOValue, totalInvoiceValue] = await Promise.all([
          prisma.purchaseOrder.aggregate({
            where: {
              vendorId: id,
              orgId: user.orgId,
            },
            _sum: { totalWithGst: true },
          }),
          prisma.purchaseInvoice.aggregate({
            where: {
              vendorId: id,
              orgId: user.orgId,
            },
            _sum: { grandTotal: true },
          }),
        ]);

        return reply.send({
          success: true,
          data: {
            ...vendor,
            transactionSummary: {
              totalPurchaseOrders: vendor._count.purchaseOrders,
              totalPurchaseInvoices: vendor._count.purchaseInvoices,
              totalPOValue: totalPOValue._sum.totalWithGst || 0,
              totalInvoiceValue: totalInvoiceValue._sum.grandTotal || 0,
            },
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get vendor error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get vendor',
        });
      }
    }
  );

  /**
   * PUT /api/vendors/:id
   * Update vendor
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
        const body = updateVendorSchema.parse(request.body);

        // Verify vendor exists and belongs to org
        const existing = await prisma.vendor.findFirst({
          where: {
            id,
            orgId: user.orgId,
          },
        });

        if (!existing) {
          return reply.code(404).send({
            success: false,
            error: 'Vendor not found',
          });
        }

        // Check for duplicate GSTIN or ERP code (excluding current vendor)
        if (body.gstin) {
          const duplicate = await prisma.vendor.findFirst({
            where: {
              orgId: user.orgId,
              gstin: body.gstin,
              id: { not: id },
            },
          });

          if (duplicate) {
            return reply.code(400).send({
              success: false,
              error: `Another vendor with GSTIN ${body.gstin} already exists`,
            });
          }
        }

        if (body.erpVendorCode) {
          const duplicate = await prisma.vendor.findFirst({
            where: {
              orgId: user.orgId,
              erpVendorCode: body.erpVendorCode,
              id: { not: id },
            },
          });

          if (duplicate) {
            return reply.code(400).send({
              success: false,
              error: `Another vendor with ERP code ${body.erpVendorCode} already exists`,
            });
          }
        }

        // Update vendor
        const vendor = await prisma.vendor.update({
          where: { id },
          data: body,
        });

        logger.info({ vendorId: id, orgId: user.orgId }, 'Vendor updated');

        return reply.send({
          success: true,
          data: vendor,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: 'Validation failed',
            details: error.errors,
          });
        }

        fastify.log.error({ error }, 'Update vendor error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to update vendor',
        });
      }
    }
  );

  /**
   * DELETE /api/vendors/:id
   * Delete vendor (soft delete by setting isActive = false)
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

        // Verify vendor exists and belongs to org
        const existing = await prisma.vendor.findFirst({
          where: {
            id,
            orgId: user.orgId,
          },
        });

        if (!existing) {
          return reply.code(404).send({
            success: false,
            error: 'Vendor not found',
          });
        }

        // Check if vendor has transactions
        const hasTransactions = await prisma.purchaseOrder.count({
          where: { vendorId: id },
        });

        if (hasTransactions > 0) {
          // Soft delete - don't actually remove, just deactivate
          await prisma.vendor.update({
            where: { id },
            data: { isActive: false },
          });

          logger.info({ vendorId: id, orgId: user.orgId }, 'Vendor deactivated');

          return reply.send({
            success: true,
            data: {
              message: 'Vendor deactivated (has existing transactions)',
              deactivated: true,
            },
          });
        } else {
          // Hard delete if no transactions
          await prisma.vendor.delete({
            where: { id },
          });

          logger.info({ vendorId: id, orgId: user.orgId }, 'Vendor deleted');

          return reply.send({
            success: true,
            data: { message: 'Vendor deleted successfully' },
          });
        }
      } catch (error) {
        fastify.log.error({ error }, 'Delete vendor error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to delete vendor',
        });
      }
    }
  );

  /**
   * POST /api/vendors/bulk-import
   * Bulk import vendors from CSV/Excel
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

        for (let i = 0; i < body.vendors.length; i++) {
          const vendorData = body.vendors[i];

          try {
            // Validate
            const validated = createVendorSchema.parse(vendorData);

            // Check for duplicates
            if (validated.gstin) {
              const existing = await prisma.vendor.findFirst({
                where: {
                  orgId: user.orgId,
                  gstin: validated.gstin,
                },
              });

              if (existing) {
                if (body.skipDuplicates) {
                  results.skipped++;
                  continue;
                } else {
                  results.errors.push({
                    row: i + 1,
                    error: `Vendor with GSTIN ${validated.gstin} already exists`,
                    data: vendorData,
                  });
                  results.failed++;
                  continue;
                }
              }
            }

            if (validated.erpVendorCode) {
              const existing = await prisma.vendor.findFirst({
                where: {
                  orgId: user.orgId,
                  erpVendorCode: validated.erpVendorCode,
                },
              });

              if (existing) {
                if (body.skipDuplicates) {
                  results.skipped++;
                  continue;
                } else {
                  results.errors.push({
                    row: i + 1,
                    error: `Vendor with ERP code ${validated.erpVendorCode} already exists`,
                    data: vendorData,
                  });
                  results.failed++;
                  continue;
                }
              }
            }

            // Create vendor
            await prisma.vendor.create({
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
              data: vendorData,
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
          'Vendor bulk import completed'
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

        fastify.log.error({ error }, 'Bulk import vendors error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to import vendors',
        });
      }
    }
  );

  /**
   * GET /api/vendors/stats
   * Get vendor statistics
   */
  fastify.get(
    '/stats',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;

        const [totalVendors, activeVendors, inactiveVendors] = await Promise.all([
          prisma.vendor.count({
            where: { orgId: user.orgId },
          }),
          prisma.vendor.count({
            where: { orgId: user.orgId, isActive: true },
          }),
          prisma.vendor.count({
            where: { orgId: user.orgId, isActive: false },
          }),
        ]);

        return reply.send({
          success: true,
          data: {
            totalVendors,
            activeVendors,
            inactiveVendors,
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get vendor stats error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get vendor statistics',
        });
      }
    }
  );
}
