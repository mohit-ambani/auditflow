'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import {
  Users,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Mail,
  FileText,
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

interface VendorConfirmation {
  id: string;
  vendorId: string;
  periodFrom: string;
  periodTo: string;
  ourBalance: number;
  vendorBalance: number | null;
  difference: number | null;
  status: string;
  sentAt: string | null;
  respondedAt: string | null;
  responseNotes: string | null;
  createdAt: string;
  vendor: {
    id: string;
    name: string;
    gstin: string;
    email: string;
  };
}

interface ConfirmationStats {
  total: number;
  pending: number;
  sent: number;
  confirmed: number;
  disputed: number;
  noResponse: number;
  totalDifference: number;
}

export default function VendorLedgerPage() {
  const [stats, setStats] = useState<ConfirmationStats | null>(null);
  const [confirmations, setConfirmations] = useState<VendorConfirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  async function fetchData() {
    setLoading(true);
    try {
      const [statsRes, confirmationsRes] = await Promise.all([
        apiClient.get('/api/vendor-ledger/stats'),
        apiClient.get(
          `/api/vendor-ledger/confirmations?limit=50${statusFilter !== 'all' ? `&status=${statusFilter}` : ''}`
        ),
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }

      if (confirmationsRes.success && confirmationsRes.data) {
        setConfirmations(confirmationsRes.data.confirmations);
      }
    } catch (error) {
      console.error('Failed to fetch vendor ledger data:', error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      PENDING: { variant: 'outline', icon: Clock, label: 'Pending' },
      SENT: { variant: 'secondary', icon: Send, label: 'Sent' },
      CONFIRMED: { variant: 'default', icon: CheckCircle, label: 'Confirmed' },
      DISPUTED: { variant: 'destructive', icon: XCircle, label: 'Disputed' },
      NO_RESPONSE: { variant: 'outline', icon: AlertCircle, label: 'No Response' },
      RESOLVED: { variant: 'default', icon: CheckCircle, label: 'Resolved' },
    };

    const config = variants[status] || { variant: 'outline', icon: Clock, label: status };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  }

  if (loading && !stats) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Loading vendor confirmations...</p>
        </div>
      </div>
    );
  }

  const confirmationRate = stats
    ? stats.total > 0
      ? ((stats.confirmed / stats.total) * 100).toFixed(1)
      : '0'
    : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vendor Ledger Confirmation</h1>
          <p className="text-muted-foreground">
            Send ledger statements and track vendor confirmations
          </p>
        </div>
        <Button>
          <FileText className="mr-2 h-4 w-4" />
          New Confirmation
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Confirmation Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{confirmationRate}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.confirmed} of {stats.total} confirmed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sent</CardTitle>
              <Send className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sent}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting vendor response
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disputed</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.disputed}</div>
              <p className="text-xs text-muted-foreground">
                Balance discrepancies
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Difference</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.totalDifference.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Across all disputes
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirmations Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ledger Confirmations</CardTitle>
              <CardDescription>Track vendor balance confirmations</CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="DISPUTED">Disputed</SelectItem>
                <SelectItem value="NO_RESPONSE">No Response</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {confirmations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No confirmations found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Create a confirmation request to start tracking vendor balances
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Our Balance</TableHead>
                    <TableHead className="text-right">Vendor Balance</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {confirmations.map((confirmation) => (
                    <TableRow key={confirmation.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{confirmation.vendor.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {confirmation.vendor.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(confirmation.periodFrom).toLocaleDateString()} -
                          {new Date(confirmation.periodTo).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{confirmation.ourBalance.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {confirmation.vendorBalance !== null ? (
                          <span className="font-medium">
                            ₹{confirmation.vendorBalance.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          confirmation.difference
                            ? Math.abs(confirmation.difference) > 1
                              ? 'text-destructive'
                              : 'text-green-600'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {confirmation.difference !== null ? (
                          <>
                            {confirmation.difference > 0 ? '+' : ''}
                            ₹{confirmation.difference.toLocaleString()}
                          </>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(confirmation.status)}</TableCell>
                      <TableCell>
                        {confirmation.sentAt ? (
                          <div className="text-sm">
                            {new Date(confirmation.sentAt).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {confirmation.status === 'PENDING' && (
                          <Button size="sm" variant="outline">
                            <Mail className="h-3 w-3 mr-1" />
                            Send
                          </Button>
                        )}
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
