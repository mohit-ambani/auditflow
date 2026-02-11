import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import logger from '../lib/logger';

const noteTypeSchema = z.enum([
  'CREDIT_NOTE_RECEIVED',
  'DEBIT_NOTE_ISSUED',
  'CREDIT_NOTE_ISSUED',
  'DEBIT_NOTE_RECEIVED',
]);

const createNoteSchema = z.object({
  noteType: noteTypeSchema,
  noteNumber: z.string().min(1),
  noteDate: z.string().datetime(),
  vendorId: z.string().cuid().optional(),
  customerId: z.string().cuid().optional(),
  reason: z.string().optional(),
  originalInvoiceRef: z.string().optional(),
  totalAmount: z.number().min(0),
  cgst: z.number().min(0).optional().default(0),
  sgst: z.number().min(0).optional().default(0),
  igst: z.number().min(0).optional().default(0),
});

export default async function creditDebitNotesRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/credit-debit-notes
   * Create a new credit/debit note
   */
  fastify.post(
    '/',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const body = createNoteSchema.parse(request.body);

        // Validate vendor/customer based on note type
        if (
          (body.noteType === 'CREDIT_NOTE_RECEIVED' ||
            body.noteType === 'DEBIT_NOTE_ISSUED') &&
          !body.vendorId
        ) {
          return reply.code(400).send({
            success: false,
            error: 'vendorId is required for this note type',
          });
        }

        if (
          (body.noteType === 'CREDIT_NOTE_ISSUED' ||
            body.noteType === 'DEBIT_NOTE_RECEIVED') &&
          !body.customerId
        ) {
          return reply.code(400).send({
            success: false,
            error: 'customerId is required for this note type',
          });
        }

        // Verify vendor/customer belongs to org
        if (body.vendorId) {
          const vendor = await prisma.vendor.findFirst({
            where: { id: body.vendorId, orgId: user.orgId },
          });

          if (!vendor) {
            return reply.code(404).send({
              success: false,
              error: 'Vendor not found',
            });
          }
        }

        if (body.customerId) {
          const customer = await prisma.customer.findFirst({
            where: { id: body.customerId, orgId: user.orgId },
          });

          if (!customer) {
            return reply.code(404).send({
              success: false,
              error: 'Customer not found',
            });
          }
        }

        const totalWithGst = body.totalAmount + body.cgst + body.sgst + body.igst;

        const note = await prisma.creditDebitNote.create({
          data: {
            orgId: user.orgId,
            noteType: body.noteType,
            noteNumber: body.noteNumber,
            noteDate: new Date(body.noteDate),
            vendorId: body.vendorId,
            customerId: body.customerId,
            reason: body.reason,
            originalInvoiceRef: body.originalInvoiceRef,
            totalAmount: body.totalAmount,
            cgst: body.cgst,
            sgst: body.sgst,
            igst: body.igst,
            totalWithGst,
            status: 'PENDING',
          },
        });

        logger.info({ noteId: note.id, noteType: note.noteType, orgId: user.orgId }, 'Credit/Debit note created');

        return reply.code(201).send({
          success: true,
          data: note,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: 'Validation failed',
            details: error.errors,
          });
        }

        fastify.log.error({ error }, 'Create note error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to create credit/debit note',
        });
      }
    }
  );

  /**
   * GET /api/credit-debit-notes
   * List credit/debit notes
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
        const noteType = query.noteType;
        const status = query.status;
        const vendorId = query.vendorId;
        const customerId = query.customerId;

        const where: any = { orgId: user.orgId };

        if (noteType) {
          where.noteType = noteType;
        }

        if (status) {
          where.status = status;
        }

        if (vendorId) {
          where.vendorId = vendorId;
        }

        if (customerId) {
          where.customerId = customerId;
        }

        const [notes, total] = await Promise.all([
          prisma.creditDebitNote.findMany({
            where,
            include: {
              vendor: {
                select: {
                  id: true,
                  name: true,
                  gstin: true,
                },
              },
              customer: {
                select: {
                  id: true,
                  name: true,
                  gstin: true,
                },
              },
            },
            orderBy: { noteDate: 'desc' },
            skip: offset,
            take: limit,
          }),
          prisma.creditDebitNote.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: {
            notes,
            total,
            limit,
            offset,
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'List notes error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to list credit/debit notes',
        });
      }
    }
  );

  /**
   * GET /api/credit-debit-notes/stats
   * Get credit/debit notes statistics
   */
  fastify.get(
    '/stats',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;

        const notes = await prisma.creditDebitNote.findMany({
          where: { orgId: user.orgId },
        });

        const stats = {
          total: notes.length,
          creditNotesReceived: 0,
          creditNotesIssued: 0,
          debitNotesReceived: 0,
          debitNotesIssued: 0,
          totalCreditAmount: 0,
          totalDebitAmount: 0,
          pending: 0,
          adjusted: 0,
          disputed: 0,
        };

        for (const note of notes) {
          switch (note.noteType) {
            case 'CREDIT_NOTE_RECEIVED':
              stats.creditNotesReceived++;
              stats.totalCreditAmount += note.totalWithGst;
              break;
            case 'CREDIT_NOTE_ISSUED':
              stats.creditNotesIssued++;
              stats.totalCreditAmount += note.totalWithGst;
              break;
            case 'DEBIT_NOTE_RECEIVED':
              stats.debitNotesReceived++;
              stats.totalDebitAmount += note.totalWithGst;
              break;
            case 'DEBIT_NOTE_ISSUED':
              stats.debitNotesIssued++;
              stats.totalDebitAmount += note.totalWithGst;
              break;
          }

          switch (note.status) {
            case 'PENDING':
              stats.pending++;
              break;
            case 'ADJUSTED':
              stats.adjusted++;
              break;
            case 'DISPUTED':
              stats.disputed++;
              break;
          }
        }

        stats.totalCreditAmount = Math.round(stats.totalCreditAmount * 100) / 100;
        stats.totalDebitAmount = Math.round(stats.totalDebitAmount * 100) / 100;

        return reply.send({
          success: true,
          data: stats,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get notes stats error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get notes statistics',
        });
      }
    }
  );

  /**
   * GET /api/credit-debit-notes/:id
   * Get note details
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

        const note = await prisma.creditDebitNote.findFirst({
          where: {
            id,
            orgId: user.orgId,
          },
          include: {
            vendor: true,
            customer: true,
          },
        });

        if (!note) {
          return reply.code(404).send({
            success: false,
            error: 'Note not found',
          });
        }

        return reply.send({
          success: true,
          data: note,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get note error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get note',
        });
      }
    }
  );

  /**
   * PUT /api/credit-debit-notes/:id/status
   * Update note status
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
            status: z.enum(['PENDING', 'ADJUSTED', 'DISPUTED']),
          })
          .parse(request.body);

        const existing = await prisma.creditDebitNote.findFirst({
          where: {
            id,
            orgId: user.orgId,
          },
        });

        if (!existing) {
          return reply.code(404).send({
            success: false,
            error: 'Note not found',
          });
        }

        const note = await prisma.creditDebitNote.update({
          where: { id },
          data: { status: body.status },
        });

        return reply.send({
          success: true,
          data: note,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: 'Validation failed',
            details: error.errors,
          });
        }

        fastify.log.error({ error }, 'Update note status error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to update note status',
        });
      }
    }
  );
}
