'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GitCompare,
  CreditCard,
  Receipt,
  Percent,
  Users,
  Bell,
  Package,
  FileText,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Play,
} from 'lucide-react';
import Link from 'next/link';

export default function ReconciliationPage() {
  const [activeModule, setActiveModule] = useState('overview');

  const modules = [
    {
      id: 'po-invoice',
      name: 'PO-Invoice Matching',
      icon: GitCompare,
      description: 'Match purchase orders with invoices',
      status: 'active',
      stats: { total: 0, matched: 0, pending: 0 },
      color: 'blue',
    },
    {
      id: 'payment',
      name: 'Payment Reconciliation',
      icon: CreditCard,
      description: 'Match bank transactions with invoices',
      status: 'active',
      stats: { total: 0, matched: 0, unmatched: 0 },
      color: 'green',
    },
    {
      id: 'gst',
      name: 'GST Reconciliation',
      icon: Receipt,
      description: 'Reconcile GSTR data with invoices',
      status: 'active',
      stats: { total: 0, itcAvailable: 0, mismatch: 0 },
      color: 'purple',
    },
    {
      id: 'discount',
      name: 'Discount Validation',
      icon: Percent,
      description: 'Validate discount compliance',
      status: 'active',
      stats: { total: 0, correct: 0, discrepancies: 0 },
      color: 'orange',
    },
    {
      id: 'vendor-ledger',
      name: 'Vendor Ledger Confirmation',
      icon: Users,
      description: 'Confirm balances with vendors',
      status: 'active',
      stats: { total: 0, confirmed: 0, pending: 0 },
      color: 'indigo',
    },
    {
      id: 'payment-reminders',
      name: 'Payment Reminders',
      icon: Bell,
      description: 'Automated customer reminders',
      status: 'active',
      stats: { total: 0, sent: 0, pending: 0 },
      color: 'red',
    },
    {
      id: 'inventory',
      name: 'Inventory Reconciliation',
      icon: Package,
      description: 'Track inventory discrepancies',
      status: 'active',
      stats: { total: 0, matched: 0, discrepancies: 0 },
      color: 'teal',
    },
    {
      id: 'credit-debit',
      name: 'Credit/Debit Notes',
      icon: FileText,
      description: 'Manage invoice adjustments',
      status: 'active',
      stats: { total: 0, pending: 0, adjusted: 0 },
      color: 'pink',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Reconciliation Center</h1>
        <p className="text-muted-foreground">
          Manage all reconciliation modules from one place
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Modules</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{modules.length}</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reconciliation Health</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85%</div>
            <p className="text-xs text-muted-foreground">Good overall health</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Items needing attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Matched</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Modules Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Card key={module.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`rounded-lg bg-${module.color}-50 p-3`}>
                    <Icon className={`h-6 w-6 text-${module.color}-600`} />
                  </div>
                  <Badge variant="outline" className="bg-green-50">
                    <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                    Active
                  </Badge>
                </div>
                <CardTitle className="mt-4">{module.name}</CardTitle>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    {Object.entries(module.stats).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-muted-foreground capitalize text-xs">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Link href={`/${module.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        View Details
                      </Button>
                    </Link>
                    <Button size="sm" variant="default">
                      <Play className="h-3 w-3 mr-1" />
                      Run
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common reconciliation tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/matches">
            <Button variant="outline" className="w-full justify-start">
              <GitCompare className="mr-2 h-4 w-4" />
              Match PO-Invoices
            </Button>
          </Link>
          <Link href="/discount-audits">
            <Button variant="outline" className="w-full justify-start">
              <Percent className="mr-2 h-4 w-4" />
              Run Discount Audit
            </Button>
          </Link>
          <Button variant="outline" className="w-full justify-start">
            <Bell className="mr-2 h-4 w-4" />
            Send Reminders
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <Package className="mr-2 h-4 w-4" />
            Reconcile Inventory
          </Button>
        </CardContent>
      </Card>

      {/* Module Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>
            All reconciliation modules are functioning normally
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <div
                  key={module.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{module.name}</span>
                  </div>
                  <Badge variant="outline" className="bg-green-50">
                    <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                    Operational
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
