import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  uploadFile,
  getPresignedUrl,
  deleteFile,
  getFileMetadata,
  listFiles,
} from '../services/file-storage';
import { prisma } from '../lib/prisma';

const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'image/jpeg',
  'image/png',
];

const MAX_FILE_SIZE = 26214400; // 25MB
const MAX_FILES = 10;

export default async function uploadsRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/uploads
   * Upload one or more files
   */
  fastify.post(
    '/',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const parts = request.parts();
        const uploads: any[] = [];
        let documentType = 'OTHER';
        let fileCount = 0;

        for await (const part of parts) {
          if (part.type === 'field') {
            // Handle form fields
            if (part.fieldname === 'documentType') {
              documentType = part.value as string;
            }
          } else if (part.type === 'file') {
            // Handle file upload
            fileCount++;

            if (fileCount > MAX_FILES) {
              return reply.code(400).send({
                success: false,
                error: `Maximum ${MAX_FILES} files allowed per upload`,
              });
            }

            // Read file buffer
            const buffer = await part.toBuffer();
            const fileSize = buffer.length;

            // Validate file size
            if (fileSize > MAX_FILE_SIZE) {
              return reply.code(400).send({
                success: false,
                error: `File ${part.filename} exceeds maximum size of 25MB`,
              });
            }

            // Validate MIME type
            if (!ACCEPTED_MIME_TYPES.includes(part.mimetype)) {
              return reply.code(400).send({
                success: false,
                error: `File type ${part.mimetype} is not supported`,
              });
            }

            // Upload to S3 and create DB record
            const result = await uploadFile({
              file: buffer,
              fileName: part.filename,
              mimeType: part.mimetype,
              fileSize,
              orgId: user.orgId,
              documentType,
              uploadedBy: user.userId,
            });

            // Generate presigned URL for immediate access
            const downloadUrl = await getPresignedUrl(result.storagePath);

            uploads.push({
              ...result,
              downloadUrl,
            });
          }
        }

        if (uploads.length === 0) {
          return reply.code(400).send({
            success: false,
            error: 'No files were uploaded',
          });
        }

        return reply.send({
          success: true,
          data: {
            uploads,
            count: uploads.length,
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'File upload error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to upload files',
        });
      }
    }
  );

  /**
   * GET /api/uploads
   * List uploaded files with filters
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

        const result = await listFiles(user.orgId, {
          documentType: query.documentType,
          limit: parseInt(query.limit || '50'),
          offset: parseInt(query.offset || '0'),
          search: query.search,
        });

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        fastify.log.error({ error }, 'List files error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to list files',
        });
      }
    }
  );

  /**
   * GET /api/uploads/:id
   * Get file metadata
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

        const file = await getFileMetadata(id, user.orgId);

        return reply.send({
          success: true,
          data: file,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get file metadata error');
        return reply.code(404).send({
          success: false,
          error: 'File not found',
        });
      }
    }
  );

  /**
   * GET /api/uploads/:id/download
   * Get presigned download URL
   */
  fastify.get(
    '/:id/download',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const { id } = request.params as { id: string };

        const file = await getFileMetadata(id, user.orgId);
        const downloadUrl = await getPresignedUrl(file.storagePath);

        return reply.send({
          success: true,
          data: {
            downloadUrl,
            fileName: file.originalName,
            mimeType: file.mimeType,
            fileSize: file.fileSize,
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Generate download URL error');
        return reply.code(404).send({
          success: false,
          error: 'File not found',
        });
      }
    }
  );

  /**
   * DELETE /api/uploads/:id
   * Delete a file
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

        // Get file metadata
        const file = await getFileMetadata(id, user.orgId);

        // Delete from S3
        await deleteFile(file.storagePath);

        // Delete from database
        await prisma.uploadedFile.delete({
          where: { id },
        });

        return reply.send({
          success: true,
          data: { message: 'File deleted successfully' },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Delete file error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to delete file',
        });
      }
    }
  );

  /**
   * GET /api/uploads/stats
   * Get upload statistics
   */
  fastify.get(
    '/stats',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as any;

        const [totalFiles, totalSize, byType] = await Promise.all([
          prisma.uploadedFile.count({
            where: { orgId: user.orgId },
          }),
          prisma.uploadedFile.aggregate({
            where: { orgId: user.orgId },
            _sum: { fileSize: true },
          }),
          prisma.uploadedFile.groupBy({
            by: ['documentType'],
            where: { orgId: user.orgId },
            _count: true,
          }),
        ]);

        return reply.send({
          success: true,
          data: {
            totalFiles,
            totalSize: totalSize._sum.fileSize || 0,
            byType: byType.map((item) => ({
              type: item.documentType,
              count: item._count,
            })),
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get upload stats error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get upload statistics',
        });
      }
    }
  );
}
