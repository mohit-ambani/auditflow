'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import {
  FileText,
  Plus,
  Minus,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  DollarSign,
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

interface CreditDebitNote {
  id: string;
  noteType: string;
  noteNumber: string;
  noteDate: string;
  vendorId: string | null;
  customerId: string | null;
  reason: string | null;
  originalInvoiceRef: string | null;
  totalAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalWithGst: number;
  status: string;
  createdAt: string;
  vendor: {
    id: string;
    name: string;
    gstin: string;
  } | null;
  customer: {
    id: string;
    name: string;
    gstin: string;
  } | null;
}

interface NotesStats {
  total: number;
  creditNotesReceived: number;
  creditNotesIssued: number;
  debitNotesReceived: number;
  debitNotesIssued: number;
  totalCreditAmount: number;
  totalDebitAmount: number;
  pending: number;
  adjusted: number;
  disputed: number;
}

export default function CreditDebitNotesPage() {
  const [stats, setStats] = useState<NotesStats | null>(null);
  const [notes, setNotes] = useState<CreditDebitNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, [typeFilter, statusFilter]);

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (typeFilter !== 'all') params.append('noteType', typeFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const [statsRes, notesRes] = await Promise.all([
        apiClient.get<NotesStats>('/api/credit-debit-notes/stats'),
        apiClient.get<{ notes: CreditDebitNote[] }>(`/api/credit-debit-notes?${params}`),
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }

      if (notesRes.success && notesRes.data) {
        setNotes(notesRes.data.notes);
      }
    } catch (error) {
      console.error('Failed to fetch credit/debit notes:', error);
    } finally {
      setLoading(false);
    }
  }

  function getNoteTypeBadge(noteType: string) {
    const config: Record<string, { variant: any; icon: any; label: string; color: string }> = {
      CREDIT_NOTE_RECEIVED: {
        variant: 'default',
        icon: TrendingUp,
        label: 'Credit Received',
        color: 'text-green-600',
      },
      CREDIT_NOTE_ISSUED: {
        variant: 'secondary',
        icon: TrendingDown,
        label: 'Credit Issued',
        color: 'text-blue-600',
      },
      DEBIT_NOTE_RECEIVED: {
        variant: 'outline',
        icon: Plus,
        label: 'Debit Received',
        color: 'text-orange-600',
      },
      DEBIT_NOTE_ISSUED: {
        variant: 'destructive',
        icon: Minus,
        label: 'Debit Issued',
        color: 'text-red-600',
      },
    };

    const noteConfig = config[noteType] || {
      variant: 'outline',
      icon: FileText,
      label: noteType,
      color: 'text-muted-foreground',
    };
    const Icon = noteConfig.icon;

    return (
      <Badge variant={noteConfig.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {noteConfig.label}
      </Badge>
    );
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, { variant: any; icon: any }> = {
      PENDING: { variant: 'outline', icon: Clock },
      ADJUSTED: { variant: 'default', icon: CheckCircle },
      DISPUTED: { variant: 'destructive', icon: AlertTriangle },
    };

    const config = variants[status] || { variant: 'outline', icon: Clock };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  }

  if (loading && !stats) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Loading credit/debit notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Credit/Debit Notes</h1>
          <p className="text-muted-foreground">
            Manage invoice adjustments and corrections
          </p>
        </div>
        <Button>
          <FileText className="mr-2 h-4 w-4" />
          New Note
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Notes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                All credit/debit notes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credit Notes</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.creditNotesReceived + stats.creditNotesIssued}
              </div>
              <p className="text-xs text-muted-foreground">
                ₹{stats.totalCreditAmount.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Debit Notes</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.debitNotesReceived + stats.debitNotesIssued}
              </div>
              <p className="text-xs text-muted-foreground">
                ₹{stats.totalDebitAmount.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Adjustment</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">
                {stats.adjusted} adjusted, {stats.disputed} disputed
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Breakdown Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credit Received</CardTitle>
              <Plus className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.creditNotesReceived}</div>
              <p className="text-xs text-muted-foreground">From vendors</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credit Issued</CardTitle>
              <Minus className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.creditNotesIssued}</div>
              <p className="text-xs text-muted-foreground">To customers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Debit Received</CardTitle>
              <Plus className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.debitNotesReceived}</div>
              <p className="text-xs text-muted-foreground">From customers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Debit Issued</CardTitle>
              <Minus className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.debitNotesIssued}</div>
              <p className="text-xs text-muted-foreground">To vendors</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notes Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Credit/Debit Notes</CardTitle>
              <CardDescription>All invoice adjustments and corrections</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="CREDIT_NOTE_RECEIVED">Credit Received</SelectItem>
                  <SelectItem value="CREDIT_NOTE_ISSUED">Credit Issued</SelectItem>
                  <SelectItem value="DEBIT_NOTE_RECEIVED">Debit Received</SelectItem>
                  <SelectItem value="DEBIT_NOTE_ISSUED">Debit Issued</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="ADJUSTED">Adjusted</SelectItem>
                  <SelectItem value="DISPUTED">Disputed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No notes found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Create a credit or debit note to adjust invoices
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Note Number</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Original Invoice</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">GST</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notes.map((note) => (
                    <TableRow key={note.id}>
                      <TableCell className="font-medium">{note.noteNumber}</TableCell>
                      <TableCell>{getNoteTypeBadge(note.noteType)}</TableCell>
                      <TableCell>
                        {note.vendor && (
                          <div>
                            <div className="font-medium">{note.vendor.name}</div>
                            <div className="text-xs text-muted-foreground">Vendor</div>
                          </div>
                        )}
                        {note.customer && (
                          <div>
                            <div className="font-medium">{note.customer.name}</div>
                            <div className="text-xs text-muted-foreground">Customer</div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{new Date(note.noteDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {note.originalInvoiceRef || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{note.totalAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{(note.cgst + note.sgst + note.igst).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{note.totalWithGst.toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(note.status)}</TableCell>
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
