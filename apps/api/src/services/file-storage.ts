import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import s3Client, { S3_BUCKET } from '../lib/s3';
import { prisma } from '../lib/prisma';
import { randomBytes } from 'crypto';
import path from 'path';
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
 * Upload a file to S3/MinIO
 */
export async function uploadFile(params: UploadFileParams): Promise<UploadFileResult> {
  const { file, fileName, mimeType, fileSize, orgId, documentType, uploadedBy } = params;

  try {
    // Generate storage path
    const storagePath = generateFilePath(orgId, documentType, fileName);

    // Upload to S3/MinIO
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: storagePath,
      Body: file,
      ContentType: mimeType,
      Metadata: {
        orgId,
        documentType,
        uploadedBy,
        originalName: fileName,
      },
    });

    await s3Client.send(command);

    logger.info({ storagePath, fileSize }, 'File uploaded to S3');

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
 * Generate a presigned URL for downloading a file
 * URL expires in 1 hour
 */
export async function getPresignedUrl(storagePath: string): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: storagePath,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
    return url;
  } catch (error) {
    logger.error({ error, storagePath }, 'Failed to generate presigned URL');
    throw new Error('Failed to generate download URL');
  }
}

/**
 * Delete a file from S3/MinIO
 */
export async function deleteFile(storagePath: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: storagePath,
    });

    await s3Client.send(command);
    logger.info({ storagePath }, 'File deleted from S3');
  } catch (error) {
    logger.error({ error, storagePath }, 'Failed to delete file from S3');
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
