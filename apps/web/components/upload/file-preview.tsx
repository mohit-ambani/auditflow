'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, X } from 'lucide-react';

interface FilePreviewProps {
  fileName: string;
  mimeType: string;
  downloadUrl: string;
  fileSize: number;
  onClose?: () => void;
}

export function FilePreview({
  fileName,
  mimeType,
  downloadUrl,
  fileSize,
  onClose,
}: FilePreviewProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDownload = () => {
    window.open(downloadUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="relative h-[90vh] w-[90vw] max-w-6xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex-1 min-w-0">
            <h3 className="truncate font-semibold">{fileName}</h3>
            <p className="text-sm text-muted-foreground">
              {formatFileSize(fileSize)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>

            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Preview Content */}
        <div className="h-[calc(100%-5rem)] overflow-auto p-4">
          {mimeType === 'application/pdf' && (
            <PDFPreview url={downloadUrl} />
          )}

          {mimeType.startsWith('image/') && (
            <ImagePreview url={downloadUrl} fileName={fileName} />
          )}

          {(mimeType === 'application/vnd.ms-excel' ||
            mimeType ===
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            mimeType === 'text/csv') && (
            <ExcelPreview url={downloadUrl} fileName={fileName} />
          )}
        </div>
      </Card>
    </div>
  );
}

function PDFPreview({ url }: { url: string }) {
  return (
    <iframe
      src={url}
      className="h-full w-full rounded border"
      title="PDF Preview"
    />
  );
}

function ImagePreview({ url, fileName }: { url: string; fileName: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <img
        src={url}
        alt={fileName}
        className="max-h-full max-w-full object-contain"
      />
    </div>
  );
}

function ExcelPreview({ url, fileName }: { url: string; fileName: string }) {
  const [data, setData] = useState<any[][] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // In a real implementation, you would fetch and parse the Excel file
  // For now, we'll show a message
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="rounded-lg bg-muted p-8">
        <ExternalLink className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h4 className="mb-2 font-semibold">Excel/CSV Preview</h4>
        <p className="mb-4 text-sm text-muted-foreground">
          Preview for Excel and CSV files will be available in Module 4
          <br />
          when we implement the document parser.
        </p>
        <Button onClick={() => window.open(url, '_blank')}>
          Download to View
        </Button>
      </div>
    </div>
  );
}
