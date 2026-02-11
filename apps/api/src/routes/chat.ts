import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { getChatOrchestrator } from '../services/chat-orchestrator';
import logger from '../lib/logger';

export default async function chatRoutes(fastify: FastifyInstance) {
  const orchestrator = getChatOrchestrator(prisma);

  /**
   * POST /api/chat/conversations
   * Create a new conversation
   */
  fastify.post(
    '/conversations',
    {
      onRequest: [fastify.authenticate]
    },
    async (request, reply) => {
      try {
        const user = request.user as any;

        const conversation = await orchestrator.createConversation(
          user.orgId,
          user.id
        );

        return reply.send({
          success: true,
          data: conversation
        });
      } catch (error) {
        logger.error({ error }, 'Create conversation error');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create conversation'
        });
      }
    }
  );

  /**
   * GET /api/chat/conversations
   * List all conversations for the user
   */
  fastify.get(
    '/conversations',
    {
      onRequest: [fastify.authenticate]
    },
    async (request, reply) => {
      try {
        const user = request.user as any;

        const conversations = await orchestrator.getConversations(
          user.orgId,
          user.id
        );

        return reply.send({
          success: true,
          data: conversations
        });
      } catch (error) {
        logger.error({ error }, 'List conversations error');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list conversations'
        });
      }
    }
  );

  /**
   * GET /api/chat/conversations/:id
   * Get conversation history
   */
  fastify.get(
    '/conversations/:id',
    {
      onRequest: [fastify.authenticate]
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const { id } = request.params as { id: string };

        // Verify conversation belongs to user
        const conversation = await prisma.chatConversation.findFirst({
          where: { id, orgId: user.orgId, userId: user.id }
        });

        if (!conversation) {
          return reply.code(404).send({
            success: false,
            error: 'Conversation not found'
          });
        }

        const history = await orchestrator.getConversationHistory(id, 100);

        return reply.send({
          success: true,
          data: {
            conversation,
            messages: history
          }
        });
      } catch (error) {
        logger.error({ error }, 'Get conversation error');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get conversation'
        });
      }
    }
  );

  /**
   * DELETE /api/chat/conversations/:id
   * Delete a conversation
   */
  fastify.delete(
    '/conversations/:id',
    {
      onRequest: [fastify.authenticate]
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const { id } = request.params as { id: string };

        await orchestrator.deleteConversation(id, user.orgId, user.id);

        return reply.send({
          success: true,
          message: 'Conversation deleted'
        });
      } catch (error) {
        logger.error({ error }, 'Delete conversation error');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete conversation'
        });
      }
    }
  );

  /**
   * GET /api/chat/stream
   * Server-Sent Events endpoint for streaming chat responses
   */
  fastify.get(
    '/stream',
    {
      onRequest: [fastify.authenticate]
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const query = request.query as any;
        const conversationId = query.conversation_id;
        const message = query.message;
        const fileIds = query.file_ids ? query.file_ids.split(',') : [];

        if (!conversationId || !message) {
          return reply.code(400).send({
            success: false,
            error: 'conversation_id and message are required'
          });
        }

        // Verify conversation belongs to user
        const conversation = await prisma.chatConversation.findFirst({
          where: { id: conversationId, orgId: user.orgId, userId: user.id }
        });

        if (!conversation) {
          return reply.code(404).send({
            success: false,
            error: 'Conversation not found'
          });
        }

        // Set up SSE
        reply.raw.setHeader('Content-Type', 'text/event-stream');
        reply.raw.setHeader('Cache-Control', 'no-cache');
        reply.raw.setHeader('Connection', 'keep-alive');
        reply.raw.setHeader('Access-Control-Allow-Origin', '*');

        // Stream response
        for await (const chunk of orchestrator.sendMessage(
          conversationId,
          message,
          fileIds,
          user.orgId,
          user.id
        )) {
          reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }

        reply.raw.end();
      } catch (error) {
        logger.error({ error }, 'Stream chat error');
        const errorChunk = {
          type: 'error',
          error: error instanceof Error ? error.message : 'Stream error'
        };
        reply.raw.write(`data: ${JSON.stringify(errorChunk)}\n\n`);
        reply.raw.end();
      }
    }
  );

  /**
   * POST /api/chat/upload
   * Upload file for chat context
   */
  fastify.post(
    '/upload',
    {
      onRequest: [fastify.authenticate]
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const data = await request.file();

        if (!data) {
          return reply.code(400).send({
            success: false,
            error: 'No file uploaded'
          });
        }

        const buffer = await data.toBuffer();
        const fileName = `chat-${Date.now()}-${data.filename}`;

        // For now, store metadata only (implement S3 upload similar to uploads route)
        const uploadedFile = await prisma.uploadedFile.create({
          data: {
            orgId: user.orgId,
            fileName,
            originalName: data.filename,
            mimeType: data.mimetype,
            fileSize: buffer.length,
            storagePath: fileName, // TODO: Upload to S3
            documentType: 'OTHER',
            processingStatus: 'PENDING',
            uploadedBy: user.id,
            extractedText: buffer.toString('utf-8') // Simplified - use proper OCR/PDF extraction
          }
        });

        return reply.send({
          success: true,
          data: {
            file_id: uploadedFile.id,
            file_name: data.filename,
            file_size: buffer.length,
            mime_type: data.mimetype
          }
        });
      } catch (error) {
        logger.error({ error }, 'File upload error');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to upload file'
        });
      }
    }
  );
}
