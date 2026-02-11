import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { paymentReminderService } from '../services/payment-reminder';
import logger from '../lib/logger';

export default async function paymentRemindersRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/payment-reminders/generate
   * Generate payment reminders for overdue invoices
   */
  fastify.post(
    '/generate',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;

        const result = await paymentReminderService.generateReminders(user.orgId);

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Generate reminders error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to generate reminders',
        });
      }
    }
  );

  /**
   * GET /api/payment-reminders
   * List payment reminders
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
        const customerId = query.customerId;

        const where: any = {
          customer: { orgId: user.orgId },
        };

        if (status) {
          where.status = status;
        }

        if (customerId) {
          where.customerId = customerId;
        }

        const [reminders, total] = await Promise.all([
          prisma.paymentReminder.findMany({
            where,
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
              salesInvoice: {
                select: {
                  id: true,
                  invoiceNumber: true,
                  invoiceDate: true,
                  dueDate: true,
                  totalWithGst: true,
                  amountReceived: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: limit,
          }),
          prisma.paymentReminder.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: {
            reminders,
            total,
            limit,
            offset,
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'List reminders error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to list reminders',
        });
      }
    }
  );

  /**
   * GET /api/payment-reminders/stats
   * Get reminder statistics
   */
  fastify.get(
    '/stats',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;

        const stats = await paymentReminderService.getReminderStats(user.orgId);

        return reply.send({
          success: true,
          data: stats,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get reminder stats error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get reminder stats',
        });
      }
    }
  );

  /**
   * GET /api/payment-reminders/overdue
   * Get overdue summary
   */
  fastify.get(
    '/overdue',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;

        const summary = await paymentReminderService.getOverdueSummary(user.orgId);

        return reply.send({
          success: true,
          data: summary,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get overdue summary error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get overdue summary',
        });
      }
    }
  );

  /**
   * POST /api/payment-reminders/send/:id
   * Send payment reminder email
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

        await paymentReminderService.sendReminder(id, user.orgId);

        return reply.send({
          success: true,
          data: { message: 'Reminder sent successfully' },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Send reminder error');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to send reminder',
        });
      }
    }
  );

  /**
   * PUT /api/payment-reminders/:id/status
   * Update reminder status
   */
  fastify.put(
    '/:id/status',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const { id } = request.params as { id: string };
        const body = z
          .object({
            status: z.enum(['PENDING', 'SENT', 'PAYMENT_RECEIVED', 'ESCALATED']),
          })
          .parse(request.body);

        // Verify reminder belongs to org
        const existing = await prisma.paymentReminder.findFirst({
          where: {
            id,
            customer: { orgId: user.orgId },
          },
        });

        if (!existing) {
          return reply.code(404).send({
            success: false,
            error: 'Reminder not found',
          });
        }

        const reminder = await prisma.paymentReminder.update({
          where: { id },
          data: { status: body.status },
        });

        return reply.send({
          success: true,
          data: reminder,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: 'Validation failed',
            details: error.errors,
          });
        }

        fastify.log.error({ error }, 'Update reminder status error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to update reminder status',
        });
      }
    }
  );
}
