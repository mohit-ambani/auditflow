import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import logger from '../lib/logger';

// Validation functions
function validateGSTIN(gstin: string | null | undefined): boolean {
  if (!gstin) return false;
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin);
}

function validatePAN(pan: string | null | undefined): boolean {
  if (!pan) return false;
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan);
}

const createCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
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
  creditLimitDays: z.number().int().positive().optional(),
  creditLimitAmount: z.number().positive().optional(),
  erpCustomerCode: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

const updateCustomerSchema = createCustomerSchema.partial();

const bulkImportSchema = z.object({
  customers: z.array(createCustomerSchema),
  skipDuplicates: z.boolean().optional().default(true),
});

export default async function customersRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/customers
   * Create a new customer
   */
  fastify.post(
    '/',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const body = createCustomerSchema.parse(request.body);

        // Check for duplicates by GSTIN or ERP code
        if (body.gstin) {
          const existing = await prisma.customer.findFirst({
            where: {
              orgId: user.orgId,
              gstin: body.gstin,
            },
          });

          if (existing) {
            return reply.code(400).send({
              success: false,
              error: `Customer with GSTIN ${body.gstin} already exists`,
            });
          }
        }

        if (body.erpCustomerCode) {
          const existing = await prisma.customer.findFirst({
            where: {
              orgId: user.orgId,
              erpCustomerCode: body.erpCustomerCode,
            },
          });

          if (existing) {
            return reply.code(400).send({
              success: false,
              error: `Customer with ERP code ${body.erpCustomerCode} already exists`,
            });
          }
        }

        // Create customer
        const customer = await prisma.customer.create({
          data: {
            ...body,
            orgId: user.orgId,
          },
        });

        logger.info({ customerId: customer.id, orgId: user.orgId }, 'Customer created');

        return reply.code(201).send({
          success: true,
          data: customer,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: 'Validation failed',
            details: error.errors,
          });
        }

        fastify.log.error({ error }, 'Create customer error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to create customer',
        });
      }
    }
  );

  /**
   * GET /api/customers
   * List customers with filters and pagination
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
            { erpCustomerCode: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ];
        }

        const [customers, total] = await Promise.all([
          prisma.customer.findMany({
            where,
            orderBy: { name: 'asc' },
            skip: offset,
            take: limit,
          }),
          prisma.customer.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: {
            customers,
            total,
            limit,
            offset,
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'List customers error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to list customers',
        });
      }
    }
  );

  /**
   * GET /api/customers/:id
   * Get customer details with ledger summary
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

        const customer = await prisma.customer.findFirst({
          where: {
            id,
            orgId: user.orgId,
          },
          include: {
            _count: {
              select: {
                salesInvoices: true,
                paymentReminders: true,
              },
            },
          },
        });

        if (!customer) {
          return reply.code(404).send({
            success: false,
            error: 'Customer not found',
          });
        }

        // Get ledger summary
        const [totalInvoiceValue, totalPaidValue] = await Promise.all([
          prisma.salesInvoice.aggregate({
            where: {
              customerId: id,
              orgId: user.orgId,
            },
            _sum: { grandTotal: true },
          }),
          prisma.paymentMatch.aggregate({
            where: {
              salesInvoice: {
                customerId: id,
                orgId: user.orgId,
              },
            },
            _sum: { matchedAmount: true },
          }),
        ]);

        const totalInvoiced = totalInvoiceValue._sum.grandTotal || 0;
        const totalPaid = totalPaidValue._sum.matchedAmount || 0;
        const outstanding = totalInvoiced - totalPaid;

        // Check credit limit utilization
        const creditUtilization = customer.creditLimitAmount
          ? (outstanding / customer.creditLimitAmount) * 100
          : 0;

        return reply.send({
          success: true,
          data: {
            ...customer,
            ledgerSummary: {
              totalSalesInvoices: customer._count.salesInvoices,
              totalInvoicedAmount: totalInvoiced,
              totalPaidAmount: totalPaid,
              outstandingAmount: outstanding,
              creditLimitAmount: customer.creditLimitAmount || 0,
              creditUtilization: Math.round(creditUtilization * 100) / 100,
              creditLimitExceeded: customer.creditLimitAmount
                ? outstanding > customer.creditLimitAmount
                : false,
            },
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get customer error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get customer',
        });
      }
    }
  );

  /**
   * PUT /api/customers/:id
   * Update customer
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
        const body = updateCustomerSchema.parse(request.body);

        // Verify customer exists and belongs to org
        const existing = await prisma.customer.findFirst({
          where: {
            id,
            orgId: user.orgId,
          },
        });

        if (!existing) {
          return reply.code(404).send({
            success: false,
            error: 'Customer not found',
          });
        }

        // Check for duplicate GSTIN or ERP code (excluding current customer)
        if (body.gstin) {
          const duplicate = await prisma.customer.findFirst({
            where: {
              orgId: user.orgId,
              gstin: body.gstin,
              id: { not: id },
            },
          });

          if (duplicate) {
            return reply.code(400).send({
              success: false,
              error: `Another customer with GSTIN ${body.gstin} already exists`,
            });
          }
        }

        if (body.erpCustomerCode) {
          const duplicate = await prisma.customer.findFirst({
            where: {
              orgId: user.orgId,
              erpCustomerCode: body.erpCustomerCode,
              id: { not: id },
            },
          });

          if (duplicate) {
            return reply.code(400).send({
              success: false,
              error: `Another customer with ERP code ${body.erpCustomerCode} already exists`,
            });
          }
        }

        // Update customer
        const customer = await prisma.customer.update({
          where: { id },
          data: body,
        });

        logger.info({ customerId: id, orgId: user.orgId }, 'Customer updated');

        return reply.send({
          success: true,
          data: customer,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: 'Validation failed',
            details: error.errors,
          });
        }

        fastify.log.error({ error }, 'Update customer error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to update customer',
        });
      }
    }
  );

  /**
   * DELETE /api/customers/:id
   * Delete customer (soft delete by setting isActive = false)
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

        // Verify customer exists and belongs to org
        const existing = await prisma.customer.findFirst({
          where: {
            id,
            orgId: user.orgId,
          },
        });

        if (!existing) {
          return reply.code(404).send({
            success: false,
            error: 'Customer not found',
          });
        }

        // Check if customer has transactions
        const hasTransactions = await prisma.salesInvoice.count({
          where: { customerId: id },
        });

        if (hasTransactions > 0) {
          // Soft delete - don't actually remove, just deactivate
          await prisma.customer.update({
            where: { id },
            data: { isActive: false },
          });

          logger.info({ customerId: id, orgId: user.orgId }, 'Customer deactivated');

          return reply.send({
            success: true,
            data: {
              message: 'Customer deactivated (has existing transactions)',
              deactivated: true,
            },
          });
        } else {
          // Hard delete if no transactions
          await prisma.customer.delete({
            where: { id },
          });

          logger.info({ customerId: id, orgId: user.orgId }, 'Customer deleted');

          return reply.send({
            success: true,
            data: { message: 'Customer deleted successfully' },
          });
        }
      } catch (error) {
        fastify.log.error({ error }, 'Delete customer error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to delete customer',
        });
      }
    }
  );

  /**
   * POST /api/customers/bulk-import
   * Bulk import customers from CSV/Excel
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

        for (let i = 0; i < body.customers.length; i++) {
          const customerData = body.customers[i];

          try {
            // Validate
            const validated = createCustomerSchema.parse(customerData);

            // Check for duplicates
            if (validated.gstin) {
              const existing = await prisma.customer.findFirst({
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
                    error: `Customer with GSTIN ${validated.gstin} already exists`,
                    data: customerData,
                  });
                  results.failed++;
                  continue;
                }
              }
            }

            if (validated.erpCustomerCode) {
              const existing = await prisma.customer.findFirst({
                where: {
                  orgId: user.orgId,
                  erpCustomerCode: validated.erpCustomerCode,
                },
              });

              if (existing) {
                if (body.skipDuplicates) {
                  results.skipped++;
                  continue;
                } else {
                  results.errors.push({
                    row: i + 1,
                    error: `Customer with ERP code ${validated.erpCustomerCode} already exists`,
                    data: customerData,
                  });
                  results.failed++;
                  continue;
                }
              }
            }

            // Create customer
            await prisma.customer.create({
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
              data: customerData,
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
          'Customer bulk import completed'
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

        fastify.log.error({ error }, 'Bulk import customers error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to import customers',
        });
      }
    }
  );

  /**
   * GET /api/customers/stats
   * Get customer statistics
   */
  fastify.get(
    '/stats',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;

        const [totalCustomers, activeCustomers, inactiveCustomers] = await Promise.all([
          prisma.customer.count({
            where: { orgId: user.orgId },
          }),
          prisma.customer.count({
            where: { orgId: user.orgId, isActive: true },
          }),
          prisma.customer.count({
            where: { orgId: user.orgId, isActive: false },
          }),
        ]);

        return reply.send({
          success: true,
          data: {
            totalCustomers,
            activeCustomers,
            inactiveCustomers,
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get customer stats error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get customer statistics',
        });
      }
    }
  );
}
