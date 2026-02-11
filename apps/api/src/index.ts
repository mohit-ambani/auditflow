import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import websocket from '@fastify/websocket';
import logger from './lib/logger';
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import uploadsRoutes from './routes/uploads';
import vendorsRoutes from './routes/vendors';
import customersRoutes from './routes/customers';
import skusRoutes from './routes/skus';
import discountTermsRoutes from './routes/discount-terms';
import discountAuditsRoutes from './routes/discount-audits';
import vendorLedgerRoutes from './routes/vendor-ledger';
import paymentRemindersRoutes from './routes/payment-reminders';
import inventoryRoutes from './routes/inventory';
import creditDebitNotesRoutes from './routes/credit-debit-notes';
import aiDemoRoutes from './routes/ai-demo';
import poInvoiceMatchesRoutes from './routes/po-invoice-matches';
import paymentMatchesRoutes from './routes/payment-matches';
import gstMatchesRoutes from './routes/gst-matches';
import chatRoutes from './routes/chat';
import { authenticate } from './lib/middleware';
import { startDocumentWorker } from './workers/document-worker';
import { startMatchingWorker } from './workers/matching-worker';

const fastify = Fastify({
  logger,
  bodyLimit: 26214400, // 25MB
});

async function start() {
  try {
    // Register plugins
    await fastify.register(cors, {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
    });

    await fastify.register(multipart, {
      limits: {
        fileSize: 26214400, // 25MB
        files: 10,
      },
    });

    await fastify.register(jwt, {
      secret: process.env.JWT_SECRET || 'your-jwt-secret-change-in-production',
      cookie: {
        cookieName: 'token',
        signed: false,
      },
    });

    await fastify.register(cookie);

    await fastify.register(websocket);

    // Decorate fastify with authenticate method
    fastify.decorate('authenticate', authenticate);

    // Register routes
    await fastify.register(healthRoutes, { prefix: '/api' });
    await fastify.register(authRoutes, { prefix: '/api/auth' });
    await fastify.register(uploadsRoutes, { prefix: '/api/uploads' });
    await fastify.register(vendorsRoutes, { prefix: '/api/vendors' });
    await fastify.register(customersRoutes, { prefix: '/api/customers' });
    await fastify.register(skusRoutes, { prefix: '/api/skus' });
    await fastify.register(discountTermsRoutes, { prefix: '/api/discount-terms' });
    await fastify.register(discountAuditsRoutes, { prefix: '/api/discount-audits' });
    await fastify.register(vendorLedgerRoutes, { prefix: '/api/vendor-ledger' });
    await fastify.register(paymentRemindersRoutes, { prefix: '/api/payment-reminders' });
    await fastify.register(inventoryRoutes, { prefix: '/api/inventory' });
    await fastify.register(creditDebitNotesRoutes, { prefix: '/api/credit-debit-notes' });
    await fastify.register(aiDemoRoutes, { prefix: '/api/ai-demo' });
    await fastify.register(poInvoiceMatchesRoutes, { prefix: '/api/po-invoice-matches' });
    await fastify.register(paymentMatchesRoutes, { prefix: '/api/payment-matches' });
    await fastify.register(gstMatchesRoutes, { prefix: '/api/gst-matches' });
    await fastify.register(chatRoutes, { prefix: '/api/chat' });

    // Start server
    const port = parseInt(process.env.API_PORT || '4000');
    const host = process.env.API_HOST || '0.0.0.0';

    await fastify.listen({ port, host });

    // Start background workers
    startDocumentWorker();
    startMatchingWorker();

    logger.info(`🚀 API server running on http://${host}:${port}`);
    logger.info(`📊 Health check: http://${host}:${port}/api/health`);
    logger.info(`⚙️  Document processing worker started`);
    logger.info(`🔗 PO-Invoice matching worker started`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Handle graceful shutdown
const signals = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    logger.info(`${signal} received, shutting down gracefully...`);
    await fastify.close();
    process.exit(0);
  });
});

start();
