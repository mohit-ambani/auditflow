import { Queue, QueueOptions } from 'bullmq';
import redis from './redis';
import logger from './logger';

const defaultQueueOptions: QueueOptions = {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100,
      age: 24 * 3600, // 24 hours
    },
    removeOnFail: {
      count: 500,
      age: 7 * 24 * 3600, // 7 days
    },
  },
};

// Document Processing Queue
export const documentQueue = new Queue('document-processing', defaultQueueOptions);

// Reconciliation Queue
export const reconciliationQueue = new Queue('reconciliation', defaultQueueOptions);

// Matching Queue
export const matchingQueue = new Queue('po-invoice-matching', defaultQueueOptions);

// Email Queue
export const emailQueue = new Queue('email', defaultQueueOptions);

logger.info('BullMQ queues initialized');

export const queues = {
  document: documentQueue,
  reconciliation: reconciliationQueue,
  matching: matchingQueue,
  email: emailQueue,
};
