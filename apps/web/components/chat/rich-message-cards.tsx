import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Upload,
  Loader2,
  TrendingUp,
  IndianRupee,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface FileUploadCardProps {
  fileId: string;
  fileName: string;
  fileSize?: number;
  stage: 'uploading' | 'parsing' | 'classifying' | 'extracting' | 'validating' | 'ready' | 'saved' | 'error';
  progress?: number;
  documentType?: string;
  confidence?: number;
  error?: string;
}

export interface ExtractedDataCardProps {
  documentType: string;
  extractedData: any;
  confidence: number;
  arithmeticVerified?: boolean;
  onSave?: () => void;
  onEdit?: () => void;
  onReject?: () => void;
}

export interface ConfirmationCardProps {
  message: string;
  action: string;
  data: any;
  onConfirm?: () => void;
  onReject?: () => void;
}

export interface ReconciliationResultCardProps {
  matchType: 'po_invoice' | 'payment' | 'gst';
  matches: any[];
  onAccept?: (matchId: string) => void;
  onDispute?: (matchId: string) => void;
  onViewDetails?: (matchId: string) => void;
}

export interface DataTableCardProps {
  title: string;
  data: any[];
  maxRows?: number;
  onViewAll?: () => void;
}

export interface ProcessingStatusCardProps {
  fileName: string;
  steps: Array<{
    name: string;
    status: 'pending' | 'running' | 'done' | 'error';
    message?: string;
  }>;
}

// ============================================================
// FILE UPLOAD CARD
// ============================================================

