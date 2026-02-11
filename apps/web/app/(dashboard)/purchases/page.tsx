'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/upload/file-upload';
import { ShoppingCart } from 'lucide-react';
import { useState } from 'react';

export default function PurchasesPage() {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Purchases</h1>
          <p className="text-muted-foreground">
            Manage purchase orders and invoices
          </p>
        </div>
        <Button onClick={() => setShowUpload(!showUpload)}>
          Upload Purchase Documents
        </Button>
      </div>

      {showUpload && (
        <Card className="p-6">
          <h3 className="mb-4 font-semibold">Upload Purchase Documents</h3>
          <FileUpload
            documentType="PURCHASE_INVOICE"
            onUploadComplete={() => {
              setShowUpload(false);
              // Refresh purchase list
            }}
          />
        </Card>
      )}

      <Card className="p-12 text-center">
        <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 font-semibold">Purchase Module</h3>
        <p className="text-sm text-muted-foreground">
          Purchase orders and invoices will be displayed here
          <br />
          This module will be built in Phase 2
        </p>
      </Card>
    </div>
  );
}
