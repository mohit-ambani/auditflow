'use client';

import { useChatStore } from '@/lib/chat-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Table, BarChart } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ChatSidePanel() {
  const { sidePanelData, setSidePanelData } = useChatStore();

  if (!sidePanelData) return null;

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          {sidePanelData.type === 'table' && <Table className="h-4 w-4" />}
          {sidePanelData.type === 'chart' && <BarChart className="h-4 w-4" />}
          <h3 className="font-semibold">{sidePanelData.title}</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidePanelData(null)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        {sidePanelData.type === 'json' && (
          <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto">
            {JSON.stringify(sidePanelData.data, null, 2)}
          </pre>
        )}

        {sidePanelData.type === 'table' && (
          <ResultTable data={sidePanelData.data} />
        )}

        {sidePanelData.type === 'document' && (
          <div className="prose prose-sm max-w-none">
            {/* Document preview would go here */}
            <pre>{JSON.stringify(sidePanelData.data, null, 2)}</pre>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function ResultTable({ data }: { data: any }) {
  if (!data) return null;

  // Handle array of objects (most common case)
  if (Array.isArray(data) && data.length > 0) {
    const keys = Object.keys(data[0]);

    return (
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              {keys.map((key) => (
                <th key={key} className="px-4 py-2 text-left font-medium">
                  {key.replace(/_/g, ' ').toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-t">
                {keys.map((key) => (
                  <td key={key} className="px-4 py-2">
                    {formatCellValue(row[key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Handle single object
  if (typeof data === 'object' && !Array.isArray(data)) {
    return (
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {Object.entries(data).map(([key, value]) => (
              <tr key={key} className="border-t first:border-t-0">
                <td className="px-4 py-2 font-medium bg-muted">
                  {key.replace(/_/g, ' ').toUpperCase()}
                </td>
                <td className="px-4 py-2">
                  {formatCellValue(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <pre className="text-sm bg-muted p-4 rounded-lg">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function formatCellValue(value: any): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    // Format currency if it looks like an amount
    if (value > 1000 || value < -1000) {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
      }).format(value);
    }
    return value.toString();
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
