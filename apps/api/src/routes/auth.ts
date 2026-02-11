import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../lib/auth';

// Validation schemas
const registerSchema = z.object({
  // Organization details
  orgName: z.string().min(2, 'Organization name must be at least 2 characters'),
  orgGstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).optional(),
  orgPan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).optional(),
  orgEmail: z.string().email().optional(),
  orgPhone: z.string().optional(),
  orgAddress: z.string().optional(),
  orgCity: z.string().optional(),
  orgState: z.string().optional(),
  orgPincode: z.string().regex(/^[1-9][0-9]{5}$/).optional(),

  // Admin user details
  userName: z.string().min(2, 'Name must be at least 2 characters'),
  userEmail: z.string().email('Invalid email address'),
  userPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default async function authRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/auth/register
   * Register a new organization and admin user
   */
  fastify.post('/register', async (request, reply) => {
    try {
      const body = registerSchema.parse(request.body);

      // Validate password strength
      const passwordValidation = validatePasswordStrength(body.userPassword);
      if (!passwordValidation.valid) {
        return reply.code(400).send({
          success: false,
          error: passwordValidation.errors.join(', '),
        });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: body.userEmail },
      });

      if (existingUser) {
        return reply.code(400).send({
          success: false,
          error: 'User with this email already exists',
        });
      }

      // Check if GSTIN already exists
      if (body.orgGstin) {
        const existingOrg = await prisma.organization.findUnique({
          where: { gstin: body.orgGstin },
        });

        if (existingOrg) {
          return reply.code(400).send({
            success: false,
            error: 'Organization with this GSTIN already exists',
          });
        }
      }

      // Hash password
      const passwordHash = await hashPassword(body.userPassword);

      // Create organization and admin user in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create organization
        const org = await tx.organization.create({
          data: {
            name: body.orgName,
            gstin: body.orgGstin || null,
            pan: body.orgPan || null,
            email: body.orgEmail || null,
            phone: body.orgPhone || null,
            address: body.orgAddress || null,
            city: body.orgCity || null,
            state: body.orgState || null,
            pincode: body.orgPincode || null,
          },
        });

        // Create admin user
        const user = await tx.user.create({
          data: {
            email: body.userEmail,
            name: body.userName,
            passwordHash,
            role: 'ADMIN',
            orgId: org.id,
          },
        });

        // Create default organization settings
        await tx.organizationSettings.create({
          data: {
            orgId: org.id,
            vendorReconcFrequency: 'MONTHLY',
            customerReminderDays: [7, 15, 30],
            autoSendReminders: false,
            autoSendLedgerConfirm: false,
            gstMatchTolerance: 1.0,
            paymentMatchTolerance: 1.0,
            inventoryTrackingEnabled: true,
          },
        });

        return { org, user };
      });

      // Generate JWT token
      const token = fastify.jwt.sign({
        userId: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        orgId: result.org.id,
      });

      // Set cookie
      reply.setCookie('token', token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });

      return reply.send({
        success: true,
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            role: result.user.role,
          },
          organization: {
            id: result.org.id,
            name: result.org.name,
            gstin: result.org.gstin,
          },
          token,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: error.errors[0].message,
        });
      }

      fastify.log.error({ error }, 'Registration error');
      return reply.code(500).send({
        success: false,
        error: 'Failed to register. Please try again.',
      });
    }
  });

  /**
   * POST /api/auth/login
   * Login with email and password
   */
  fastify.post('/login', async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body);

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: body.email },
        include: {
          org: {
            select: {
              id: true,
              name: true,
              gstin: true,
            },
          },
        },
      });

      if (!user) {
        return reply.code(401).send({
          success: false,
          error: 'Invalid email or password',
        });
      }

      // Verify password
      const validPassword = await verifyPassword(body.password, user.passwordHash);

      if (!validPassword) {
        return reply.code(401).send({
          success: false,
          error: 'Invalid email or password',
        });
      }

      // Generate JWT token
      const token = fastify.jwt.sign({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        orgId: user.orgId,
      });

      // Set cookie
      reply.setCookie('token', token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });

      return reply.send({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          organization: {
            id: user.org.id,
            name: user.org.name,
            gstin: user.org.gstin,
          },
          token,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: error.errors[0].message,
        });
      }

      fastify.log.error({ error }, 'Login error');
      return reply.code(500).send({
        success: false,
        error: 'Failed to login. Please try again.',
      });
    }
  });

  /**
   * POST /api/auth/logout
   * Logout (clear cookie)
   */
  fastify.post('/logout', async (request, reply) => {
    reply.clearCookie('token', { path: '/' });

    return reply.send({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  });

  /**
   * GET /api/auth/me
   * Get current user info (requires authentication)
   */
  fastify.get(
    '/me',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const decoded = request.user as any;

        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          include: {
            org: {
              select: {
                id: true,
                name: true,
                gstin: true,
                email: true,
                phone: true,
              },
            },
          },
        });

        if (!user) {
          return reply.code(404).send({
            success: false,
            error: 'User not found',
          });
        }

        return reply.send({
          success: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            },
            organization: user.org,
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get user error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get user info',
        });
      }
    }
  );

  /**
   * POST /api/auth/refresh
   * Refresh JWT token
   */
  fastify.post(
    '/refresh',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const decoded = request.user as any;

        // Generate new token
        const token = fastify.jwt.sign({
          userId: decoded.userId,
          email: decoded.email,
          name: decoded.name,
          role: decoded.role,
          orgId: decoded.orgId,
        });

        // Set new cookie
        reply.setCookie('token', token, {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60, // 7 days
        });

        return reply.send({
          success: true,
          data: { token },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Token refresh error');
        return reply.code(500).send({
          success: false,
          error: 'Failed to refresh token',
        });
      }
    }
  );
}
