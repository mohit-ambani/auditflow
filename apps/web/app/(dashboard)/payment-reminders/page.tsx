'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import {
  Bell,
  Send,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Calendar,
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

interface PaymentReminder {
  id: string;
  customerId: string;
  salesInvoiceId: string;
  reminderNumber: number;
  dueAmount: number;
  daysOverdue: number;
  status: string;
  sentAt: string | null;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  salesInvoice: {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    totalWithGst: number;
    amountReceived: number;
  };
}

interface ReminderStats {
  totalReminders: number;
  pending: number;
  sent: number;
  paymentReceived: number;
  escalated: number;
}

interface OverdueSummary {
  totalOverdue: number;
  totalAmount: number;
  by0to7Days: { count: number; amount: number };
  by8to30Days: { count: number; amount: number };
  by31to60Days: { count: number; amount: number };
  by60PlusDays: { count: number; amount: number };
}

export default function PaymentRemindersPage() {
  const [stats, setStats] = useState<ReminderStats | null>(null);
  const [overdueSummary, setOverdueSummary] = useState<OverdueSummary | null>(null);
  const [reminders, setReminders] = useState<PaymentReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  async function fetchData() {
    setLoading(true);
    try {
      const [statsRes, overdueRes, remindersRes] = await Promise.all([
        apiClient.get('/api/payment-reminders/stats'),
        apiClient.get('/api/payment-reminders/overdue'),
        apiClient.get(
          `/api/payment-reminders?limit=50${statusFilter !== 'all' ? `&status=${statusFilter}` : ''}`
        ),
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }

      if (overdueRes.success && overdueRes.data) {
        setOverdueSummary(overdueRes.data);
      }

      if (remindersRes.success && remindersRes.data) {
        setReminders(remindersRes.data.reminders);
      }
    } catch (error) {
      console.error('Failed to fetch payment reminders:', error);
    } finally {
      setLoading(false);
    }
  }

  async function generateReminders() {
    try {
      const response = await apiClient.post('/api/payment-reminders/generate');
      if (response.success) {
        alert(`Generated ${response.data.created} new reminders`);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to generate reminders:', error);
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, { variant: any; icon: any }> = {
      PENDING: { variant: 'outline', icon: Clock },
      SENT: { variant: 'secondary', icon: Send },
      PAYMENT_RECEIVED: { variant: 'default', icon: CheckCircle },
      ESCALATED: { variant: 'destructive', icon: AlertTriangle },
    };

    const config = variants[status] || { variant: 'outline', icon: Clock };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  }

  if (loading && !stats) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Loading payment reminders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Reminders</h1>
          <p className="text-muted-foreground">
            Automated customer payment reminders for overdue invoices
          </p>
        </div>
        <Button onClick={generateReminders}>
          <Bell className="mr-2 h-4 w-4" />
          Generate Reminders
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {overdueSummary && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Overdue</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overdueSummary.totalOverdue}</div>
                <p className="text-xs text-muted-foreground">
                  ₹{overdueSummary.totalAmount.toLocaleString()} outstanding
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">0-7 Days</CardTitle>
                <Calendar className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overdueSummary.by0to7Days.count}</div>
                <p className="text-xs text-muted-foreground">
                  ₹{overdueSummary.by0to7Days.amount.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">8-30 Days</CardTitle>
                <Calendar className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overdueSummary.by8to30Days.count}</div>
                <p className="text-xs text-muted-foreground">
                  ₹{overdueSummary.by8to30Days.amount.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">60+ Days</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overdueSummary.by60PlusDays.count}</div>
                <p className="text-xs text-muted-foreground">
                  ₹{overdueSummary.by60PlusDays.amount.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Reminder Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reminders</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalReminders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sent</CardTitle>
              <Send className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sent}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payment Received</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.paymentReceived}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Escalated</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.escalated}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reminders Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment Reminders</CardTitle>
              <CardDescription>Track automated customer reminders</CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="PAYMENT_RECEIVED">Payment Received</SelectItem>
                <SelectItem value="ESCALATED">Escalated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {reminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No reminders found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Generate reminders to start tracking overdue payments
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Due Amount</TableHead>
                    <TableHead className="text-right">Days Overdue</TableHead>
                    <TableHead>Reminder #</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reminders.map((reminder) => (
                    <TableRow key={reminder.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{reminder.customer.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {reminder.customer.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{reminder.salesInvoice.invoiceNumber}</TableCell>
                      <TableCell>
                        {new Date(reminder.salesInvoice.dueDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{reminder.dueAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            reminder.daysOverdue > 60
                              ? 'destructive'
                              : reminder.daysOverdue > 30
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {reminder.daysOverdue} days
                        </Badge>
                      </TableCell>
                      <TableCell>#{reminder.reminderNumber}</TableCell>
                      <TableCell>{getStatusBadge(reminder.status)}</TableCell>
                      <TableCell>
                        {reminder.sentAt ? (
                          new Date(reminder.sentAt).toLocaleDateString()
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {reminder.status === 'PENDING' && (
                          <Button size="sm" variant="outline">
                            <Send className="h-3 w-3 mr-1" />
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
