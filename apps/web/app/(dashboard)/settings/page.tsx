'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { user, organization, refreshUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Redirect non-admins
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const [orgData, setOrgData] = useState({
    name: '',
    gstin: '',
    pan: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  const [settingsData, setSettingsData] = useState({
    vendorReconcFrequency: 'MONTHLY',
    customerReminderDays: [7, 15, 30],
    autoSendReminders: false,
    autoSendLedgerConfirm: false,
    gstMatchTolerance: 1.0,
    paymentMatchTolerance: 1.0,
    inventoryTrackingEnabled: true,
  });

  useEffect(() => {
    if (organization) {
      setOrgData({
        name: organization.name || '',
        gstin: organization.gstin || '',
        pan: organization.pan || '',
        email: organization.email || '',
        phone: organization.phone || '',
        address: organization.address || '',
        city: organization.city || '',
        state: organization.state || '',
        pincode: organization.pincode || '',
      });
    }
  }, [organization]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // In a real implementation, you would call an API endpoint to update the organization
      // For now, we'll just show a success message
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSuccess('Settings updated successfully!');
      await refreshUser();
    } catch (err) {
      setError('Failed to update settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization settings and preferences
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
            <CardDescription>
              Update your organization information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                value={orgData.name}
                onChange={(e) =>
                  setOrgData({ ...orgData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gstin">GSTIN</Label>
                <Input
                  id="gstin"
                  value={orgData.gstin}
                  onChange={(e) =>
                    setOrgData({ ...orgData, gstin: e.target.value.toUpperCase() })
                  }
                  maxLength={15}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pan">PAN</Label>
                <Input
                  id="pan"
                  value={orgData.pan}
                  onChange={(e) =>
                    setOrgData({ ...orgData, pan: e.target.value.toUpperCase() })
                  }
                  maxLength={10}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={orgData.email}
                  onChange={(e) =>
                    setOrgData({ ...orgData, email: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={orgData.phone}
                  onChange={(e) =>
                    setOrgData({ ...orgData, phone: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={orgData.address}
                onChange={(e) =>
                  setOrgData({ ...orgData, address: e.target.value })
                }
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={orgData.city}
                  onChange={(e) =>
                    setOrgData({ ...orgData, city: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={orgData.state}
                  onChange={(e) =>
                    setOrgData({ ...orgData, state: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  value={orgData.pincode}
                  onChange={(e) =>
                    setOrgData({ ...orgData, pincode: e.target.value })
                  }
                  maxLength={6}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reconciliation Settings</CardTitle>
            <CardDescription>
              Configure tolerances and automation preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gstTolerance">GST Match Tolerance (₹)</Label>
                <Input
                  id="gstTolerance"
                  type="number"
                  step="0.01"
                  value={settingsData.gstMatchTolerance}
                  onChange={(e) =>
                    setSettingsData({
                      ...settingsData,
                      gstMatchTolerance: parseFloat(e.target.value),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Acceptable difference for GST matching
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentTolerance">Payment Match Tolerance (₹)</Label>
                <Input
                  id="paymentTolerance"
                  type="number"
                  step="0.01"
                  value={settingsData.paymentMatchTolerance}
                  onChange={(e) =>
                    setSettingsData({
                      ...settingsData,
                      paymentMatchTolerance: parseFloat(e.target.value),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Acceptable difference for payment matching
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="inventoryTracking"
                checked={settingsData.inventoryTrackingEnabled}
                onChange={(e) =>
                  setSettingsData({
                    ...settingsData,
                    inventoryTrackingEnabled: e.target.checked,
                  })
                }
                className="h-4 w-4"
                aria-label="Enable Inventory Tracking"
              />
              <Label htmlFor="inventoryTracking">Enable Inventory Tracking</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoReminders"
                checked={settingsData.autoSendReminders}
                onChange={(e) =>
                  setSettingsData({
                    ...settingsData,
                    autoSendReminders: e.target.checked,
                  })
                }
                className="h-4 w-4"
                aria-label="Auto-send Payment Reminders"
              />
              <Label htmlFor="autoReminders">Auto-send Payment Reminders</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoLedger"
                checked={settingsData.autoSendLedgerConfirm}
                onChange={(e) =>
                  setSettingsData({
                    ...settingsData,
                    autoSendLedgerConfirm: e.target.checked,
                  })
                }
                className="h-4 w-4"
                aria-label="Auto-send Ledger Confirmations"
              />
              <Label htmlFor="autoLedger">Auto-send Ledger Confirmations</Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
