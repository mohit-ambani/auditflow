import { Card } from '@/components/ui/card';
import { Receipt } from 'lucide-react';

export default function SalesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sales</h1>
        <p className="text-muted-foreground">
          Manage sales invoices and customer payments
        </p>
      </div>

      <Card className="p-12 text-center">
        <Receipt className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 font-semibold">Sales Module</h3>
        <p className="text-sm text-muted-foreground">
          Sales invoices and payments will be displayed here
          <br />
          This module will be built in Phase 2
        </p>
      </Card>
    </div>
  );
}
