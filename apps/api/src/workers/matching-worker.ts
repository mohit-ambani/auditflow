import { Worker, Job } from 'bullmq';
import { matchingQueue } from '../lib/bullmq';
import { redis } from '../lib/redis';
import logger from '../lib/logger';
import { findBestPOForInvoice, saveMatch } from '../services/po-invoice-matcher';
import { prisma } from '../lib/prisma';

interface MatchingJobData {
  invoiceId: string;
  orgId: string;
}

/**
 * Process automatic PO-Invoice matching
 */
async function processMatching(job: Job<MatchingJobData>) {
  const { invoiceId, orgId } = job.data;

  logger.info({ invoiceId, orgId }, 'Starting automatic PO-Invoice matching');

  try {
    // Update invoice status
    await prisma.purchaseInvoice.update({
      where: { id: invoiceId },
      data: { status: 'PROCESSING' },
    });

    // Find best matching PO
    const bestMatch = await findBestPOForInvoice(invoiceId, orgId);

    if (!bestMatch) {
      logger.info({ invoiceId }, 'No suitable PO found for invoice');

      await prisma.purchaseInvoice.update({
        where: { id: invoiceId },
        data: { status: 'UNMATCHED' },
      });

      return {
        invoiceId,
        matched: false,
        reason: 'No suitable PO found',
      };
    }

    // Save match
    const matchId = await saveMatch(bestMatch.match);

    // Update invoice status based on match quality
    let status: 'MATCHED' | 'PENDING' = 'MATCHED';
    if (bestMatch.match.needsReview) {
      status = 'PENDING'; // Needs manual review
    }

    await prisma.purchaseInvoice.update({
      where: { id: invoiceId },
      data: { status },
    });

    // Update PO status if fully matched
    if (bestMatch.match.matchType === 'EXACT' && !bestMatch.match.needsReview) {
      await updatePOStatus(bestMatch.poId);
    }

    logger.info(
      {
        invoiceId,
        matchId,
        poId: bestMatch.poId,
        score: bestMatch.matchScore,
        needsReview: bestMatch.match.needsReview,
      },
      'Automatic matching completed'
    );

    return {
      invoiceId,
      matched: true,
      matchId,
      score: bestMatch.matchScore,
      needsReview: bestMatch.match.needsReview,
    };
  } catch (error) {
    logger.error({ error, invoiceId }, 'Automatic matching failed');

    // Update invoice status to failed
    await prisma.purchaseInvoice.update({
      where: { id: invoiceId },
      data: { status: 'FAILED' },
    });

    throw error;
  }
}

/**
 * Update PO status based on matched invoices
 */
async function updatePOStatus(poId: string) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: {
      matchedInvoices: true,
      lineItems: true,
    },
  });

  if (!po) return;

  // Calculate total matched quantity
  const totalOrdered = po.lineItems.reduce((sum, item) => sum + item.quantity, 0);

  // Get all matched invoice line items
  const matchedInvoiceIds = po.matchedInvoices.map((m) => m.invoiceId);
  const matchedLineItems = await prisma.purchaseInvoiceLineItem.findMany({
    where: {
      invoiceId: { in: matchedInvoiceIds },
    },
  });

  const totalInvoiced = matchedLineItems.reduce((sum, item) => sum + item.quantity, 0);
  const fulfillmentPercent = (totalInvoiced / totalOrdered) * 100;

  let status: 'OPEN' | 'PARTIALLY_FULFILLED' | 'FULFILLED' | 'CLOSED' = po.status;

  if (fulfillmentPercent >= 99) {
    status = 'FULFILLED';
  } else if (fulfillmentPercent > 0) {
    status = 'PARTIALLY_FULFILLED';
  }

  if (status !== po.status) {
    await prisma.purchaseOrder.update({
      where: { id: poId },
      data: { status },
    });

    logger.info({ poId, oldStatus: po.status, newStatus: status }, 'PO status updated');
  }
}

/**
 * Create and start matching worker
 */
export function startMatchingWorker() {
  const worker = new Worker<MatchingJobData>(
    'po-invoice-matching',
    async (job) => {
      return await processMatching(job);
    },
    {
      connection: redis,
      concurrency: 3, // Process 3 matches concurrently
      limiter: {
        max: 20, // Max 20 jobs
        duration: 60000, // per minute
      },
    }
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Matching job completed');
  });

  worker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, error }, 'Matching job failed');
  });

  worker.on('error', (error) => {
    logger.error({ error }, 'Matching worker error');
  });

  logger.info('PO-Invoice matching worker started');

  return worker;
}

/**
 * Queue invoice for automatic matching
 */
export async function queueInvoiceMatching(invoiceId: string, orgId: string) {
  await matchingQueue.add(
    'match-invoice',
    { invoiceId, orgId },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
    }
  );

  logger.info({ invoiceId, orgId }, 'Invoice queued for matching');
}
