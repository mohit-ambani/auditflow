import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { inventoryReconciliationService } from '../services/inventory-reconciliation';
import logger from '../lib/logger';

export default async function inventoryRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/inventory/reconcile
   * Run inventory reconciliation
   */
  fastify.post(
    '/reconcile',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const body = z
          .object({
            snapshotDate: z.string().datetime().optional(),
          })
          .parse(request.body);

        const snapshotDate = body.snapshotDate
          ? new Date(body.snapshotDate)
          : new Date();

        const result = await inventoryReconciliationService.reconcileAllInventory(
          snapshotDate,
          user.orgId
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

        fastify.log.error({ error }, 'Inventory reconciliation error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to reconcile inventory',
        });
      }
    }
  );

  /**
   * GET /api/inventory/snapshots
   * List inventory snapshots
   */
  fastify.get(
    '/snapshots',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const query = request.query as any;

        const limit = parseInt(query.limit || '50');
        const offset = parseInt(query.offset || '0');
        const skuId = query.skuId;

        const where: any = { orgId: user.orgId };

        if (skuId) {
          where.skuId = skuId;
        }

        const [snapshots, total] = await Promise.all([
          prisma.inventorySnapshot.findMany({
            where,
            include: {
              sku: {
                select: {
                  id: true,
                  skuCode: true,
                  name: true,
                  unit: true,
                },
              },
            },
            orderBy: { snapshotDate: 'desc' },
            skip: offset,
            take: limit,
          }),
          prisma.inventorySnapshot.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: {
            snapshots,
            total,
            limit,
            offset,
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'List snapshots error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to list snapshots',
        });
      }
    }
  );

  /**
   * GET /api/inventory/summary
   * Get inventory summary statistics
   */
  fastify.get(
    '/summary',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;

        const summary = await inventoryReconciliationService.getInventorySummary(
          user.orgId
        );

        return reply.send({
          success: true,
          data: summary,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get inventory summary error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get inventory summary',
        });
      }
    }
  );

  /**
   * GET /api/inventory/discrepancies
   * Get inventory discrepancies
   */
  fastify.get(
    '/discrepancies',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const query = request.query as any;

        const snapshotDate = query.snapshotDate
          ? new Date(query.snapshotDate)
          : undefined;

        const discrepancies = await inventoryReconciliationService.getDiscrepancies(
          user.orgId,
          snapshotDate
        );

        return reply.send({
          success: true,
          data: discrepancies,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get discrepancies error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get discrepancies',
        });
      }
    }
  );

  /**
   * POST /api/inventory/snapshot
   * Create manual inventory snapshot
   */
  fastify.post(
    '/snapshot',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const body = z
          .object({
            skuId: z.string().cuid(),
            snapshotDate: z.string().datetime(),
            openingQty: z.number(),
            closingQty: z.number(),
          })
          .parse(request.body);

        const snapshotId = await inventoryReconciliationService.createSnapshot(
          body.skuId,
          new Date(body.snapshotDate),
          body.openingQty,
          body.closingQty,
          user.orgId
        );

        return reply.code(201).send({
          success: true,
          data: { snapshotId },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: 'Validation failed',
            details: error.errors,
          });
        }

        fastify.log.error({ error }, 'Create snapshot error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to create snapshot',
        });
      }
    }
  );
}
