'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

interface Match {
  id: string;
  matchType: 'EXACT' | 'PARTIAL_QTY' | 'PARTIAL_VALUE' | 'PARTIAL_BOTH' | 'NO_MATCH';
  matchScore: number;
  qtyMatch: boolean;
  valueMatch: boolean;
  gstMatch: boolean;
  createdAt: string;
  resolvedAt: string | null;
  invoice: {
    invoiceNumber: string;
    invoiceDate: string;
    totalWithGst: number;
    vendor: {
      name: string;
    };
  };
  po: {
    poNumber: string;
    poDate: string;
    totalWithGst: number;
  };
}

export default function MatchesPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'exact' | 'partial' | 'review'>('all');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchMatches();
  }, [filter]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter === 'exact') params.append('matchType', 'EXACT');
      if (filter === 'partial')
        params.append('matchType', 'PARTIAL_QTY,PARTIAL_VALUE,PARTIAL_BOTH');
      if (filter === 'review') params.append('needsReview', 'true');

      const response = await apiClient.get(`/api/po-invoice-matches?${params.toString()}`);
      if (response.success) {
        setMatches(response.data.matches);
        setTotal(response.data.total);
      }
    } catch (error) {
      console.error('Failed to fetch matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMatchBadge = (match: Match) => {
    if (match.matchType === 'EXACT') {
      return <Badge className="bg-green-500">Exact Match</Badge>;
    } else if (match.matchScore >= 90) {
      return <Badge className="bg-blue-500">High Confidence</Badge>;
    } else if (match.matchScore >= 70) {
      return <Badge className="bg-yellow-500">Medium Confidence</Badge>;
    } else {
      return <Badge variant="destructive">Low Confidence</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">PO-Invoice Matches</h1>
          <p className="text-muted-foreground mt-1">
            Review and manage automatic matching results
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            size="sm"
          >
            All Matches
          </Button>
          <Button
            variant={filter === 'exact' ? 'default' : 'outline'}
            onClick={() => setFilter('exact')}
            size="sm"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Exact
          </Button>
          <Button
            variant={filter === 'partial' ? 'default' : 'outline'}
            onClick={() => setFilter('partial')}
            size="sm"
          >
            <AlertCircle className="mr-2 h-4 w-4" />
            Partial
          </Button>
          <Button
            variant={filter === 'review' ? 'default' : 'outline'}
            onClick={() => setFilter('review')}
            size="sm"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Needs Review
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium">Match Score</th>
                <th className="px-6 py-3 text-left text-sm font-medium">PO Number</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Invoice Number</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Vendor</th>
                <th className="px-6 py-3 text-left text-sm font-medium">PO Amount</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Invoice Amount</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                    Loading matches...
                  </td>
                </tr>
              ) : matches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                    No matches found.
                  </td>
                </tr>
              ) : (
                matches.map((match) => (
                  <tr
                    key={match.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => router.push(`/matches/${match.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{match.matchScore.toFixed(1)}%</span>
                        {getMatchBadge(match)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium font-mono">{match.po.poNumber}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(match.po.poDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium font-mono">{match.invoice.invoiceNumber}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(match.invoice.invoiceDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">{match.invoice.vendor.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">{formatCurrency(match.po.totalWithGst)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">{formatCurrency(match.invoice.totalWithGst)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {match.qtyMatch ? (
                          <Badge variant="outline" className="text-xs">
                            ✓ Qty
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            ✗ Qty
                          </Badge>
                        )}
                        {match.valueMatch ? (
                          <Badge variant="outline" className="text-xs">
                            ✓ Value
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            ✗ Value
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {match.resolvedAt ? (
                        <Badge variant="outline">Resolved</Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/matches/${match.id}`);
                          }}
                        >
                          Review
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {total > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {matches.length} of {total} matches
        </div>
      )}
    </div>
  );
}
