'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

interface SKU {
  id: string;
  skuCode: string;
  name: string;
  description: string | null;
  hsnCode: string | null;
  unit: string;
  gstRate: number | null;
  category: string | null;
  subCategory: string | null;
  aliases: string[];
  isActive: boolean;
}

export default function SKUsPage() {
  const router = useRouter();
  const [skus, setSKUs] = useState<SKU[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchSKUs();
  }, [search, categoryFilter, isActiveFilter]);

  const fetchSKUs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (categoryFilter) params.append('category', categoryFilter);
      if (isActiveFilter !== 'all') {
        params.append('isActive', isActiveFilter === 'active' ? 'true' : 'false');
      }

      const response = await apiClient.get(`/api/skus?${params.toString()}`);
      if (response.success) {
        setSKUs(response.data.skus);
        setTotal(response.data.total);
      }
    } catch (error) {
      console.error('Failed to fetch SKUs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SKU Master</h1>
          <p className="text-muted-foreground mt-1">Manage your product/SKU master data</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/skus/bulk-import')}>
            Bulk Import
          </Button>
          <Button onClick={() => router.push('/skus/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add SKU
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by SKU code, name, HSN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={isActiveFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setIsActiveFilter('all')}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={isActiveFilter === 'active' ? 'default' : 'outline'}
            onClick={() => setIsActiveFilter('active')}
            size="sm"
          >
            Active
          </Button>
          <Button
            variant={isActiveFilter === 'inactive' ? 'default' : 'outline'}
            onClick={() => setIsActiveFilter('inactive')}
            size="sm"
          >
            Inactive
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium">SKU Code</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-6 py-3 text-left text-sm font-medium">HSN Code</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Category</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Unit</th>
                <th className="px-6 py-3 text-left text-sm font-medium">GST Rate</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Aliases</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-muted-foreground">
                    Loading SKUs...
                  </td>
                </tr>
              ) : skus.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-muted-foreground">
                    No SKUs found. Create your first SKU to get started.
                  </td>
                </tr>
              ) : (
                skus.map((sku) => (
                  <tr
                    key={sku.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => router.push(`/skus/${sku.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium font-mono">{sku.skuCode}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{sku.name}</div>
                      {sku.description && (
                        <div className="text-sm text-muted-foreground truncate max-w-xs">
                          {sku.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-mono">{sku.hsnCode || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">{sku.category || '-'}</div>
                      {sku.subCategory && (
                        <div className="text-xs text-muted-foreground">{sku.subCategory}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">{sku.unit}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {sku.gstRate !== null ? `${sku.gstRate}%` : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {sku.aliases.length > 0 ? (
                          sku.aliases.slice(0, 2).map((alias, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {alias}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                        {sku.aliases.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{sku.aliases.length - 2}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={sku.isActive ? 'default' : 'secondary'}>
                        {sku.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/skus/${sku.id}/edit`);
                        }}
                      >
                        Edit
                      </Button>
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
          Showing {skus.length} of {total} SKUs
        </div>
      )}
    </div>
  );
}
