import { prisma } from '../lib/prisma';
import { randomBytes } from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import logger from '../lib/logger';

export interface UploadFileParams {
  file: Buffer;
  fileName: string;
  mimeType: string;
  fileSize: number;
  orgId: string;
  documentType: string;
  uploadedBy: string;
}

export interface UploadFileResult {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  documentType: string;
  uploadUrl?: string;
}

// Base upload directory
const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

/**
 * Ensure upload directory exists
 */
async function ensureUploadDir(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Generate a unique file path
 * Format: {orgId}/{documentType}/{year}/{month}/{randomId}_{fileName}
 */
function generateFilePath(
  orgId: string,
  documentType: string,
  fileName: string
): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const randomId = randomBytes(8).toString('hex');
  const ext = path.extname(fileName);
  const baseName = path.basename(fileName, ext);
  const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const uniqueFileName = `${randomId}_${sanitizedBaseName}${ext}`;

  return `${orgId}/${documentType}/${year}/${month}/${uniqueFileName}`;
}

/**
 * Upload a file to local filesystem
 */
export async function uploadFile(params: UploadFileParams): Promise<UploadFileResult> {
  const { file, fileName, mimeType, fileSize, orgId, documentType, uploadedBy } = params;

  try {
    // Generate storage path
    const storagePath = generateFilePath(orgId, documentType, fileName);
    const fullPath = path.join(UPLOAD_BASE_DIR, storagePath);

    // Ensure directory exists
    const dirPath = path.dirname(fullPath);
    await ensureUploadDir(dirPath);

    // Write file to disk
    await fs.writeFile(fullPath, file);

    logger.info({ storagePath, fileSize }, 'File uploaded to local storage');

    // Create database record
    const uploadedFile = await prisma.uploadedFile.create({
      data: {
        orgId,
        fileName: path.basename(storagePath),
        originalName: fileName,
        mimeType,
        fileSize,
        storagePath,
        documentType: documentType as any,
        uploadedBy,
        processingStatus: 'PENDING',
      },
    });

    return {
      id: uploadedFile.id,
      fileName: uploadedFile.fileName,
      originalName: uploadedFile.originalName,
      mimeType: uploadedFile.mimeType,
      fileSize: uploadedFile.fileSize,
      storagePath: uploadedFile.storagePath,
      documentType: uploadedFile.documentType,
    };
  } catch (error) {
    logger.error({ error, fileName }, 'Failed to upload file');
    throw new Error('Failed to upload file to storage');
  }
}

/**
 * Generate a local file URL for downloading
 * Returns a path that can be served via static file server
 */
export async function getPresignedUrl(storagePath: string): Promise<string> {
  try {
    const fullPath = path.join(UPLOAD_BASE_DIR, storagePath);

    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch {
      throw new Error('File not found');
    }

    // Return URL path (will be served by /api/uploads/:id/download endpoint)
    return `/api/uploads/file/${encodeURIComponent(storagePath)}`;
  } catch (error) {
    logger.error({ error, storagePath }, 'Failed to generate file URL');
    throw new Error('Failed to generate download URL');
  }
}

/**
 * Get file from local storage (for serving via endpoint)
 */
export async function getFileBuffer(storagePath: string): Promise<Buffer> {
  try {
    const fullPath = path.join(UPLOAD_BASE_DIR, storagePath);
    return await fs.readFile(fullPath);
  } catch (error) {
    logger.error({ error, storagePath }, 'Failed to read file');
    throw new Error('File not found');
  }
}

/**
 * Delete a file from local filesystem
 */
export async function deleteFile(storagePath: string): Promise<void> {
  try {
    const fullPath = path.join(UPLOAD_BASE_DIR, storagePath);
    await fs.unlink(fullPath);
    logger.info({ storagePath }, 'File deleted from local storage');
  } catch (error) {
    logger.error({ error, storagePath }, 'Failed to delete file');
    throw new Error('Failed to delete file from storage');
  }
}

/**
 * Get file metadata from database
 */
export async function getFileMetadata(fileId: string, orgId: string) {
  const file = await prisma.uploadedFile.findFirst({
    where: {
      id: fileId,
      orgId,
    },
  });

  if (!file) {
    throw new Error('File not found');
  }

  return file;
}

/**
 * List files for an organization
 */
export async function listFiles(
  orgId: string,
  options?: {
    documentType?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }
) {
  const { documentType, limit = 50, offset = 0, search } = options || {};

  const where: any = { orgId };

  if (documentType) {
    where.documentType = documentType;
  }

  if (search) {
    where.OR = [
      { originalName: { contains: search, mode: 'insensitive' } },
      { fileName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [files, total] = await Promise.all([
    prisma.uploadedFile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.uploadedFile.count({ where }),
  ]);

  return {
    files,
    total,
    limit,
    offset,
    hasMore: offset + files.length < total,
  };
}

/**
 * Update file processing status
 */
export async function updateFileStatus(
  fileId: string,
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
  extractedText?: string,
  aiExtractionResult?: any
) {
  return prisma.uploadedFile.update({
    where: { id: fileId },
    data: {
      processingStatus: status,
      ...(extractedText && { extractedText }),
      ...(aiExtractionResult && { aiExtractionResult }),
    },
  });
}
