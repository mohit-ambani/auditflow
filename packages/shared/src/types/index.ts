// Shared types for API responses
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// User roles
export type UserRole = 'ADMIN' | 'ACCOUNTANT' | 'VIEWER';

// Document types
export type DocumentType =
  | 'PURCHASE_ORDER'
  | 'PURCHASE_INVOICE'
  | 'SALES_INVOICE'
  | 'BANK_STATEMENT'
  | 'GST_RETURN'
  | 'CREDIT_DEBIT_NOTE'
  | 'INVENTORY_UPLOAD'
  | 'VENDOR_MASTER'
  | 'CUSTOMER_MASTER'
  | 'OTHER';

// Processing status
export type ProcessingStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

// Invoice status
export type InvoiceStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'EXTRACTED'
  | 'VERIFIED'
  | 'MATCHED'
  | 'DISPUTED'
  | 'CLOSED';

// Payment status
export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERPAID';

// Match types
export type MatchType =
  | 'EXACT'
  | 'PARTIAL_QTY'
  | 'PARTIAL_VALUE'
  | 'PARTIAL_BOTH'
  | 'NO_MATCH'
  | 'MANUAL';

// GST Return types
export type GSTReturnType = 'GSTR1' | 'GSTR2A' | 'GSTR2B' | 'GSTR3B';

// ITC Status
export type ITCStatus =
  | 'AVAILABLE'
  | 'NOT_FILED'
  | 'MISMATCH'
  | 'REVERSED'
  | 'INELIGIBLE';

// Reconciliation run types
export type ReconcRunType =
  | 'PO_INVOICE'
  | 'INVOICE_PAYMENT'
  | 'GST_RECONCILIATION'
  | 'VENDOR_LEDGER'
  | 'CUSTOMER_LEDGER'
  | 'INVENTORY'
  | 'FULL';

// Upload file metadata
export interface UploadFileMetadata {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  documentType: DocumentType;
  processingStatus: ProcessingStatus;
  uploadedAt: Date;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Dashboard metrics
export interface DashboardMetrics {
  totalPayables: number;
  totalReceivables: number;
  unmatchedInvoices: number;
  overduePayments: number;
  itcAtRisk: number;
  discountLeakage: number;
  inventoryValue: number;
  reconHealthScore: number;
}

// Reconciliation summary
export interface ReconciliationSummary {
  totalInvoices: number;
  matchedInvoices: number;
  unmatchedInvoices: number;
  totalValue: number;
  matchedValue: number;
  discrepancyValue: number;
}
