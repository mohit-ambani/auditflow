import { Worker, Job } from 'bullmq';
import { documentQueue } from '../lib/bullmq';
import { redis } from '../lib/redis';
import logger from '../lib/logger';
import { getPresignedUrl } from '../services/file-storage';
import { parsePDF } from '../services/parsers/pdf-parser';
import { parseExcel, parseCSV, detectGSTReturnType, parseGSTR2, parseBankStatement } from '../services/parsers/excel-parser';
import { parseImage } from '../services/parsers/image-parser';
import { classifyDocument } from '../services/document-classifier';
import {
  extractPurchaseOrder,
  extractPurchaseInvoice,
  extractSalesInvoice,
  extractBankStatement,
  extractGenericDocument,
  calculateConfidence,
  needsManualReview,
} from '../services/ai-extractor';
import { validateExtractedData } from '../services/validator';
import { prisma } from '../lib/prisma';
import fetch from 'node-fetch';

interface DocumentJobData {
  fileId: string;
  orgId: string;
}

/**
 * Process document: Parse → Extract → Validate → Save
 */
async function processDocument(job: Job<DocumentJobData>) {
  const { fileId, orgId } = job.data;

  logger.info({ fileId, orgId }, 'Starting document processing');

  try {
    // Update status to PROCESSING
    await prisma.uploadedFile.update({
      where: { id: fileId },
      data: { processingStatus: 'PROCESSING' },
    });

    // 1. Get file metadata
    const file = await prisma.uploadedFile.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new Error('File not found');
    }

    // 2. Download file from S3
    const downloadUrl = await getPresignedUrl(file.storagePath);
    const response = await fetch(downloadUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    // 3. Parse file based on type
    let parsedText = '';
    let parsedData: any = null;

    if (file.mimeType === 'application/pdf') {
      const result = await parsePDF(buffer);
      parsedText = result.rawText;
      parsedData = result;
    } else if (
      file.mimeType === 'application/vnd.ms-excel' ||
      file.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      const result = await parseExcel(buffer, file.mimeType);
      parsedText = result.rawText;
      parsedData = result;
    } else if (file.mimeType === 'text/csv') {
      const result = await parseCSV(buffer);
      parsedText = result.rawText;
      parsedData = result;
    } else if (file.mimeType.startsWith('image/')) {
      const result = await parseImage(buffer);
      parsedText = result.rawText;
      parsedData = result;
    }

    if (!parsedText || parsedText.trim().length === 0) {
      throw new Error('No text extracted from document');
    }

    // Update file with extracted text
    await prisma.uploadedFile.update({
      where: { id: fileId },
      data: { extractedText: parsedText },
    });

    // 4. Classify document (if type is OTHER or not set)
    let documentType = file.documentType;
    let classificationConfidence = 1.0;

    if (documentType === 'OTHER' || !documentType) {
      const classification = await classifyDocument(parsedText);
      documentType = classification.documentType as any;
      classificationConfidence = classification.confidence;

      logger.info(
        { fileId, documentType, confidence: classificationConfidence },
        'Document classified'
      );
    }

    // 5. Extract structured data based on document type
    let extractedData: any = {};
    let extractionConfidence = 0;

    switch (documentType) {
      case 'PURCHASE_ORDER':
        extractedData = await extractPurchaseOrder(parsedText);
        break;

      case 'PURCHASE_INVOICE':
        extractedData = await extractPurchaseInvoice(parsedText);
        break;

      case 'SALES_INVOICE':
        extractedData = await extractSalesInvoice(parsedText);
        break;

      case 'BANK_STATEMENT':
        // Check if it's already parsed Excel
        if (parsedData && parsedData.sheets) {
          // Try to extract from Excel structure first
          const sheet = parsedData.sheets[0];
          const transactions = parseBankStatement(sheet);
          if (transactions.length > 0) {
            extractedData = {
              transactions,
              bank_name: null,
              account_number: null,
            };
          } else {
            // Fall back to AI extraction
            extractedData = await extractBankStatement(parsedText);
          }
        } else {
          extractedData = await extractBankStatement(parsedText);
        }
        break;

      case 'GST_RETURN':
        // For GST returns, parse Excel structure
        if (parsedData && parsedData.sheets) {
          const gstType = detectGSTReturnType(parsedData);
          if (gstType === 'GSTR2A' || gstType === 'GSTR2B') {
            const sheet = parsedData.sheets[0];
            const entries = parseGSTR2(sheet);
            extractedData = {
              return_type: gstType,
              entries,
            };
          } else {
            extractedData = await extractGenericDocument(parsedText, 'GST_RETURN');
          }
        } else {
          extractedData = await extractGenericDocument(parsedText, 'GST_RETURN');
        }
        break;

      default:
        extractedData = await extractGenericDocument(parsedText, documentType);
        break;
    }

    // 6. Calculate confidence
    extractionConfidence = calculateConfidence(extractedData);
    const overallConfidence = (classificationConfidence + extractionConfidence) / 2;

    logger.info(
      { fileId, extractionConfidence, overallConfidence },
      'Data extracted'
    );

    // 7. Validate extracted data
    const validation = validateExtractedData(documentType, extractedData);

    logger.info(
      { fileId, valid: validation.valid, errors: validation.errors },
      'Data validated'
    );

    // 8. Determine if manual review needed
    const manualReview = needsManualReview(extractedData, overallConfidence);

    // 9. Save results to database
    await prisma.uploadedFile.update({
      where: { id: fileId },
      data: {
        documentType,
        aiExtractionResult: {
          ...extractedData,
          _metadata: {
            classificationConfidence,
            extractionConfidence,
            overallConfidence,
            validation,
          },
        },
        aiConfidence: overallConfidence,
        manualReview,
        processingStatus: 'COMPLETED',
      },
    });

    logger.info({ fileId, manualReview }, 'Document processing completed');

    return {
      fileId,
      documentType,
      extractedData,
      confidence: overallConfidence,
      manualReview,
      validation,
    };
  } catch (error) {
    logger.error({ error, fileId }, 'Document processing failed');

    // Update status to FAILED
    await prisma.uploadedFile.update({
      where: { id: fileId },
      data: {
        processingStatus: 'FAILED',
        aiExtractionResult: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      },
    });

    throw error;
  }
}

/**
 * Create and start document processing worker
 */
export function startDocumentWorker() {
  const worker = new Worker<DocumentJobData>(
    'document-processing',
    async (job) => {
      return await processDocument(job);
    },
    {
      connection: redis,
      concurrency: 2, // Process 2 documents concurrently
      limiter: {
        max: 10, // Max 10 jobs
        duration: 60000, // per minute
      },
    }
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Document processing job completed');
  });

  worker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, error }, 'Document processing job failed');
  });

  worker.on('error', (error) => {
    logger.error({ error }, 'Document worker error');
  });

  logger.info('Document processing worker started');

  return worker;
}

/**
 * Add document to processing queue
 */
export async function queueDocumentProcessing(fileId: string, orgId: string) {
  await documentQueue.add(
    'process-document',
    { fileId, orgId },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    }
  );

  logger.info({ fileId, orgId }, 'Document queued for processing');
}
