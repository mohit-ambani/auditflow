import sharp from 'sharp';
import logger from '../../lib/logger';

export interface ImageParseResult {
  rawText: string;
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}

/**
 * Parse image file (JPG, PNG)
 * Preprocesses image with sharp, then OCR with Tesseract (placeholder)
 */
export async function parseImage(buffer: Buffer): Promise<ImageParseResult> {
  try {
    // Get image metadata
    const metadata = await sharp(buffer).metadata();

    // Preprocess image for better OCR
    // - Convert to grayscale
    // - Increase contrast
    // - Resize if too large
    const preprocessed = await sharp(buffer)
      .greyscale()
      .normalize()
      .resize(metadata.width && metadata.width > 2000 ? 2000 : undefined, undefined, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer();

    // TODO: Implement Tesseract.js OCR
    // For now, return placeholder
    // In a real implementation:
    // const { createWorker } = require('tesseract.js');
    // const worker = await createWorker();
    // const { data: { text } } = await worker.recognize(preprocessed);
    // await worker.terminate();

    return {
      rawText: '', // OCR text will be extracted here
      metadata: {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: buffer.length,
      },
    };
  } catch (error) {
    logger.error({ error }, 'Failed to parse image');
    throw new Error('Failed to parse image file');
  }
}

/**
 * Check if image is likely a scanned document
 * Based on aspect ratio and size
 */
export function isScannedDocument(metadata: ImageParseResult['metadata']): boolean {
  const aspectRatio = metadata.width / metadata.height;

  // A4 portrait: ~0.71 (210/297)
  // A4 landscape: ~1.41 (297/210)
  // Letter portrait: ~0.77 (8.5/11)

  return (
    (aspectRatio > 0.6 && aspectRatio < 0.85) || // Portrait
    (aspectRatio > 1.2 && aspectRatio < 1.5)     // Landscape
  );
}

/**
 * Preprocess image for better OCR
 * Returns optimized buffer
 */
export async function preprocessForOCR(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer)
      .greyscale()
      .normalize()
      .sharpen()
      .threshold(128) // Binarize
      .toBuffer();
  } catch (error) {
    logger.error({ error }, 'Failed to preprocess image');
    throw new Error('Failed to preprocess image');
  }
}
