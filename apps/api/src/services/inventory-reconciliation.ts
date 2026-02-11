import { prisma } from '../lib/prisma';
import logger from '../lib/logger';

export class InventoryReconciliationService {
  /**
   * Create inventory snapshot for a SKU
   */
  async createSnapshot(
    skuId: string,
    snapshotDate: Date,
    openingQty: number,
    closingQty: number,
    orgId: string
  ): Promise<string> {
    // Calculate expected closing based on transactions
    const periodStart = new Date(snapshotDate);
    periodStart.setHours(0, 0, 0, 0);

    const periodEnd = new Date(snapshotDate);
    periodEnd.setHours(23, 59, 59, 999);

    // Get purchases for the period
    const purchases = await prisma.purchaseInvoiceLineItem.findMany({
      where: {
        skuId,
        invoice: {
          orgId,
          invoiceDate: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
      },
    });

    const purchasedQty = purchases.reduce((sum, item) => sum + item.quantity, 0);

    // Get sales for the period
    const sales = await prisma.salesInvoiceLineItem.findMany({
      where: {
        skuId,
        invoice: {
          orgId,
          invoiceDate: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
      },
    });

    const soldQty = sales.reduce((sum, item) => sum + item.quantity, 0);

    const expectedClosing = openingQty + purchasedQty - soldQty;
    const discrepancy = closingQty - expectedClosing;

    const snapshot = await prisma.inventorySnapshot.create({
      data: {
        orgId,
        skuId,
        snapshotDate: periodEnd,
        openingQty,
        purchasedQty,
        soldQty,
        adjustmentQty: 0,
        closingQty,
        expectedClosing,
        discrepancy,
      },
    });

    logger.info(
      { snapshotId: snapshot.id, skuId, discrepancy },
      'Inventory snapshot created'
    );

    return snapshot.id;
  }

  /**
   * Run inventory reconciliation for all SKUs
   */
  async reconcileAllInventory(
    snapshotDate: Date,
    orgId: string
  ): Promise<{
    total: number;
    matched: number;
    discrepancies: number;
    snapshots: any[];
  }> {
    const skus = await prisma.sKU.findMany({
      where: { orgId, isActive: true },
    });

    const snapshots = [];
    let matched = 0;
    let discrepancies = 0;

    for (const sku of skus) {
      // Get the latest snapshot before this date
      const lastSnapshot = await prisma.inventorySnapshot.findFirst({
        where: {
          orgId,
          skuId: sku.id,
          snapshotDate: { lt: snapshotDate },
        },
        orderBy: { snapshotDate: 'desc' },
      });

      const openingQty = lastSnapshot?.closingQty || 0;

      // For demo, use expected closing as actual closing (no discrepancy)
      // In real scenario, this would come from physical count
      const periodStart = new Date(
        lastSnapshot?.snapshotDate || new Date(snapshotDate.getTime() - 30 * 24 * 60 * 60 * 1000)
      );

      // Calculate expected closing
      const purchases = await prisma.purchaseInvoiceLineItem.findMany({
        where: {
          skuId: sku.id,
          invoice: {
            orgId,
            invoiceDate: {
              gte: periodStart,
              lte: snapshotDate,
            },
          },
        },
      });

      const purchasedQty = purchases.reduce((sum, item) => sum + item.quantity, 0);

      const sales = await prisma.salesInvoiceLineItem.findMany({
        where: {
          skuId: sku.id,
          invoice: {
            orgId,
            invoiceDate: {
              gte: periodStart,
              lte: snapshotDate,
            },
          },
        },
      });

      const soldQty = sales.reduce((sum, item) => sum + item.quantity, 0);

      const expectedClosing = openingQty + purchasedQty - soldQty;
      const closingQty = expectedClosing; // In real scenario, from physical count

      const discrepancy = closingQty - expectedClosing;

      const snapshot = await prisma.inventorySnapshot.create({
        data: {
          orgId,
          skuId: sku.id,
          snapshotDate,
          openingQty,
          purchasedQty,
          soldQty,
          adjustmentQty: 0,
          closingQty,
          expectedClosing,
          discrepancy,
        },
      });

      snapshots.push({
        ...snapshot,
        sku: {
          skuCode: sku.skuCode,
          name: sku.name,
        },
      });

      if (Math.abs(discrepancy) < 0.01) {
        matched++;
      } else {
        discrepancies++;
      }
    }

    logger.info({ orgId, total: skus.length, matched, discrepancies }, 'Inventory reconciliation completed');

    return {
      total: skus.length,
      matched,
      discrepancies,
      snapshots,
    };
  }

  /**
   * Get inventory summary statistics
   */
  async getInventorySummary(orgId: string): Promise<{
    totalSKUs: number;
    totalValue: number;
    lastReconciliation: Date | null;
    discrepancies: number;
    matchRate: number;
  }> {
    const skus = await prisma.sKU.count({
      where: { orgId, isActive: true },
    });

    const latestSnapshot = await prisma.inventorySnapshot.findFirst({
      where: { orgId },
      orderBy: { snapshotDate: 'desc' },
    });

    const recentSnapshots = await prisma.inventorySnapshot.findMany({
      where: {
        orgId,
        snapshotDate: latestSnapshot?.snapshotDate,
      },
    });

    const discrepancyCount = recentSnapshots.filter(
      (s) => Math.abs(s.discrepancy) > 0.01
    ).length;

    const matchRate =
      recentSnapshots.length > 0
        ? ((recentSnapshots.length - discrepancyCount) / recentSnapshots.length) * 100
        : 100;

    return {
      totalSKUs: skus,
      totalValue: 0, // Would need pricing data
      lastReconciliation: latestSnapshot?.snapshotDate || null,
      discrepancies: discrepancyCount,
      matchRate: Math.round(matchRate * 10) / 10,
    };
  }

  /**
   * Get discrepancy details
   */
  async getDiscrepancies(orgId: string, snapshotDate?: Date): Promise<any[]> {
    const where: any = {
      orgId,
      discrepancy: { not: 0 },
    };

    if (snapshotDate) {
      where.snapshotDate = snapshotDate;
    } else {
      // Get latest snapshots
      const latest = await prisma.inventorySnapshot.findFirst({
        where: { orgId },
        orderBy: { snapshotDate: 'desc' },
      });

      if (latest) {
        where.snapshotDate = latest.snapshotDate;
      }
    }

    const snapshots = await prisma.inventorySnapshot.findMany({
      where,
      include: {
        sku: {
          select: {
            id: true,
            skuCode: true,
            name: true,
            unit: true,
          },
        },
      },
      orderBy: { discrepancy: 'desc' },
    });

    return snapshots;
  }
}

export const inventoryReconciliationService = new InventoryReconciliationService();
