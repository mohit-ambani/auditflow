'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Search,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DiscountAudit {
  id: string;
  invoiceId: string;
  expectedDiscount: number;
  actualDiscount: number;
  difference: number;
  status: string;
  notes: string;
  createdAt: string;
  invoice: {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    totalAmount: number;
    totalWithGst: number;
    vendor: {
      id: string;
      name: string;
      gstin: string;
    };
  };
}

interface AuditStats {
  totalAudited: number;
  correct: number;
  underDiscounted: number;
  overDiscounted: number;
  penaltyIssues: number;
  needsReview: number;
  totalDiscrepancy: number;
}

export default function DiscountAuditsPage() {
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [audits, setAudits] = useState<DiscountAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [runningAudit, setRunningAudit] = useState(false);

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  async function fetchData() {
    setLoading(true);
    try {
      const [statsRes, auditsRes] = await Promise.all([
        apiClient.get('/api/discount-audits/stats'),
        apiClient.get(
          `/api/discount-audits?limit=50${statusFilter !== 'all' ? `&status=${statusFilter}` : ''}`
        ),
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }

      if (auditsRes.success && auditsRes.data) {
        setAudits(auditsRes.data.audits);
      }
    } catch (error) {
      console.error('Failed to fetch discount audits:', error);
    } finally {
      setLoading(false);
    }
  }

  async function runAudit() {
    setRunningAudit(true);
    try {
      // You would typically select a vendor, but for demo we'll just show the UI
      alert('Please select a vendor from the Vendors page to run an audit');
    } catch (error) {
      console.error('Failed to run audit:', error);
    } finally {
      setRunningAudit(false);
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, { variant: any; icon: any }> = {
      CORRECT: { variant: 'default', icon: CheckCircle },
      UNDER_DISCOUNTED: { variant: 'destructive', icon: TrendingDown },
      OVER_DISCOUNTED: { variant: 'secondary', icon: TrendingUp },
      NEEDS_REVIEW: { variant: 'outline', icon: AlertCircle },
      PENALTY_MISSING: { variant: 'destructive', icon: XCircle },
      PENALTY_INCORRECT: { variant: 'destructive', icon: XCircle },
    };

    const config = variants[status] || { variant: 'outline', icon: Clock };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  }

  if (loading && !stats) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Loading discount audits...</p>
        </div>
      </div>
    );
  }

  const complianceRate = stats
    ? stats.totalAudited > 0
      ? ((stats.correct / stats.totalAudited) * 100).toFixed(1)
      : '0'
    : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Discount Audits</h1>
          <p className="text-muted-foreground">
            Validate discount compliance against vendor terms
          </p>
        </div>
        <Button onClick={runAudit} disabled={runningAudit}>
          <Play className="mr-2 h-4 w-4" />
          {runningAudit ? 'Running...' : 'Run Audit'}
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{complianceRate}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.correct} of {stats.totalAudited} correct
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Under-Discounted</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.underDiscounted}</div>
              <p className="text-xs text-muted-foreground">
                Invoices missing discounts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Over-Discounted</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overDiscounted}</div>
              <p className="text-xs text-muted-foreground">
                Invoices with excess discounts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Discrepancy</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.totalDiscrepancy.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Across all audited invoices
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Audit Results</CardTitle>
              <CardDescription>Review discount compliance by invoice</CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="CORRECT">Correct</SelectItem>
                <SelectItem value="UNDER_DISCOUNTED">Under-Discounted</SelectItem>
                <SelectItem value="OVER_DISCOUNTED">Over-Discounted</SelectItem>
                <SelectItem value="NEEDS_REVIEW">Needs Review</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {audits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No audits found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Run an audit to start validating discount compliance
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead className="text-right">Invoice Amount</TableHead>
                    <TableHead className="text-right">Expected Discount</TableHead>
                    <TableHead className="text-right">Actual Discount</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audits.map((audit) => (
                    <TableRow key={audit.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-medium">{audit.invoice.vendor.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {audit.invoice.vendor.gstin}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{audit.invoice.invoiceNumber}</TableCell>
                      <TableCell>
                        {new Date(audit.invoice.invoiceDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{audit.invoice.totalAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{audit.expectedDiscount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{audit.actualDiscount.toLocaleString()}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          audit.difference < 0
                            ? 'text-destructive'
                            : audit.difference > 0
                            ? 'text-blue-600'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {audit.difference > 0 ? '+' : ''}₹{audit.difference.toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(audit.status)}</TableCell>
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
