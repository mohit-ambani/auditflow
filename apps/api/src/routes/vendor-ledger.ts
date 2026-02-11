import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { ledgerConfirmationService } from '../services/ledger-confirmation';
import logger from '../lib/logger';

export default async function vendorLedgerRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/vendor-ledger/generate
   * Generate vendor ledger for a period
   */
  fastify.post(
    '/generate',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const body = z
          .object({
            vendorId: z.string().cuid(),
            periodFrom: z.string().datetime(),
            periodTo: z.string().datetime(),
          })
          .parse(request.body);

        const ledgerData = await ledgerConfirmationService.generateVendorLedger(
          body.vendorId,
          new Date(body.periodFrom),
          new Date(body.periodTo),
          user.orgId
        );

        return reply.send({
          success: true,
          data: ledgerData,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: 'Validation failed',
            details: error.errors,
          });
        }

        fastify.log.error({ error }, 'Generate vendor ledger error');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to generate ledger',
        });
      }
    }
  );

  /**
   * POST /api/vendor-ledger/confirm
   * Create and optionally send ledger confirmation request
   */
  fastify.post(
    '/confirm',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const body = z
          .object({
            vendorId: z.string().cuid(),
            periodFrom: z.string().datetime(),
            periodTo: z.string().datetime(),
            sendEmail: z.boolean().optional().default(false),
          })
          .parse(request.body);

        const confirmationId = await ledgerConfirmationService.createConfirmationRequest(
          body.vendorId,
          new Date(body.periodFrom),
          new Date(body.periodTo),
          user.orgId
        );

        if (body.sendEmail) {
          await ledgerConfirmationService.sendConfirmationEmail(confirmationId, user.orgId);
        }

        return reply.code(201).send({
          success: true,
          data: { confirmationId },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: 'Validation failed',
            details: error.errors,
          });
        }

        fastify.log.error({ error }, 'Create confirmation error');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create confirmation',
        });
      }
    }
  );

  /**
   * GET /api/vendor-ledger/confirmations
   * List all ledger confirmations
   */
  fastify.get(
    '/confirmations',
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
          vendor: { orgId: user.orgId },
        };

        if (status) {
          where.status = status;
        }

        if (vendorId) {
          where.vendorId = vendorId;
        }

        const [confirmations, total] = await Promise.all([
          prisma.vendorLedgerConfirmation.findMany({
            where,
            include: {
              vendor: {
                select: {
                  id: true,
                  name: true,
                  gstin: true,
                  email: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: limit,
          }),
          prisma.vendorLedgerConfirmation.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: {
            confirmations,
            total,
            limit,
            offset,
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'List confirmations error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to list confirmations',
        });
      }
    }
  );

  /**
   * GET /api/vendor-ledger/stats
   * Get ledger confirmation statistics
   */
  fastify.get(
    '/stats',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;

        const stats = await ledgerConfirmationService.getConfirmationStats(user.orgId);

        return reply.send({
          success: true,
          data: stats,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get confirmation stats error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get confirmation stats',
        });
      }
    }
  );

  /**
   * POST /api/vendor-ledger/respond/:id
   * Record vendor response to confirmation
   */
  fastify.post(
    '/respond/:id',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const { id } = request.params as { id: string };
        const body = z
          .object({
            vendorBalance: z.number(),
            responseNotes: z.string().optional().default(''),
          })
          .parse(request.body);

        await ledgerConfirmationService.recordVendorResponse(
          id,
          body.vendorBalance,
          body.responseNotes,
          user.orgId
        );

        return reply.send({
          success: true,
          data: { message: 'Response recorded successfully' },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: 'Validation failed',
            details: error.errors,
          });
        }

        fastify.log.error({ error }, 'Record response error');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to record response',
        });
      }
    }
  );

  /**
   * POST /api/vendor-ledger/send/:id
   * Send confirmation email
   */
  fastify.post(
    '/send/:id',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const { id } = request.params as { id: string };

        await ledgerConfirmationService.sendConfirmationEmail(id, user.orgId);

        return reply.send({
          success: true,
          data: { message: 'Email sent successfully' },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Send email error');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to send email',
        });
      }
    }
  );
}