export function FileUploadCard({
  fileName,
  fileSize,
  stage,
  progress = 0,
  documentType,
  confidence,
  error,
}: FileUploadCardProps) {
  const getStageDisplay = () => {
    switch (stage) {
      case 'uploading':
        return { icon: Upload, text: 'Uploading...', color: 'text-blue-600' };
      case 'parsing':
        return { icon: FileText, text: 'Parsing document...', color: 'text-blue-600' };
      case 'classifying':
        return { icon: Loader2, text: 'Classifying...', color: 'text-blue-600 animate-spin' };
      case 'extracting':
        return { icon: Loader2, text: 'Extracting data...', color: 'text-blue-600 animate-spin' };
      case 'validating':
        return { icon: Loader2, text: 'Validating...', color: 'text-blue-600 animate-spin' };
      case 'ready':
        return { icon: CheckCircle2, text: 'Ready for review', color: 'text-green-600' };
      case 'saved':
        return { icon: CheckCircle2, text: 'Saved successfully', color: 'text-green-600' };
      case 'error':
        return { icon: XCircle, text: 'Processing failed', color: 'text-red-600' };
    }
  };

  const { icon: Icon, text, color } = getStageDisplay();

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <Icon className={`h-5 w-5 mt-0.5 ${color}`} />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-medium">{fileName}</p>
              {fileSize && (
                <span className="text-xs text-muted-foreground">
                  {(fileSize / 1024).toFixed(1)} KB
                </span>
              )}
            </div>

            {/* Progress bar */}
            {(stage === 'uploading' || stage === 'extracting') && progress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {/* Status text */}
            <p className={`text-sm ${color}`}>{text}</p>

            {/* Classification result */}
            {documentType && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{documentType}</Badge>
                {confidence !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    {Math.round(confidence * 100)}% confidence
                  </span>
                )}
              </div>
            )}

            {/* Error message */}
            {error && (
              <p className="text-sm text-red-600 mt-2">{error}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// EXTRACTED DATA CARD
// ============================================================

export function ExtractedDataCard({
  documentType,
  extractedData,
  confidence,
  arithmeticVerified = false,
  onSave,
  onEdit,
  onReject,
}: ExtractedDataCardProps) {
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const renderInvoiceData = () => {
    if (documentType !== 'PURCHASE_INVOICE' && documentType !== 'SALES_INVOICE') return null;

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Invoice Number</p>
            <p className="font-medium">{extractedData.invoice_number || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="font-medium">
              {extractedData.invoice_date
                ? format(new Date(extractedData.invoice_date), 'dd-MMM-yyyy')
                : 'N/A'}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">
            {documentType === 'PURCHASE_INVOICE' ? 'Vendor' : 'Customer'}
          </p>
          <p className="font-medium">{extractedData.vendor_name || extractedData.customer_name || 'N/A'}</p>
          {(extractedData.vendor_gstin || extractedData.customer_gstin) && (
            <p className="text-xs text-muted-foreground font-mono">
              GSTIN: {extractedData.vendor_gstin || extractedData.customer_gstin}
            </p>
          )}
        </div>

        <div className="border-t pt-3 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm">Subtotal</span>
            <span className="font-medium">{formatCurrency(extractedData.subtotal || 0)}</span>
          </div>
          {extractedData.cgst_total > 0 && (
            <div className="flex justify-between text-sm">
              <span>CGST</span>
              <span>{formatCurrency(extractedData.cgst_total)}</span>
            </div>
          )}
          {extractedData.sgst_total > 0 && (
            <div className="flex justify-between text-sm">
              <span>SGST</span>
              <span>{formatCurrency(extractedData.sgst_total)}</span>
            </div>
          )}
          {extractedData.igst_total > 0 && (
            <div className="flex justify-between text-sm">
              <span>IGST</span>
              <span>{formatCurrency(extractedData.igst_total)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Total</span>
            <span>{formatCurrency(extractedData.grand_total || 0)}</span>
          </div>
        </div>

        {extractedData.line_items && (
          <p className="text-xs text-muted-foreground">
            {extractedData.line_items.length} line item(s)
          </p>
        )}
      </div>
    );
  };

  const renderBankStatementData = () => {
    if (documentType !== 'BANK_STATEMENT') return null;

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Bank</p>
            <p className="font-medium">{extractedData.bank_name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Account</p>
            <p className="font-mono text-sm">{extractedData.account_number || 'N/A'}</p>
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Statement Period</p>
          <p className="font-medium">{extractedData.statement_period || 'N/A'}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t pt-3">
          <div>
            <p className="text-xs text-muted-foreground">Opening Balance</p>
            <p className="font-medium">{formatCurrency(extractedData.opening_balance || 0)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Closing Balance</p>
            <p className="font-medium">{formatCurrency(extractedData.closing_balance || 0)}</p>
          </div>
        </div>

        {extractedData.transactions && (
          <p className="text-xs text-muted-foreground">
            {extractedData.transactions.length} transaction(s)
          </p>
        )}
      </div>
    );
  };

  return (
    <Card className="border-l-4 border-l-green-500">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">Extracted: {documentType.replace('_', ' ')}</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={confidence >= 0.85 ? 'default' : 'secondary'}>
                {Math.round(confidence * 100)}% Confidence
              </Badge>
              {arithmeticVerified ? (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Arithmetic Verified
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Check Required
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderInvoiceData()}
        {renderBankStatementData()}

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          {onSave && (
            <Button onClick={onSave} size="sm" className="flex-1">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Save
            </Button>
          )}
          {onEdit && (
            <Button onClick={onEdit} size="sm" variant="outline">
              Edit First
            </Button>
          )}
          {onReject && (
            <Button onClick={onReject} size="sm" variant="ghost">
              Reject
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// CONFIRMATION CARD
// ============================================================

export function ConfirmationCard({
  message,
  action,
  data,
  onConfirm,
  onReject,
}: ConfirmationCardProps) {
  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1 space-y-3">
            <p className="font-medium">{message}</p>
            <div className="flex gap-2">
              {onConfirm && (
                <Button onClick={onConfirm} size="sm">
                  Yes, {action}
                </Button>
              )}
              {onReject && (
                <Button onClick={onReject} size="sm" variant="outline">
                  No, Cancel
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// RECONCILIATION RESULT CARD
// ============================================================

export function ReconciliationResultCard({
  matchType,
  matches,
  onAccept,
  onDispute,
  onViewDetails,
}: ReconciliationResultCardProps) {
  const getMatchTypeLabel = () => {
    switch (matchType) {
      case 'po_invoice':
        return 'PO-Invoice Match';
      case 'payment':
        return 'Payment Match';
      case 'gst':
        return 'GST Match';
    }
  };

  const getMatchScoreBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-600">{score}% Match</Badge>;
    if (score >= 70) return <Badge variant="secondary">{score}% Match</Badge>;
    return <Badge variant="destructive">{score}% Match</Badge>;
  };

  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{getMatchTypeLabel()} Results</CardTitle>
        <p className="text-sm text-muted-foreground">Found {matches.length} potential match(es)</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {matches.slice(0, 3).map((match, idx) => (
          <div key={idx} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">
                {match.po_number || match.invoice_number || match.transaction_id || 'Match #' + (idx + 1)}
              </p>
              {match.match_score !== undefined && getMatchScoreBadge(Math.round(match.match_score))}
            </div>

            {match.discrepancies && match.discrepancies.length > 0 && (
              <div className="text-xs space-y-1">
                <p className="text-red-600 font-medium">Discrepancies:</p>
                {match.discrepancies.slice(0, 2).map((disc: any, i: number) => (
                  <p key={i} className="text-muted-foreground">• {disc.description}</p>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              {onAccept && (
                <Button onClick={() => onAccept(match.id || match.po_id)} size="sm" variant="outline">
                  Accept
                </Button>
              )}
              {onDispute && (
                <Button onClick={() => onDispute(match.id || match.po_id)} size="sm" variant="ghost">
                  Dispute
                </Button>
              )}
              {onViewDetails && (
                <Button onClick={() => onViewDetails(match.id || match.po_id)} size="sm" variant="ghost">
                  Details
                </Button>
              )}
            </div>
          </div>
        ))}

        {matches.length > 3 && (
          <p className="text-xs text-center text-muted-foreground">
            + {matches.length - 3} more match(es)
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// DATA TABLE CARD (Mini inline table)
// ============================================================

export function DataTableCard({ title, data, maxRows = 5, onViewAll }: DataTableCardProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground text-center">No data to display</p>
        </CardContent>
      </Card>
    );
  }

  const displayData = data.slice(0, maxRows);
  const columns = Object.keys(displayData[0]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {columns.map((col) => (
                  <th key={col} className="text-left py-2 px-2 font-medium">
                    {col.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayData.map((row, idx) => (
                <tr key={idx} className="border-b last:border-0">
                  {columns.map((col) => (
                    <td key={col} className="py-2 px-2">
                      {typeof row[col] === 'number' && col.includes('amount')
                        ? `₹${row[col].toLocaleString('en-IN')}`
                        : String(row[col] || '-')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.length > maxRows && onViewAll && (
          <Button onClick={onViewAll} size="sm" variant="ghost" className="w-full mt-2">
            View all {data.length} rows
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// PROCESSING STATUS CARD
// ============================================================

export function ProcessingStatusCard({ fileName, steps }: ProcessingStatusCardProps) {
  const getStepIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Processing: {fileName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-3">
              {getStepIcon(step.status)}
              <div className="flex-1">
                <p className={`text-sm font-medium ${step.status === 'error' ? 'text-red-600' : ''}`}>
                  {step.name}
                </p>
                {step.message && (
                  <p className="text-xs text-muted-foreground mt-1">{step.message}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
