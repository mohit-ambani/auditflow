'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Upload,
  Users,
  Package,
  GitCompare,
  CreditCard,
  Receipt,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Percent,
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  uploads: { total: number; processing: number; completed: number; failed: number };
  poMatches: { total: number; exact: number; partial: number; needsReview: number };
  paymentMatches: { total: number; matched: number; unmatched: number };
  gstMatches: { total: number; itcAvailable: number; itcMismatch: number };
  vendors: number;
  customers: number;
  skus: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [uploads, poMatches, paymentMatches, gstMatches, vendors, customers, skus] = await Promise.all([
          apiClient.get('/api/uploads/stats').catch(() => ({ data: { total: 0, processing: 0, completed: 0, failed: 0 } })),
          apiClient.get('/api/po-invoice-matches/stats').catch(() => ({ data: { totalMatches: 0, exactMatches: 0, partialMatches: 0, needsReview: 0 } })),
          apiClient.get('/api/payment-matches/stats').catch(() => ({ data: { totalMatches: 0, unmatchedTxns: 0 } })),
          apiClient.get('/api/gst-matches/stats').catch(() => ({ data: { totalMatches: 0, itcAvailable: 0, itcMismatch: 0 } })),
          apiClient.get('/api/vendors?limit=1').catch(() => ({ data: { total: 0 } })),
          apiClient.get('/api/customers?limit=1').catch(() => ({ data: { total: 0 } })),
          apiClient.get('/api/skus?limit=1').catch(() => ({ data: { total: 0 } })),
        ]);

        setStats({
          uploads: (uploads.data as { total: number; processing: number; completed: number; failed: number }) || { total: 0, processing: 0, completed: 0, failed: 0 },
          poMatches: {
            total: poMatches.data?.totalMatches || 0,
            exact: poMatches.data?.exactMatches || 0,
            partial: poMatches.data?.partialMatches || 0,
            needsReview: poMatches.data?.needsReview || 0,
          },
          paymentMatches: {
            total: paymentMatches.data?.totalMatches || 0,
            matched: paymentMatches.data?.totalMatches || 0,
            unmatched: paymentMatches.data?.unmatchedTxns || 0,
          },
          gstMatches: {
            total: gstMatches.data?.totalMatches || 0,
            itcAvailable: gstMatches.data?.itcAvailable || 0,
            itcMismatch: gstMatches.data?.itcMismatch || 0,
          },
          vendors: vendors.data?.total || 0,
          customers: customers.data?.total || 0,
          skus: skus.data?.total || 0,
        });
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Loading your accounting operations...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-32 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const reconHealth = stats
    ? Math.round(
        ((stats.poMatches.exact + stats.paymentMatches.matched + stats.gstMatches.itcAvailable) /
          Math.max(stats.poMatches.total + stats.paymentMatches.total + stats.gstMatches.total, 1)) *
          100
      )
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your accounting operations</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents Uploaded</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.uploads.total || 0}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                {stats?.uploads.completed || 0} Done
              </Badge>
              {(stats?.uploads.processing || 0) > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1 text-blue-600" />
                  {stats?.uploads.processing} Processing
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PO-Invoice Matches</CardTitle>
            <GitCompare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.poMatches.total || 0}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                {stats?.poMatches.exact || 0} Exact
              </Badge>
              {(stats?.poMatches.needsReview || 0) > 0 && (
                <Badge variant="outline" className="text-xs">
                  <AlertCircle className="h-3 w-3 mr-1 text-yellow-600" />
                  {stats?.poMatches.needsReview} Review
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Matches</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.paymentMatches.total || 0}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                {stats?.paymentMatches.matched || 0} Matched
              </Badge>
              {(stats?.paymentMatches.unmatched || 0) > 0 && (
                <Badge variant="outline" className="text-xs">
                  <AlertCircle className="h-3 w-3 mr-1 text-red-600" />
                  {stats?.paymentMatches.unmatched} Unmatched
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reconciliation Health</CardTitle>
            {reconHealth >= 80 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-yellow-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reconHealth}%</div>
            <p className="text-xs text-muted-foreground mt-2">
              {reconHealth >= 90 ? 'Excellent' : reconHealth >= 70 ? 'Good' : 'Needs attention'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Module Status */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started with common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/uploads">
              <Button variant="outline" className="w-full justify-start">
                <Upload className="mr-2 h-4 w-4" />
                Upload Documents
                <ArrowRight className="ml-auto h-4 w-4" />
              </Button>
            </Link>
            <Link href="/vendors">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Manage Vendors
                <ArrowRight className="ml-auto h-4 w-4" />
              </Button>
            </Link>
            <Link href="/skus">
              <Button variant="outline" className="w-full justify-start">
                <Package className="mr-2 h-4 w-4" />
                Manage SKUs
                <ArrowRight className="ml-auto h-4 w-4" />
              </Button>
            </Link>
            <Link href="/matches">
              <Button variant="outline" className="w-full justify-start">
                <GitCompare className="mr-2 h-4 w-4" />
                Review Matches
                <ArrowRight className="ml-auto h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Modules</CardTitle>
            <CardDescription>Your AuditFlow AI capabilities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Document Parser & AI Extraction</span>
              </div>
              <Badge variant="outline" className="bg-green-50">
                <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                Active
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Master Data Management</span>
              </div>
              <Badge variant="outline" className="bg-green-50">
                <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                Active
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitCompare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">PO ↔ Invoice Matching</span>
              </div>
              <Badge variant="outline" className="bg-green-50">
                <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                Active
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Payment Reconciliation</span>
              </div>
              <Badge variant="outline" className="bg-green-50">
                <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                Active
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">GST Reconciliation</span>
              </div>
              <Badge variant="outline" className="bg-green-50">
                <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                Active
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Discount & Penalty Validator</span>
              </div>
              <Badge variant="outline" className="bg-green-50">
                <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Master Data Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Master Data Summary</CardTitle>
          <CardDescription>Your configured entities and items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-50 p-3">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.vendors || 0}</p>
                <p className="text-sm text-muted-foreground">Vendors</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-50 p-3">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.customers || 0}</p>
                <p className="text-sm text-muted-foreground">Customers</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-purple-50 p-3">
                <Package className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.skus || 0}</p>
                <p className="text-sm text-muted-foreground">SKUs</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GST Summary */}
      {stats && stats.gstMatches.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>GST Reconciliation</CardTitle>
            <CardDescription>Input Tax Credit status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Total Matches</p>
                <p className="text-2xl font-bold">{stats.gstMatches.total}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ITC Available</p>
                <p className="text-2xl font-bold text-green-600">{stats.gstMatches.itcAvailable}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ITC Mismatch</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.gstMatches.itcMismatch}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Getting Started */}
      {stats && stats.uploads.total === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Start by uploading your first document</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              AuditFlow AI is ready to process your documents. Upload invoices, purchase orders, bank statements, or GSTR files to begin automated reconciliation.
            </p>
            <Link href="/uploads">
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload Your First Document
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
