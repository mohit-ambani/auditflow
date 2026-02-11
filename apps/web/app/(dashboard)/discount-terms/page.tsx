'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { Plus, Percent, DollarSign, Calendar, CheckCircle } from 'lucide-react';
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

interface DiscountTerm {
  id: string;
  vendorId: string;
  termType: string;
  description: string;
  flatPercent: number | null;
  flatAmount: number | null;
  slabs: any[];
  minOrderValue: number | null;
  paymentWithinDays: number | null;
  latePaymentPenaltyPercent: number | null;
  lateDeliveryPenaltyPerDay: number | null;
  validFrom: string;
  validTo: string | null;
  isActive: boolean;
  vendor: {
    id: string;
    name: string;
    gstin: string;
  };
}

export default function DiscountTermsPage() {
  const [terms, setTerms] = useState<DiscountTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchTerms();
  }, [typeFilter]);

  async function fetchTerms() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '100',
        isActive: 'true',
      });

      if (typeFilter !== 'all') {
        params.append('termType', typeFilter);
      }

      const response = await apiClient.get(`/api/discount-terms?${params}`);

      if (response.success && response.data) {
        setTerms(response.data.discountTerms);
      }
    } catch (error) {
      console.error('Failed to fetch discount terms:', error);
    } finally {
      setLoading(false);
    }
  }

  function getTermTypeBadge(type: string) {
    const variants: Record<string, any> = {
      TRADE_DISCOUNT: 'default',
      CASH_DISCOUNT: 'secondary',
      VOLUME_REBATE: 'outline',
      LATE_PAYMENT_PENALTY: 'destructive',
      LATE_DELIVERY_PENALTY: 'destructive',
      SPECIAL_SCHEME: 'outline',
    };

    return (
      <Badge variant={variants[type] || 'outline'}>
        {type.replace(/_/g, ' ')}
      </Badge>
    );
  }

  function formatDiscountValue(term: DiscountTerm): string {
    if (term.flatPercent) {
      return `${term.flatPercent}%`;
    }
    if (term.flatAmount) {
      return `₹${term.flatAmount.toLocaleString()}`;
    }
    if (term.slabs && term.slabs.length > 0) {
      return `${term.slabs.length} slabs`;
    }
    if (term.latePaymentPenaltyPercent) {
      return `${term.latePaymentPenaltyPercent}% p.a.`;
    }
    if (term.lateDeliveryPenaltyPerDay) {
      return `₹${term.lateDeliveryPenaltyPerDay}/day`;
    }
    return 'N/A';
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Loading discount terms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Discount Terms</h1>
          <p className="text-muted-foreground">
            Manage vendor discount agreements and penalty terms
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Term
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Terms</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{terms.length}</div>
            <p className="text-xs text-muted-foreground">
              Across all vendors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trade Discounts</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {terms.filter((t) => t.termType === 'TRADE_DISCOUNT').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Standard vendor discounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Discounts</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {terms.filter((t) => t.termType === 'CASH_DISCOUNT').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Early payment incentives
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Penalty Terms</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {terms.filter((t) =>
                t.termType.includes('PENALTY')
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Late payment/delivery
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Terms Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Discount Terms</CardTitle>
              <CardDescription>
                View and manage all discount agreements
              </CardDescription>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="TRADE_DISCOUNT">Trade Discount</SelectItem>
                <SelectItem value="CASH_DISCOUNT">Cash Discount</SelectItem>
                <SelectItem value="VOLUME_REBATE">Volume Rebate</SelectItem>
                <SelectItem value="LATE_PAYMENT_PENALTY">Late Payment Penalty</SelectItem>
                <SelectItem value="LATE_DELIVERY_PENALTY">Late Delivery Penalty</SelectItem>
                <SelectItem value="SPECIAL_SCHEME">Special Scheme</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {terms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Percent className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No discount terms found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Add vendor discount terms to enable compliance monitoring
              </p>
              <Button className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Add First Term
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Conditions</TableHead>
                    <TableHead>Valid Period</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {terms.map((term) => (
                    <TableRow key={term.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{term.vendor.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {term.vendor.gstin}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getTermTypeBadge(term.termType)}</TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={term.description}>
                          {term.description}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatDiscountValue(term)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          {term.minOrderValue && (
                            <div className="text-xs text-muted-foreground">
                              Min order: ₹{term.minOrderValue.toLocaleString()}
                            </div>
                          )}
                          {term.paymentWithinDays && (
                            <div className="text-xs text-muted-foreground">
                              Payment: {term.paymentWithinDays} days
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{new Date(term.validFrom).toLocaleDateString()}</div>
                          {term.validTo && (
                            <div className="text-xs text-muted-foreground">
                              to {new Date(term.validTo).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={term.isActive ? 'default' : 'outline'}>
                          {term.isActive ? 'Active' : 'Inactive'}
                        </Badge>
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
