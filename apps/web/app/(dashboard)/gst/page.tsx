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
  Receipt,
  Search,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  FileText,
  Calendar,
  IndianRupee
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface GSTMatch {
  id: string;
  matchType: string;
  matchScore: number;
  valueDiff: number | null;
  gstDiff: number | null;
  itcStatus: string | null;
  createdAt: string;
  gstEntry: {
    counterpartyGstin: string;
    counterpartyName: string | null;
    invoiceNumber: string | null;
    invoiceDate: string | null;
    invoiceValue: number | null;
    taxableValue: number | null;
    cgst: number | null;
    sgst: number | null;
    igst: number | null;
  };
  purchaseInvoice?: {
    invoiceNumber: string;
    invoiceDate: string;
    totalWithGst: number;
    cgst: number;
    sgst: number;
    igst: number;
    vendor: {
      name: string;
      gstin: string | null;
    };
  };
}

interface GSTStats {
  totalMatches: number;
  exactMatches: number;
  partialMatches: number;
  totalITCValue: number;
  availableITCValue: number;
  blockedITCValue: number;
  itcAvailable: number;
  itcMismatch: number;
}

export default function GSTReconciliationPage() {
  const [loading, setLoading] = useState(true);
  const [gstMatches, setGstMatches] = useState<GSTMatch[]>([]);
  const [stats, setStats] = useState<GSTStats>({
    totalMatches: 0,
    exactMatches: 0,
    partialMatches: 0,
    totalITCValue: 0,
    availableITCValue: 0,
    blockedITCValue: 0,
    itcAvailable: 0,
    itcMismatch: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current');

  useEffect(() => {
    fetchData();
  }, [selectedPeriod]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [matchesRes, statsRes] = await Promise.all([
        apiClient.get('/api/gst-matches'),
        apiClient.get('/api/gst-matches/stats'),
      ]);

      if (matchesRes.data?.data?.matches) setGstMatches(matchesRes.data.data.matches);
      if (statsRes.data?.data) setStats(statsRes.data.data);
    } catch (error: any) {
      console.error('Error fetching GST data:', error);
      toast.error('Failed to load GST data');
    } finally {
      setLoading(false);
    }
  };

  const handleReconcile = async (returnId: string) => {
    try {
      const res = await apiClient.post('/api/gst-matches/reconcile', {
        returnId,
        autoSave: true,
      });

      if (res.data?.success) {
        toast.success('GST return reconciled successfully!');
        fetchData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reconcile');
    }
  };

  const filteredMatches = gstMatches.filter(match => {
    const matchesSearch =
      match.gstEntry.counterpartyGstin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (match.gstEntry.invoiceNumber && match.gstEntry.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const isMatched = match.matchType === 'EXACT' || match.matchType === 'PARTIAL_QTY';
    const hasDiscrepancy = (match.valueDiff && Math.abs(match.valueDiff) > 1) || (match.gstDiff && Math.abs(match.gstDiff) > 1);

    const matchesFilter =
      filterType === 'all' ||
      (filterType === 'matched' && isMatched) ||
      (filterType === 'unmatched' && !isMatched) ||
      (filterType === 'discrepancy' && hasDiscrepancy);

    return matchesSearch && matchesFilter;
  });

  const getMatchBadge = (match: GSTMatch) => {
    if (match.matchType === 'EXACT') {
      return (
        <Badge variant="default" className="bg-green-600">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Exact Match
        </Badge>
      );
    }

    if (match.matchType === 'PARTIAL_QTY') {
      return (
        <Badge variant="secondary" className="bg-yellow-600 text-white">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Partial Match
        </Badge>
      );
    }

    return (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" />
        Not Matched
      </Badge>
    );
  };

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
            <Receipt className="h-8 w-8" />
            GST Reconciliation
          </h1>
          <p className="text-muted-foreground mt-2">
            Reconcile GSTR-2A/2B with purchase invoices and track ITC
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload GSTR-2A
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Total Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMatches}</div>
            <div className="flex gap-2 mt-2 text-xs">
              <span className="text-green-600">✓ {stats.exactMatches} exact</span>
              <span className="text-yellow-600">⚠ {stats.partialMatches} partial</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total ITC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(stats.totalITCValue || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Input Tax Credit claimed
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Available ITC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              ₹{(stats.availableITCValue || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-green-600 mt-1">
              {stats.totalITCValue > 0
                ? `${Math.round((stats.availableITCValue / stats.totalITCValue) * 100)}% of total`
                : '0%'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Blocked ITC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">
              ₹{(stats.blockedITCValue || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-red-600 mt-1">
              Needs attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Period Selector and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[200px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current Month</SelectItem>
                <SelectItem value="jan2024">January 2024</SelectItem>
                <SelectItem value="feb2024">February 2024</SelectItem>
                <SelectItem value="q4-2023">Q4 FY 2023-24</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by GSTIN or invoice number..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entries</SelectItem>
                <SelectItem value="matched">Matched</SelectItem>
                <SelectItem value="unmatched">Unmatched</SelectItem>
                <SelectItem value="discrepancy">With Discrepancy</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Entries</TabsTrigger>
          <TabsTrigger value="matched">Matched</TabsTrigger>
          <TabsTrigger value="discrepancies">Discrepancies</TabsTrigger>
          <TabsTrigger value="itc">ITC Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>GST Return Entries (GSTR-2A/2B)</CardTitle>
              <CardDescription>
                Compare supplier GSTIN entries with your purchase records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>GSTIN</TableHead>
                    <TableHead>Invoice No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Invoice Value</TableHead>
                    <TableHead className="text-right">Taxable Value</TableHead>
                    <TableHead className="text-right">IGST</TableHead>
                    <TableHead className="text-right">CGST</TableHead>
                    <TableHead className="text-right">SGST</TableHead>
                    <TableHead className="text-right">ITC</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMatches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                        No GST entries found. Upload GSTR-2A/2B to start reconciliation.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMatches.map((match) => {
                      const itcAmount = (match.gstEntry.cgst || 0) + (match.gstEntry.sgst || 0) + (match.gstEntry.igst || 0);
                      const isMatched = match.matchType === 'EXACT' || match.matchType === 'PARTIAL_QTY';
                      const hasDiscrepancy = (match.valueDiff && Math.abs(match.valueDiff) > 1) || (match.gstDiff && Math.abs(match.gstDiff) > 1);

                      return (
                        <TableRow key={match.id}>
                          <TableCell className="font-mono text-xs">{match.gstEntry.counterpartyGstin}</TableCell>
                          <TableCell className="font-medium">{match.gstEntry.invoiceNumber || '-'}</TableCell>
                          <TableCell>
                            {match.gstEntry.invoiceDate ? format(new Date(match.gstEntry.invoiceDate), 'dd-MMM-yy') : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {match.gstEntry.invoiceValue ? `₹${match.gstEntry.invoiceValue.toLocaleString('en-IN')}` : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {match.gstEntry.taxableValue ? `₹${match.gstEntry.taxableValue.toLocaleString('en-IN')}` : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {match.gstEntry.igst && match.gstEntry.igst > 0 ? `₹${match.gstEntry.igst.toLocaleString('en-IN')}` : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {match.gstEntry.cgst && match.gstEntry.cgst > 0 ? `₹${match.gstEntry.cgst.toLocaleString('en-IN')}` : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {match.gstEntry.sgst && match.gstEntry.sgst > 0 ? `₹${match.gstEntry.sgst.toLocaleString('en-IN')}` : '-'}
                          </TableCell>
                          <TableCell className="text-right font-bold text-green-600">
                            ₹{itcAmount.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell>{getMatchBadge(match)}</TableCell>
                          <TableCell className="text-right">
                            {!isMatched && (
                              <Button size="sm" variant="outline">
                                Match
                              </Button>
                            )}
                            {hasDiscrepancy && (
                              <Button size="sm" variant="ghost" className="text-yellow-600">
                                Review
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matched" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Matched Entries</CardTitle>
              <CardDescription>
                Successfully reconciled GST entries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                {gstMatches.filter(m => m.matchType === 'EXACT' || m.matchType === 'PARTIAL_QTY').length} matched entries
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discrepancies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Discrepancies Found</CardTitle>
              <CardDescription>
                Entries with value mismatches or missing invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                {gstMatches.filter(m =>
                  (m.valueDiff && Math.abs(m.valueDiff) > 1) ||
                  (m.gstDiff && Math.abs(m.gstDiff) > 1)
                ).length} entries with discrepancies
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="itc" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Input Tax Credit Summary</CardTitle>
              <CardDescription>
                ITC availability and reconciliation status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Total ITC as per GSTR-2A</div>
                    <div className="text-2xl font-bold mt-2">
                      ₹{(stats.totalITCValue || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg bg-green-50">
                    <div className="text-sm text-green-700">Available for Credit</div>
                    <div className="text-2xl font-bold text-green-700 mt-2">
                      ₹{(stats.availableITCValue || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg bg-red-50">
                    <div className="text-sm text-red-700">Blocked/Ineligible</div>
                    <div className="text-2xl font-bold text-red-700 mt-2">
                      ₹{(stats.blockedITCValue || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
