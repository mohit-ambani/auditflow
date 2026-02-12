'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Building2,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Upload,
  RefreshCw,
  ArrowUpDown,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface BankTransaction {
  id: string;
  transactionDate: string;
  description: string;
  referenceNumber: string | null;
  debit: number | null;
  credit: number | null;
  balance: number | null;
  matchStatus: string;
  statement?: any;
}

interface PaymentMatch {
  id: string;
  bankTransaction?: any;
  purchaseInvoice?: any;
  salesInvoice?: any;
  matchedAmount: number;
  matchType: string;
  createdAt: string;
}

export default function BankReconciliationPage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [matches, setMatches] = useState<PaymentMatch[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    matched: 0,
    unmatched: 0,
    totalAmount: 0,
    matchedAmount: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedTxn, setSelectedTxn] = useState<BankTransaction | null>(null);
  const [matchingInvoices, setMatchingInvoices] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [txnsRes, matchesRes, statsRes] = await Promise.all([
        apiClient.get<any>('/api/bank-transactions'),
        apiClient.get<any>('/api/payment-matches'),
        apiClient.get<any>('/api/bank-transactions/stats'),
      ]);

      if (txnsRes.data?.data?.transactions) setTransactions(txnsRes.data.data.transactions);
      if (matchesRes.data?.data?.matches) setMatches(matchesRes.data.data.matches);
      if (statsRes.data?.data) setStats(statsRes.data.data);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoMatch = async (txnId: string) => {
    try {
      const res = await apiClient.post<any>('/api/payment-matches/auto-match', {
        bankTxnId: txnId,
        invoiceType: 'purchase',
      });

      if (res.data?.success) {
        toast.success('Payment matched successfully!');
        fetchData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to match payment');
    }
  };

  const handleManualMatch = async (txnId: string, invoiceId: string, amount: number) => {
    try {
      const res = await apiClient.post<any>('/api/payment-matches', {
        bankTxnId: txnId,
        invoiceId,
        invoiceType: 'purchase',
        matchedAmount: amount,
      });

      if (res.data?.success) {
        toast.success('Payment manually matched!');
        setSelectedTxn(null);
        fetchData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to match payment');
    }
  };

  const filteredTransactions = transactions.filter(txn => {
    const matchesSearch =
      txn.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (txn.referenceNumber && txn.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const isMatched = txn.matchStatus === 'AUTO_MATCHED' || txn.matchStatus === 'MANUALLY_MATCHED';
    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'matched' && isMatched) ||
      (filterStatus === 'unmatched' && txn.matchStatus === 'UNMATCHED');

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Bank Reconciliation
          </h1>
          <p className="text-muted-foreground mt-2">
            Match bank transactions with invoices and track payments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Import Statement
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Matched
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.matched || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? Math.round((stats.matched / stats.total) * 100) : 0}% reconciled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unmatched
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.unmatched || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Needs attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Matched Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(stats.matchedAmount || 0).toLocaleString('en-IN')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by description or reference..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="matched">Matched</SelectItem>
                <SelectItem value="unmatched">Unmatched</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Transactions</CardTitle>
          <CardDescription>
            Review and reconcile your bank transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No transactions found. Upload a bank statement to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell className="font-medium">
                      {txn.transactionDate ? format(new Date(txn.transactionDate), 'dd-MMM-yyyy') : '-'}
                    </TableCell>
                    <TableCell>{txn.description}</TableCell>
                    <TableCell className="font-mono text-sm">{txn.referenceNumber || '-'}</TableCell>
                    <TableCell className="text-right text-red-600">
                      {txn.debit && txn.debit > 0 ? `₹${txn.debit.toLocaleString('en-IN')}` : '-'}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {txn.credit && txn.credit > 0 ? `₹${txn.credit.toLocaleString('en-IN')}` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {txn.balance ? `₹${txn.balance.toLocaleString('en-IN')}` : '-'}
                    </TableCell>
                    <TableCell>
                      {(txn.matchStatus === 'AUTO_MATCHED' || txn.matchStatus === 'MANUALLY_MATCHED') ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Matched
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Unmatched
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {txn.matchStatus === 'UNMATCHED' && (
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAutoMatch(txn.id)}
                          >
                            Auto Match
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedTxn(txn)}
                          >
                            Manual
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Matched Payments */}
      {matches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Matches</CardTitle>
            <CardDescription>
              Successfully matched payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Bank Reference</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches.slice(0, 10).map((match) => (
                  <TableRow key={match.id}>
                    <TableCell>
                      {format(new Date(match.createdAt), 'dd-MMM-yyyy')}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {match.bankTransaction?.referenceNumber || '-'}
                    </TableCell>
                    <TableCell>
                      {match.purchaseInvoice?.invoiceNumber || match.salesInvoice?.invoiceNumber || 'N/A'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{match.matchedAmount.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-green-600">
                        {match.matchType}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
