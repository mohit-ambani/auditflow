import {
  FileText,
  Upload,
  GitCompare,
  CreditCard,
  Receipt,
  Users,
  PackageCheck,
  Calendar,
  TrendingUp,
  FileCheck,
  AlertCircle,
  Mail,
  type LucideIcon
} from 'lucide-react';

export interface WorkflowTemplate {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  prompt: string;
  category: 'upload' | 'reconciliation' | 'analysis' | 'communication';
  estimatedTime?: string;
  requiresFiles?: boolean;
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  // Upload Workflows
  {
    id: 'upload-process-invoice',
    title: 'Upload & Process Invoice',
    description: 'Upload invoice files and automatically extract, classify, and validate data',
    icon: FileText,
    prompt: 'I want to upload and process invoice files. Please guide me through uploading invoices, and then automatically extract all data, validate arithmetic, classify the document type, and suggest next steps for reconciliation.',
    category: 'upload',
    estimatedTime: '2-3 min',
    requiresFiles: true
  },
  {
    id: 'batch-document-upload',
    title: 'Batch Document Upload',
    description: 'Upload multiple documents at once for processing',
    icon: Upload,
    prompt: 'I need to upload multiple documents in batch. Please help me upload all files, process them sequentially, classify each document type, extract data from all of them, and provide a summary of what was processed.',
    category: 'upload',
    estimatedTime: '5-10 min',
    requiresFiles: true
  },
  {
    id: 'bank-statement-upload',
    title: 'Process Bank Statement',
    description: 'Upload and reconcile bank statements with invoices',
    icon: CreditCard,
    prompt: 'I want to upload a bank statement. Please extract all transactions, match them to existing invoices and payments, identify unmatched transactions, and show reconciliation status.',
    category: 'upload',
    estimatedTime: '3-5 min',
    requiresFiles: true
  },

  // Reconciliation Workflows
  {
    id: 'monthly-gst-reconciliation',
    title: 'Monthly GST Reconciliation',
    description: 'Complete GST return reconciliation for the month',
    icon: Receipt,
    prompt: 'Run monthly GST reconciliation for this month. Show me GSTR-2A entries, match them with book entries, identify ITC available, flag mismatches, and provide a reconciliation summary with action items.',
    category: 'reconciliation',
    estimatedTime: '5-7 min'
  },
  {
    id: 'po-invoice-matching',
    title: 'PO-Invoice Matching',
    description: 'Match purchase orders with received invoices',
    icon: GitCompare,
    prompt: 'Run PO-Invoice matching for recent invoices. Find all unmatched invoices, search for corresponding POs, show match scores, highlight discrepancies in quantity or amount, and recommend actions.',
    category: 'reconciliation',
    estimatedTime: '3-5 min'
  },
  {
    id: 'payment-reconciliation',
    title: 'Payment Reconciliation',
    description: 'Match payments to invoices and identify discrepancies',
    icon: CreditCard,
    prompt: 'Reconcile payments with invoices. Show all unmatched payments, find matching invoices, calculate outstanding amounts, identify partial payments, and flag any payment discrepancies.',
    category: 'reconciliation',
    estimatedTime: '4-6 min'
  },
  {
    id: 'month-end-close',
    title: 'Month-End Close',
    description: 'Complete month-end closing checklist',
    icon: Calendar,
    prompt: 'Help me with month-end closing. Show pending reconciliations, unmatched transactions, outstanding invoices, GST status, payment status, and generate a month-end summary report.',
    category: 'reconciliation',
    estimatedTime: '10-15 min'
  },

  // Analysis Workflows
  {
    id: 'vendor-aging-analysis',
    title: 'Vendor Aging Analysis',
    description: 'Analyze outstanding vendor payments by age',
    icon: Users,
    prompt: 'Run vendor aging analysis. Show all unpaid vendor invoices grouped by age buckets (0-30, 31-60, 61-90, 90+ days), calculate total outstanding by vendor, flag overdue payments, and suggest payment priorities.',
    category: 'analysis',
    estimatedTime: '2-3 min'
  },
  {
    id: 'discount-audit',
    title: 'Discount Audit',
    description: 'Audit vendor discounts and identify missed opportunities',
    icon: TrendingUp,
    prompt: 'Audit vendor discounts. Check all invoices against discount terms, identify missed early payment discounts, calculate potential savings, flag non-compliant discounts, and recommend actions.',
    category: 'analysis',
    estimatedTime: '3-5 min'
  },
  {
    id: 'reconciliation-health',
    title: 'Reconciliation Health Check',
    description: 'Get overall status of all reconciliation modules',
    icon: FileCheck,
    prompt: 'Show me reconciliation health across all modules. Display PO-invoice match rates, payment match rates, GST reconciliation status, unmatched items count, and overall reconciliation health score.',
    category: 'analysis',
    estimatedTime: '1-2 min'
  },
  {
    id: 'find-duplicates',
    title: 'Find Duplicate Payments',
    description: 'Identify potential duplicate or erroneous payments',
    icon: AlertCircle,
    prompt: 'Find potential duplicate payments. Search for payments with same amount, vendor, and dates within 7 days. Show suspicious transactions, calculate total amount at risk, and suggest verification steps.',
    category: 'analysis',
    estimatedTime: '2-3 min'
  },

  // Communication Workflows
  {
    id: 'vendor-statement-request',
    title: 'Vendor Statement Request',
    description: 'Request ledger confirmation from vendors',
    icon: Mail,
    prompt: 'Help me request vendor statements. Show vendors with outstanding balances, draft ledger confirmation requests with account details, and prepare a list of vendors to contact.',
    category: 'communication',
    estimatedTime: '5-10 min'
  },
  {
    id: 'payment-reminders',
    title: 'Payment Reminders',
    description: 'Send payment reminders for overdue invoices',
    icon: Mail,
    prompt: 'Generate payment reminders. Identify overdue invoices, draft reminder messages with invoice details and amounts, prioritize by vendor and amount, and prepare reminder emails.',
    category: 'communication',
    estimatedTime: '5-8 min'
  },
  {
    id: 'inventory-check',
    title: 'Inventory Reconciliation',
    description: 'Reconcile physical inventory with book records',
    icon: PackageCheck,
    prompt: 'Help with inventory reconciliation. Compare physical stock with book records, identify discrepancies, calculate variance amounts, flag high-value differences, and suggest corrective actions.',
    category: 'analysis',
    estimatedTime: '5-10 min'
  }
];

// Group templates by category
export const getTemplatesByCategory = () => {
  return WORKFLOW_TEMPLATES.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, WorkflowTemplate[]>);
};

// Get category display names
export const CATEGORY_LABELS: Record<string, string> = {
  upload: 'Document Upload',
  reconciliation: 'Reconciliation',
  analysis: 'Analysis & Reports',
  communication: 'Communication'
};

// Get category descriptions
export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  upload: 'Upload and process documents with automatic extraction',
  reconciliation: 'Match and reconcile transactions across systems',
  analysis: 'Generate insights and identify issues',
  communication: 'Send reminders and requests to vendors'
};
