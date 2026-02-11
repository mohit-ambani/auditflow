'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

interface Vendor {
  id: string;
  name: string;
  gstin: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  paymentTermsDays: number | null;
  isActive: boolean;
  createdAt: string;
}

export default function VendorsPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchVendors();
  }, [search, isActiveFilter]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (isActiveFilter !== 'all') {
        params.append('isActive', isActiveFilter === 'active' ? 'true' : 'false');
      }

      const response = await apiClient.get(`/api/vendors?${params.toString()}`);
      if (response.success) {
        setVendors(response.data.vendors);
        setTotal(response.data.total);
      }
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vendors</h1>
          <p className="text-muted-foreground mt-1">
            Manage your vendor master data
          </p>
        </div>
        <Button onClick={() => router.push('/vendors/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors by name, GSTIN, email..."
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
                <th className="px-6 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-6 py-3 text-left text-sm font-medium">GSTIN</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Contact</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Location</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Payment Terms</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    Loading vendors...
                  </td>
                </tr>
              ) : vendors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    No vendors found. Create your first vendor to get started.
                  </td>
                </tr>
              ) : (
                vendors.map((vendor) => (
                  <tr
                    key={vendor.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => router.push(`/vendors/${vendor.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium">{vendor.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-mono">{vendor.gstin || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">{vendor.email || '-'}</div>
                      <div className="text-sm text-muted-foreground">{vendor.phone || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {vendor.city || '-'}
                        {vendor.state && `, ${vendor.state}`}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {vendor.paymentTermsDays ? `${vendor.paymentTermsDays} days` : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={vendor.isActive ? 'default' : 'secondary'}>
                        {vendor.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/vendors/${vendor.id}/edit`);
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
          Showing {vendors.length} of {total} vendors
        </div>
      )}
    </div>
  );
}
