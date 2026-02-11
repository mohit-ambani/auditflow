import { PrismaClient } from '@prisma/client';
import logger from './logger';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Tenant isolation middleware
prisma.$use(async (params, next) => {
  // Extract orgId from context (will be set by auth middleware)
  const orgId = (params as any).orgId;

  // Models that require tenant isolation
  const tenantModels = [
    'Organization', 'Vendor', 'Customer', 'SKU', 'PurchaseOrder',
    'PurchaseInvoice', 'SalesInvoice', 'BankStatement', 'BankTransaction',
    'GSTReturn', 'CreditDebitNote', 'InventorySnapshot', 'ReconciliationRun'
  ];

  if (tenantModels.includes(params.model || '') && orgId) {
    if (params.action === 'findMany' || params.action === 'findFirst') {
      params.args = params.args || {};
      params.args.where = params.args.where || {};
      params.args.where.orgId = orgId;
    } else if (params.action === 'create') {
      params.args = params.args || {};
      params.args.data = params.args.data || {};
      params.args.data.orgId = orgId;
    }
  }

  return next(params);
});

export default prisma;
