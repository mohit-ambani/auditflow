import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  fastify.get('/health/detailed', async (request, reply) => {
    const checks = {
      database: false,
      redis: false,
    };

    // Check database
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch (error) {
      fastify.log.error({ error }, 'Database health check failed');
    }

    // Check Redis
    try {
      await redis.ping();
      checks.redis = true;
    } catch (error) {
      fastify.log.error({ error }, 'Redis health check failed');
    }

    const allHealthy = Object.values(checks).every(Boolean);

    return reply.code(allHealthy ? 200 : 503).send({
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    });
  });
}
