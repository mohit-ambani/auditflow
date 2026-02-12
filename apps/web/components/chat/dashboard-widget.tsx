'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  Upload,
  Users,
  FileText,
  CreditCard,
  GitCompare
} from 'lucide-react';

interface DashboardWidgetProps {
  widgetType: 'summary' | 'vendor_aging' | 'gst_status' | 'recent_uploads' | 'reconciliation_health';
  data: any;
  period?: string;
}

export function DashboardWidget({ widgetType, data, period = 'month' }: DashboardWidgetProps) {
  switch (widgetType) {
    case 'summary':
      return <SummaryWidget data={data} period={period} />;
    case 'vendor_aging':
      return <VendorAgingWidget data={data} />;
    case 'gst_status':
      return <GSTStatusWidget data={data} />;
    case 'recent_uploads':
      return <RecentUploadsWidget data={data} />;
    case 'reconciliation_health':
      return <ReconciliationHealthWidget data={data} />;
    default:
      return null;
  }
}

function SummaryWidget({ data, period }: { data: any; period: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Documents Uploaded</CardTitle>
          <Upload className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.uploads || 0}</div>
          <p className="text-xs text-muted-foreground">This {period}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">PO Matches</CardTitle>
          <GitCompare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.po_matches || 0}</div>
          <div className="flex gap-1 mt-2">
            <Badge variant="outline" className="text-xs">
              {data.po_exact || 0} Exact
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Payment Matches</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.payment_matches || 0}</div>
          <div className="flex gap-1 mt-2">
            <Badge variant="outline" className="text-xs">
              {data.unmatched || 0} Unmatched
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overall Health</CardTitle>
          {(data.health || 0) >= 80 ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-yellow-600" />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.health || 0}%</div>
          <Progress value={data.health || 0} className="mt-2" />
        </CardContent>
      </Card>
    </div>
  );
}

function VendorAgingWidget({ data }: { data: any }) {
  const aging = data.aging || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendor Aging</CardTitle>
        <CardDescription>Outstanding payments by age</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {aging.map((item: any, index: number) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${
                  item.days <= 30 ? 'bg-green-500' :
                  item.days <= 60 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`} />
                <div>
                  <p className="text-sm font-medium">{item.range}</p>
                  <p className="text-xs text-muted-foreground">{item.count} invoices</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">₹{item.amount.toLocaleString('en-IN')}</p>
                <p className="text-xs text-muted-foreground">{item.percentage}%</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function GSTStatusWidget({ data }: { data: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>GST Reconciliation Status</CardTitle>
        <CardDescription>Input Tax Credit tracking</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{data.itc_available || 0}</p>
              <p className="text-xs text-muted-foreground">ITC Available</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{data.itc_mismatch || 0}</p>
              <p className="text-xs text-muted-foreground">Mismatches</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{data.total_matches || 0}</p>
              <p className="text-xs text-muted-foreground">Total Matches</p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">ITC Claim Rate</span>
              <span className="text-sm font-bold">{data.claim_rate || 0}%</span>
            </div>
            <Progress value={data.claim_rate || 0} className="h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentUploadsWidget({ data }: { data: any }) {
  const uploads = data.uploads || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Uploads</CardTitle>
        <CardDescription>Latest document uploads</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {uploads.map((upload: any, index: number) => (
            <div key={index} className="flex items-center justify-between border-b pb-2 last:border-0">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{upload.file_name}</p>
                  <p className="text-xs text-muted-foreground">{upload.document_type}</p>
                </div>
              </div>
              <div className="text-right">
                {upload.status === 'COMPLETED' ? (
                  <Badge variant="outline" className="bg-green-50">
                    <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                    Done
                  </Badge>
                ) : upload.status === 'PROCESSING' ? (
                  <Badge variant="outline" className="bg-blue-50">
                    <Clock className="h-3 w-3 mr-1 text-blue-600" />
                    Processing
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-50">
                    <AlertCircle className="h-3 w-3 mr-1 text-red-600" />
                    Failed
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ReconciliationHealthWidget({ data }: { data: any }) {
  const modules = data.modules || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reconciliation Health</CardTitle>
        <CardDescription>Success rates by module</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {modules.map((module: any, index: number) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{module.name}</span>
                  {module.rate >= 90 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : module.rate >= 70 ? (
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <span className="text-sm font-bold">{module.rate}%</span>
              </div>
              <Progress
                value={module.rate}
                className={`h-2 ${
                  module.rate >= 90 ? '[&>*]:bg-green-600' :
                  module.rate >= 70 ? '[&>*]:bg-yellow-600' :
                  '[&>*]:bg-red-600'
                }`}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
