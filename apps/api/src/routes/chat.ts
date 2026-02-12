import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { getChatOrchestrator } from '../services/chat-orchestrator';
import { uploadFile } from '../services/file-storage-local';
import { parsePDF } from '../services/parsers/pdf-parser';
import { parseExcel } from '../services/parsers/excel-parser';
import { parseImage } from '../services/parsers/image-parser';
import { classifyDocument } from '../services/document-classifier';
import logger from '../lib/logger';
import * as path from 'path';

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

        logger.info({ userId: user.userId, orgId: user.orgId }, 'Creating conversation');

        const conversation = await orchestrator.createConversation(
          user.orgId,
          user.userId
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
          user.userId
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
          where: { id, orgId: user.orgId, userId: user.userId }
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

        await orchestrator.deleteConversation(id, user.orgId, user.userId);

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
    async (request, reply) => {
      try {
        // Manual authentication for SSE (EventSource doesn't support headers)
        const query = request.query as any;
        let token = request.cookies.token || query.token;

        if (!token) {
          const authHeader = request.headers.authorization;
          if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
          }
        }

        if (!token) {
          return reply.code(401).send({ success: false, error: 'Authentication required' });
        }

        // Verify token
        let user: any;
        try {
          user = await request.jwtVerify({ onlyCookie: false });
        } catch (err) {
          // If cookie verification fails, try with the token
          try {
            user = fastify.jwt.verify(token);
          } catch (e) {
            return reply.code(401).send({ success: false, error: 'Invalid token' });
          }
        }

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
          where: { id: conversationId, orgId: user.orgId, userId: user.userId }
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
          user.userId
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
            uploadedBy: user.userId,
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

  /**
   * POST /api/chat/upload-and-process
   * Upload file, parse, and classify in one step (for AI-native workflow)
   */
  fastify.post(
    '/upload-and-process',
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

        logger.info({
          fileName: data.filename,
          mimeType: data.mimetype,
          size: buffer.length
        }, 'Processing file upload');

        // Validate MIME type
        const ACCEPTED_MIME_TYPES = [
          'application/pdf',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/csv',
          'image/jpeg',
          'image/png',
          'image/jpg'
        ];

        if (!ACCEPTED_MIME_TYPES.includes(data.mimetype)) {
          logger.warn({ mimeType: data.mimetype }, 'Unsupported file type');
          return reply.code(400).send({
            success: false,
            error: `Unsupported file type: ${data.mimetype}. Accepted types: PDF, Excel, CSV, Images`
          });
        }

        // Validate file size (25MB max)
        if (buffer.length > 26214400) {
          return reply.code(400).send({
            success: false,
            error: 'File too large. Maximum size is 25MB'
          });
        }

        logger.info({
          fileName: data.filename,
          mimeType: data.mimetype,
          size: buffer.length,
          orgId: user.orgId
        }, 'Processing file upload');

        // Upload to storage
        const uploadResult = await uploadFile({
          file: buffer,
          fileName: data.filename,
          mimeType: data.mimetype,
          fileSize: buffer.length,
          orgId: user.orgId,
          documentType: 'OTHER', // Will be classified
          uploadedBy: user.userId
        });

        // Parse file based on MIME type
        let extractedText = '';
        let metadata: any = {};

        try {
          if (data.mimetype === 'application/pdf') {
            const pdfResult = await parsePDF(buffer);
            extractedText = pdfResult.rawText;
            metadata = { pageCount: pdfResult.pageCount, ...pdfResult.metadata };
          } else if (data.mimetype.includes('excel') || data.mimetype === 'text/csv' ||
                     data.mimetype.includes('spreadsheet')) {
            const excelResult = await parseExcel(buffer, data.mimetype);
            extractedText = excelResult.rawText;
            metadata = { sheets: excelResult.sheets.length };
          } else if (data.mimetype.startsWith('image/')) {
            const imageResult = await parseImage(buffer);
            extractedText = imageResult.rawText || '';
            metadata = imageResult.metadata;
          }
        } catch (parseError) {
          logger.warn({ error: parseError, mimeType: data.mimetype }, 'File parsing failed');
          // Continue with empty text - classification will handle it
        }

        // Classify document
        let classification = { documentType: 'OTHER', confidence: 0.5, reasoning: 'Unknown type' };
        if (extractedText && extractedText.length > 10) {
          try {
            classification = await classifyDocument(extractedText);
          } catch (classifyError) {
            logger.warn({ error: classifyError }, 'Classification failed');
          }
        }

        // Update uploaded file with extracted text and classification
        await prisma.uploadedFile.update({
          where: { id: uploadResult.id },
          data: {
            extractedText: extractedText.substring(0, 50000), // Store first 50k chars
            documentType: classification.documentType,
            processingStatus: 'PENDING' // Will be updated to COMPLETED after extraction
          }
        });

        logger.info({
          fileId: uploadResult.id,
          documentType: classification.documentType,
          confidence: classification.confidence
        }, 'File uploaded and classified');

        return reply.send({
          success: true,
          data: {
            file_id: uploadResult.id,
            file_name: data.filename,
            file_size: buffer.length,
            mime_type: data.mimetype,
            document_type: classification.documentType,
            confidence: classification.confidence,
            reasoning: classification.reasoning,
            extracted_text_preview: extractedText.substring(0, 200),
            metadata
          }
        });
      } catch (error) {
        logger.error({ error }, 'Upload and process error');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to process file'
        });
      }
    }
  );

  /**
   * GET /api/chat/file-status/:fileId
   * Check processing status of an uploaded file
   */
  fastify.get(
    '/file-status/:fileId',
    {
      onRequest: [fastify.authenticate]
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const { fileId } = request.params as { fileId: string };

        const file = await prisma.uploadedFile.findFirst({
          where: {
            id: fileId,
            orgId: user.orgId
          }
        });

        if (!file) {
          return reply.code(404).send({
            success: false,
            error: 'File not found'
          });
        }

        return reply.send({
          success: true,
          data: {
            file_id: file.id,
            file_name: file.originalName,
            status: file.processingStatus,
            document_type: file.documentType,
            has_extracted_data: !!file.aiExtractionResult,
            uploaded_at: file.createdAt
          }
        });
      } catch (error) {
        logger.error({ error }, 'File status error');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get file status'
        });
      }
    }
  );
}
