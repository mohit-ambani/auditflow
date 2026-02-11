'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import {
  Package,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  Play,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface InventorySnapshot {
  id: string;
  skuId: string;
  snapshotDate: string;
  openingQty: number;
  purchasedQty: number;
  soldQty: number;
  adjustmentQty: number;
  closingQty: number;
  expectedClosing: number;
  discrepancy: number;
  notes: string | null;
  createdAt: string;
  sku: {
    id: string;
    skuCode: string;
    name: string;
    unit: string;
  };
}

interface InventorySummary {
  totalSKUs: number;
  totalValue: number;
  lastReconciliation: string | null;
  discrepancies: number;
  matchRate: number;
}

export default function InventoryPage() {
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [snapshots, setSnapshots] = useState<InventorySnapshot[]>([]);
  const [discrepancies, setDiscrepancies] = useState<InventorySnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [summaryRes, snapshotsRes, discrepanciesRes] = await Promise.all([
        apiClient.get('/api/inventory/summary'),
        apiClient.get('/api/inventory/snapshots?limit=20'),
        apiClient.get('/api/inventory/discrepancies'),
      ]);

      if (summaryRes.success && summaryRes.data) {
        setSummary(summaryRes.data);
      }

      if (snapshotsRes.success && snapshotsRes.data) {
        setSnapshots(snapshotsRes.data.snapshots);
      }

      if (discrepanciesRes.success && discrepanciesRes.data) {
        setDiscrepancies(discrepanciesRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch inventory data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function runReconciliation() {
    setReconciling(true);
    try {
      const response = await apiClient.post('/api/inventory/reconcile', {});
      if (response.success) {
        alert(`Reconciled ${response.data.total} SKUs. ${response.data.discrepancies} discrepancies found.`);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to run reconciliation:', error);
      alert('Failed to run reconciliation');
    } finally {
      setReconciling(false);
    }
  }

  if (loading && !summary) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Loading inventory data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory Reconciliation</h1>
          <p className="text-muted-foreground">
            Track inventory snapshots and detect discrepancies
          </p>
        </div>
        <Button onClick={runReconciliation} disabled={reconciling}>
          <Play className="mr-2 h-4 w-4" />
          {reconciling ? 'Reconciling...' : 'Run Reconciliation'}
        </Button>
      </div>

      {/* Stats Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total SKUs</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalSKUs}</div>
              <p className="text-xs text-muted-foreground">
                Active items tracked
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Match Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.matchRate}%</div>
              <p className="text-xs text-muted-foreground">
                Inventory accuracy
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Discrepancies</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.discrepancies}</div>
              <p className="text-xs text-muted-foreground">
                Items with variance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Reconciliation</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.lastReconciliation
                  ? new Date(summary.lastReconciliation).toLocaleDateString()
                  : 'Never'}
              </div>
              <p className="text-xs text-muted-foreground">
                Latest snapshot
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Discrepancies Section */}
      {discrepancies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Items with Discrepancies</CardTitle>
            <CardDescription>
              SKUs where physical count doesn't match expected quantity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discrepancies.map((snapshot) => (
                    <TableRow key={snapshot.id}>
                      <TableCell className="font-medium">
                        {snapshot.sku.skuCode}
                      </TableCell>
                      <TableCell>{snapshot.sku.name}</TableCell>
                      <TableCell className="text-right">
                        {snapshot.expectedClosing} {snapshot.sku.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        {snapshot.closingQty} {snapshot.sku.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={snapshot.discrepancy > 0 ? 'default' : 'destructive'}
                          className="flex items-center gap-1 w-fit ml-auto"
                        >
                          {snapshot.discrepancy > 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {snapshot.discrepancy > 0 ? '+' : ''}
                          {snapshot.discrepancy} {snapshot.sku.unit}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(snapshot.snapshotDate).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Snapshots */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Inventory Snapshots</CardTitle>
          <CardDescription>Latest inventory reconciliation records</CardDescription>
        </CardHeader>
        <CardContent>
          {snapshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No snapshots found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Run a reconciliation to create inventory snapshots
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Opening</TableHead>
                    <TableHead className="text-right">Purchased</TableHead>
                    <TableHead className="text-right">Sold</TableHead>
                    <TableHead className="text-right">Closing</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshots.map((snapshot) => (
                    <TableRow key={snapshot.id}>
                      <TableCell className="font-medium">
                        {snapshot.sku.skuCode}
                      </TableCell>
                      <TableCell>{snapshot.sku.name}</TableCell>
                      <TableCell className="text-right">
                        {snapshot.openingQty} {snapshot.sku.unit}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        +{snapshot.purchasedQty} {snapshot.sku.unit}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        -{snapshot.soldQty} {snapshot.sku.unit}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {snapshot.closingQty} {snapshot.sku.unit}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {snapshot.expectedClosing} {snapshot.sku.unit}
                      </TableCell>
                      <TableCell>
                        {Math.abs(snapshot.discrepancy) < 0.01 ? (
                          <Badge variant="default">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Matched
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Variance
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(snapshot.snapshotDate).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
