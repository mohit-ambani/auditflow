'use client';

import { useState } from 'react';
import { useChatStore } from '@/lib/chat-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { X, Table as TableIcon, BarChart, FileText, Edit3, Save, Download, GitCompareArrows } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

export function ChatSidePanel() {
  const { sidePanelData, setSidePanelData } = useChatStore();
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('view');

  if (!sidePanelData) return null;

  const handleEdit = () => {
    setEditedData(sidePanelData.data);
    setEditMode(true);
    setActiveTab('edit');
  };

  const handleSave = () => {
    toast.success('Changes saved');
    setEditMode(false);
    // TODO: Send edited data back to backend
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(sidePanelData.data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sidePanelData.title.replace(/\s+/g, '-').toLowerCase()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported');
  };

  const getIcon = () => {
    switch (sidePanelData.type) {
      case 'table':
        return <TableIcon className="h-4 w-4" />;
      case 'chart':
        return <BarChart className="h-4 w-4" />;
      case 'document':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const hasEditableData = sidePanelData.type === 'json' ||
                         (sidePanelData.type === 'table' && typeof sidePanelData.data === 'object');

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          {getIcon()}
          <h3 className="font-semibold">{sidePanelData.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {hasEditableData && !editMode && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleEdit}
              title="Edit data"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExport}
            title="Export data"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidePanelData(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      {hasEditableData ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
          <div className="border-b px-4">
            <TabsList className="w-full justify-start bg-transparent p-0 h-auto">
              <TabsTrigger value="view" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                View
              </TabsTrigger>
              <TabsTrigger value="edit" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                Edit
              </TabsTrigger>
              <TabsTrigger value="diff" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                Diff
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <TabsContent value="view" className="p-4 m-0">
              <ViewContent data={sidePanelData.data} type={sidePanelData.type} />
            </TabsContent>

            <TabsContent value="edit" className="p-4 m-0">
              <EditContent
                data={editedData || sidePanelData.data}
                onChange={setEditedData}
                onSave={handleSave}
              />
            </TabsContent>

            <TabsContent value="diff" className="p-4 m-0">
              <DiffView
                original={sidePanelData.data}
                edited={editedData}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      ) : (
        <ScrollArea className="flex-1 p-4">
          <ViewContent data={sidePanelData.data} type={sidePanelData.type} />
        </ScrollArea>
      )}

      {/* Action Footer */}
      {editMode && (
        <div className="flex items-center justify-end gap-2 border-t p-4">
          <Button variant="outline" onClick={() => {
            setEditMode(false);
            setActiveTab('view');
            setEditedData(null);
          }}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}

// View Content Component
function ViewContent({ data, type }: { data: any; type: string }) {
  if (type === 'json') {
    return (
      <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  }

  if (type === 'table') {
    return <ResultTable data={data} />;
  }

  if (type === 'document') {
    return (
      <div className="prose prose-sm max-w-none">
        <pre className="text-sm bg-muted p-4 rounded-lg">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <pre className="text-sm bg-muted p-4 rounded-lg">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

// Edit Content Component
function EditContent({ data, onChange, onSave }: { data: any; onChange: (data: any) => void; onSave: () => void }) {
  if (!data || typeof data !== 'object') {
    return (
      <div className="text-sm text-muted-foreground">
        This data type cannot be edited
      </div>
    );
  }

  const handleFieldChange = (key: string, value: any) => {
    onChange({ ...data, [key]: value });
  };

  // If it's an array, show a warning
  if (Array.isArray(data)) {
    return (
      <div className="space-y-4">
        <Badge variant="secondary">Array editing coming soon</Badge>
        <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  }

  // Edit object fields
  return (
    <div className="space-y-4">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="space-y-2">
          <Label htmlFor={key} className="text-sm font-medium">
            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Label>
          {typeof value === 'boolean' ? (
            <select
              id={key}
              value={value ? 'true' : 'false'}
              onChange={(e) => handleFieldChange(key, e.target.value === 'true')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          ) : typeof value === 'number' ? (
            <Input
              id={key}
              type="number"
              value={value}
              onChange={(e) => handleFieldChange(key, parseFloat(e.target.value) || 0)}
            />
          ) : typeof value === 'object' ? (
            <textarea
              id={key}
              value={JSON.stringify(value, null, 2)}
              onChange={(e) => {
                try {
                  handleFieldChange(key, JSON.parse(e.target.value));
                } catch (err) {
                  // Invalid JSON, ignore
                }
              }}
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
            />
          ) : (
            <Input
              id={key}
              type="text"
              value={String(value || '')}
              onChange={(e) => handleFieldChange(key, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Diff View Component
function DiffView({ original, edited }: { original: any; edited: any }) {
  if (!edited) {
    return (
      <div className="text-sm text-muted-foreground">
        No changes to compare. Click Edit to make changes.
      </div>
    );
  }

  if (typeof original !== 'object' || typeof edited !== 'object') {
    return (
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">Original:</h4>
          <pre className="text-sm bg-muted p-4 rounded-lg">{String(original)}</pre>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-2">Edited:</h4>
          <pre className="text-sm bg-muted p-4 rounded-lg">{String(edited)}</pre>
        </div>
      </div>
    );
  }

  const allKeys = new Set([...Object.keys(original), ...Object.keys(edited)]);
  const changes: Array<{ key: string; type: 'added' | 'removed' | 'modified' | 'unchanged'; original: any; edited: any }> = [];

  allKeys.forEach(key => {
    const hasOriginal = key in original;
    const hasEdited = key in edited;

    if (!hasOriginal && hasEdited) {
      changes.push({ key, type: 'added', original: undefined, edited: edited[key] });
    } else if (hasOriginal && !hasEdited) {
      changes.push({ key, type: 'removed', original: original[key], edited: undefined });
    } else if (JSON.stringify(original[key]) !== JSON.stringify(edited[key])) {
      changes.push({ key, type: 'modified', original: original[key], edited: edited[key] });
    } else {
      changes.push({ key, type: 'unchanged', original: original[key], edited: edited[key] });
    }
  });

  const hasChanges = changes.some(c => c.type !== 'unchanged');

  if (!hasChanges) {
    return (
      <div className="text-sm text-muted-foreground">
        No changes detected
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-4">
        <GitCompareArrows className="h-4 w-4" />
        <h4 className="text-sm font-semibold">Changes</h4>
        <Badge variant="secondary">{changes.filter(c => c.type !== 'unchanged').length} modified</Badge>
      </div>

      {changes.map(({ key, type, original: origValue, edited: editValue }) => (
        <div
          key={key}
          className={`border rounded-lg p-3 ${
            type === 'added' ? 'bg-green-50 dark:bg-green-950/20 border-green-200' :
            type === 'removed' ? 'bg-red-50 dark:bg-red-950/20 border-red-200' :
            type === 'modified' ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200' :
            'bg-muted/50'
          }`}
        >
          <div className="font-medium text-sm mb-1 flex items-center gap-2">
            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            {type === 'added' && <Badge variant="outline" className="bg-green-100">Added</Badge>}
            {type === 'removed' && <Badge variant="outline" className="bg-red-100">Removed</Badge>}
            {type === 'modified' && <Badge variant="outline" className="bg-yellow-100">Modified</Badge>}
          </div>
          <div className="text-sm space-y-1">
            {type !== 'added' && (
              <div className="text-muted-foreground">
                <span className="font-mono">- {formatCellValue(origValue)}</span>
              </div>
            )}
            {type !== 'removed' && (
              <div>
                <span className="font-mono">+ {formatCellValue(editValue)}</span>
              </div>
            )}
          </div>
        </div>
      ))}
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
