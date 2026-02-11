import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Authentication middleware
 * Verifies JWT token from cookie or Authorization header
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Try to get token from cookie first
    let token = request.cookies.token;

    // If not in cookie, try Authorization header
    if (!token) {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return reply.code(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    // Verify token
    const decoded = await request.jwtVerify();
    request.user = decoded;
  } catch (error) {
    return reply.code(401).send({
      success: false,
      error: 'Invalid or expired token',
    });
  }
}

/**
 * Role-based access control middleware
 */
export function requireRole(...allowedRoles: string[]) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as any;

    if (!user || !user.role) {
      return reply.code(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(user.role)) {
      return reply.code(403).send({
        success: false,
        error: 'Insufficient permissions',
      });
    }
  };
}

/**
 * Extract orgId from JWT and add to request context
 * This ensures all queries are automatically scoped to the user's organization
 */
export async function extractOrgId(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as any;
  if (user && user.orgId) {
    // Add orgId to request context
    (request as any).orgId = user.orgId;
  }
}
