import { PrismaClient } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';
import { parsePDF } from './parsers/pdf-parser';
import { parseExcel } from './parsers/excel-parser';
import { parseImage } from './parsers/image-parser';
import { classifyDocument } from './document-classifier';
import { extractPurchaseInvoice, extractBankStatement, extractPurchaseOrder, extractGSTR } from './ai-extractor';
import logger from '../lib/logger';

interface BatchProcessResult {
  fileId: string;
  fileName: string;
  success: boolean;
  documentType?: string;
  confidence?: number;
  extractedData?: any;
  error?: string;
}

export interface BatchProcessProgress {
  total: number;
  processed: number;
  current: string;
  stage: 'parsing' | 'classifying' | 'extracting' | 'complete';
  results: BatchProcessResult[];
}

/**
 * Process multiple files sequentially with progress events
 */
export async function* processBatchFiles(
  fileIds: string[],
  prisma: PrismaClient,
  orgId: string
): AsyncGenerator<BatchProcessProgress> {
  const results: BatchProcessResult[] = [];
  let processed = 0;

  for (const fileId of fileIds) {
    try {
      // Fetch file from database
      const uploadedFile = await prisma.uploadedFile.findFirst({
        where: { id: fileId, orgId }
      });

      if (!uploadedFile) {
        results.push({
          fileId,
          fileName: 'Unknown',
          success: false,
          error: 'File not found'
        });
        processed++;
        continue;
      }

      // Yield parsing progress
      yield {
        total: fileIds.length,
        processed,
        current: uploadedFile.originalName,
        stage: 'parsing',
        results: [...results]
      };

      // Read file from storage
      const filePath = path.join(process.cwd(), 'uploads', uploadedFile.storagePath);
      const fileBuffer = await fs.readFile(filePath);

      // Parse based on MIME type
      let extractedText = '';
      try {
        if (uploadedFile.mimeType === 'application/pdf') {
          const pdfResult = await parsePDF(fileBuffer);
          extractedText = pdfResult.rawText;
        } else if (uploadedFile.mimeType.includes('excel') ||
                   uploadedFile.mimeType === 'text/csv' ||
                   uploadedFile.mimeType.includes('spreadsheet')) {
          const excelResult = await parseExcel(fileBuffer, uploadedFile.mimeType);
          extractedText = excelResult.rawText;
        } else if (uploadedFile.mimeType.startsWith('image/')) {
          const imageResult = await parseImage(fileBuffer);
          extractedText = imageResult.rawText || '';
        }
      } catch (parseError) {
        logger.warn({ error: parseError, fileId }, 'Failed to parse file in batch');
        results.push({
          fileId,
          fileName: uploadedFile.originalName,
          success: false,
          error: `Parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
        });
        processed++;
        continue;
      }

      // Yield classification progress
      yield {
        total: fileIds.length,
        processed,
        current: uploadedFile.originalName,
        stage: 'classifying',
        results: [...results]
      };

      // Classify document
      let classification = { documentType: 'OTHER', confidence: 0.5, reasoning: 'Unknown' };
      if (extractedText && extractedText.length > 10) {
        try {
          classification = await classifyDocument(extractedText);
        } catch (classifyError) {
          logger.warn({ error: classifyError, fileId }, 'Classification failed in batch');
        }
      }

      // Update file with classification
      await prisma.uploadedFile.update({
        where: { id: fileId },
        data: {
          extractedText: extractedText.substring(0, 50000),
          documentType: classification.documentType,
          processingStatus: 'PENDING'
        }
      });

      // Yield extraction progress
      yield {
        total: fileIds.length,
        processed,
        current: uploadedFile.originalName,
        stage: 'extracting',
        results: [...results]
      };

      // Extract structured data
      let extractedData: any = null;
      let arithmeticVerified = false;

      try {
        switch (classification.documentType) {
          case 'PURCHASE_INVOICE':
            extractedData = await extractPurchaseInvoice(extractedText);
            arithmeticVerified = extractedData?.arithmetic_verified || false;
            break;
          case 'PURCHASE_ORDER':
            extractedData = await extractPurchaseOrder(extractedText);
            break;
          case 'BANK_STATEMENT':
            extractedData = await extractBankStatement(extractedText);
            break;
          case 'GSTR1':
          case 'GSTR2A':
          case 'GSTR3B':
            extractedData = await extractGSTR(extractedText, classification.documentType);
            break;
        }
      } catch (extractError) {
        logger.warn({ error: extractError, fileId, documentType: classification.documentType }, 'Extraction failed in batch');
      }

      // Update file with extraction result
      if (extractedData) {
        await prisma.uploadedFile.update({
          where: { id: fileId },
          data: {
            aiExtractionResult: extractedData,
            processingStatus: 'COMPLETED'
          }
        });
      }

      // Add result
      results.push({
        fileId,
        fileName: uploadedFile.originalName,
        success: true,
        documentType: classification.documentType,
        confidence: classification.confidence,
        extractedData: extractedData ? {
          ...extractedData,
          arithmetic_verified: arithmeticVerified
        } : null
      });

      processed++;

    } catch (error) {
      logger.error({ error, fileId }, 'Batch processing error');
      results.push({
        fileId,
        fileName: 'Unknown',
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed'
      });
      processed++;
    }
  }

  // Yield final result
  yield {
    total: fileIds.length,
    processed,
    current: '',
    stage: 'complete',
    results
  };
}

/**
 * Process batch synchronously (non-streaming version)
 */
export async function processBatchFilesSync(
  fileIds: string[],
  prisma: PrismaClient,
  orgId: string
): Promise<BatchProcessResult[]> {
  const results: BatchProcessResult[] = [];

  for await (const progress of processBatchFiles(fileIds, prisma, orgId)) {
    if (progress.stage === 'complete') {
      return progress.results;
    }
  }

  return results;
}
