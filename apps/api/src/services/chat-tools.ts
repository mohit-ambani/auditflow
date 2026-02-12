import type Anthropic from '@anthropic-ai/sdk';

/**
 * Complete tool definitions for AuditFlow AI Chat
 * These tools enable Claude to interact with the entire accounting system
 */

export const CHAT_TOOLS: Anthropic.Tool[] = [
  // ============================================================
  // DATA QUERY TOOLS
  // ============================================================

  {
    name: 'query_vendors',
    description: 'Search and list vendors. Use this when the user asks about vendors, suppliers, or parties.',
    input_schema: {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description: 'Search by vendor name or GSTIN (optional)'
        },
        is_active: {
          type: 'boolean',
          description: 'Filter by active status (optional)'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default 50)',
          default: 50
        }
      }
    }
  },

  {
    name: 'query_customers',
    description: 'Search and list customers. Use this when the user asks about customers or buyers.',
    input_schema: {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description: 'Search by customer name or GSTIN (optional)'
        },
        is_active: {
          type: 'boolean',
          description: 'Filter by active status (optional)'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default 50)',
          default: 50
        }
      }
    }
  },

  {
    name: 'query_purchase_invoices',
    description: 'EXECUTE: Search and retrieve purchase invoices with filters. Call immediately when user says "show invoices", "unpaid bills", "invoices from vendor X", etc. Use filters to narrow results. After getting results, present with present_data_table and offer reconciliation options.',
    input_schema: {
      type: 'object',
      properties: {
        vendor_id: {
          type: 'string',
          description: 'Filter by vendor ID (optional)'
        },
        vendor_name: {
          type: 'string',
          description: 'Search by vendor name (optional)'
        },
        invoice_number: {
          type: 'string',
          description: 'Search by specific invoice number (optional)'
        },
        status: {
          type: 'string',
          enum: ['PENDING', 'PROCESSING', 'EXTRACTED', 'VERIFIED', 'MATCHED', 'DISPUTED', 'CLOSED'],
          description: 'Filter by invoice status (optional)'
        },
        payment_status: {
          type: 'string',
          enum: ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERPAID'],
          description: 'Filter by payment status (optional)'
        },
        from_date: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD format (optional)'
        },
        to_date: {
          type: 'string',
          description: 'End date in YYYY-MM-DD format (optional)'
        },
        min_amount: {
          type: 'number',
          description: 'Minimum invoice amount (optional)'
        },
        max_amount: {
          type: 'number',
          description: 'Maximum invoice amount (optional)'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default 50)',
          default: 50
        }
      }
    }
  },

  {
    name: 'query_purchase_orders',
    description: 'Search and retrieve purchase orders. Use this when the user asks about POs or purchase orders.',
    input_schema: {
      type: 'object',
      properties: {
        vendor_id: {
          type: 'string',
          description: 'Filter by vendor ID (optional)'
        },
        po_number: {
          type: 'string',
          description: 'Search by specific PO number (optional)'
        },
        status: {
          type: 'string',
          enum: ['PENDING', 'PROCESSING', 'EXTRACTED', 'VERIFIED', 'MATCHED', 'DISPUTED', 'CLOSED'],
          description: 'Filter by PO status (optional)'
        },
        from_date: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD format (optional)'
        },
        to_date: {
          type: 'string',
          description: 'End date in YYYY-MM-DD format (optional)'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default 50)',
          default: 50
        }
      }
    }
  },

  {
    name: 'query_bank_transactions',
    description: 'Search bank transactions. Use this when the user asks about payments, bank activity, or transactions.',
    input_schema: {
      type: 'object',
      properties: {
        from_date: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD format'
        },
        to_date: {
          type: 'string',
          description: 'End date in YYYY-MM-DD format'
        },
        transaction_type: {
          type: 'string',
          description: 'Filter by transaction type (DEBIT/CREDIT) (optional)'
        },
        min_amount: {
          type: 'number',
          description: 'Minimum transaction amount (optional)'
        },
        max_amount: {
          type: 'number',
          description: 'Maximum transaction amount (optional)'
        },
        search: {
          type: 'string',
          description: 'Search in description/narration (optional)'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default 100)',
          default: 100
        }
      },
      required: ['from_date', 'to_date']
    }
  },

  {
    name: 'query_inventory',
    description: 'Query inventory snapshots and stock levels. Use this when the user asks about inventory, stock, or SKUs.',
    input_schema: {
      type: 'object',
      properties: {
        sku_id: {
          type: 'string',
          description: 'Filter by specific SKU ID (optional)'
        },
        snapshot_date: {
          type: 'string',
          description: 'Get snapshot for specific date YYYY-MM-DD (optional, defaults to latest)'
        },
        has_discrepancy: {
          type: 'boolean',
          description: 'Filter items with discrepancies only (optional)'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default 50)',
          default: 50
        }
      }
    }
  },

  // ============================================================
  // RECONCILIATION TOOLS
  // ============================================================

  {
    name: 'reconcile_po_invoice',
    description: 'EXECUTE: Match a purchase order with an invoice and analyze discrepancies. Call this immediately when user says "reconcile PO X with invoice Y" or "match invoice to PO". Returns detailed line-item comparison, quantity variances, price differences, and match score. Use after getting IDs from query_purchase_orders and query_purchase_invoices.',
    input_schema: {
      type: 'object',
      properties: {
        po_id: {
          type: 'string',
          description: 'Purchase Order ID (get from query_purchase_orders first)'
        },
        invoice_id: {
          type: 'string',
          description: 'Purchase Invoice ID (get from query_purchase_invoices first)'
        }
      },
      required: ['po_id', 'invoice_id']
    }
  },

  {
    name: 'find_po_matches',
    description: 'EXECUTE: Find matching purchase orders for an invoice using AI semantic matching. Call this immediately when user says "which PO matches this invoice" or "find PO for invoice X". Returns ranked matches with scores. After showing results, offer to run reconcile_po_invoice on the top match.',
    input_schema: {
      type: 'object',
      properties: {
        invoice_id: {
          type: 'string',
          description: 'Purchase Invoice ID (get from query_purchase_invoices first)'
        },
        top_n: {
          type: 'number',
          description: 'Number of top matches to return (default 5)',
          default: 5
        }
      },
      required: ['invoice_id']
    }
  },

  {
    name: 'reconcile_invoice_payment',
    description: 'EXECUTE: Match an invoice with bank transactions to verify payments. Call this immediately when user says "reconcile payment for invoice X" or "check if invoice Y was paid". Searches bank transactions within ±30 days of invoice date, matches by amount and vendor account. Returns matched transactions, partial payments, overpayments, or unpaid status.',
    input_schema: {
      type: 'object',
      properties: {
        invoice_id: {
          type: 'string',
          description: 'Purchase Invoice ID (get from query_purchase_invoices first)'
        },
        tolerance: {
          type: 'number',
          description: 'Amount tolerance in rupees (default 1.0)',
          default: 1.0
        }
      },
      required: ['invoice_id']
    }
  },

  {
    name: 'reconcile_gst',
    description: 'EXECUTE: Reconcile GST between purchase invoices and GSTR-2A returns. Call this immediately when user says "reconcile GST for January" or "check GST for Q1 2025". Matches invoices with GSTR-2A entries by GSTIN and amount. Returns: matched invoices (ITC claimable), unmatched invoices (ITC at risk), amount mismatches, and total ITC impact. CRITICAL for tax compliance.',
    input_schema: {
      type: 'object',
      properties: {
        month: {
          type: 'number',
          description: 'Month (1-12). For Q1 use months 1,2,3 separately'
        },
        year: {
          type: 'number',
          description: 'Year (e.g., 2025)'
        }
      },
      required: ['month', 'year']
    }
  },

  {
    name: 'generate_vendor_ledger',
    description: 'Generate vendor ledger statement for a specific period. Use this when the user wants to see vendor balance, transactions, or account statement.',
    input_schema: {
      type: 'object',
      properties: {
        vendor_id: {
          type: 'string',
          description: 'Vendor ID'
        },
        from_date: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD format'
        },
        to_date: {
          type: 'string',
          description: 'End date in YYYY-MM-DD format'
        }
      },
      required: ['vendor_id', 'from_date', 'to_date']
    }
  },

  {
    name: 'reconcile_inventory',
    description: 'Run inventory reconciliation to detect stock discrepancies. Use this when the user wants to check inventory accuracy or find stock mismatches.',
    input_schema: {
      type: 'object',
      properties: {
        snapshot_date: {
          type: 'string',
          description: 'Date for snapshot in YYYY-MM-DD format (defaults to today)'
        }
      }
    }
  },

  // ============================================================
  // DOCUMENT PROCESSING TOOLS
  // ============================================================

  {
    name: 'extract_invoice_from_file',
    description: 'Extract invoice data from an uploaded file using AI. Use this when the user uploads an invoice document.',
    input_schema: {
      type: 'object',
      properties: {
        file_id: {
          type: 'string',
          description: 'Uploaded file ID'
        }
      },
      required: ['file_id']
    }
  },

  {
    name: 'extract_po_from_file',
    description: 'Extract purchase order data from an uploaded file using AI. Use this when the user uploads a PO document.',
    input_schema: {
      type: 'object',
      properties: {
        file_id: {
          type: 'string',
          description: 'Uploaded file ID'
        }
      },
      required: ['file_id']
    }
  },

  {
    name: 'extract_bank_statement_from_file',
    description: 'Extract bank transactions from an uploaded statement using AI. Use this when the user uploads a bank statement.',
    input_schema: {
      type: 'object',
      properties: {
        file_id: {
          type: 'string',
          description: 'Uploaded file ID'
        }
      },
      required: ['file_id']
    }
  },

  // ============================================================
  // FILE PROCESSING & AUTO-CLASSIFICATION TOOLS
  // ============================================================

  {
    name: 'classify_and_process_file',
    description: 'EXECUTE: Classify and extract data from uploaded file. Call this IMMEDIATELY when files are uploaded - do NOT ask for permission first. Automatically detects document type (PURCHASE_INVOICE, PURCHASE_ORDER, BANK_STATEMENT, etc.) and extracts all fields. Returns: document_type, confidence (0-1), extracted_data, arithmetic_verified. After results, present using present_data_table and ask "Shall I save this?" Only save if user confirms.',
    input_schema: {
      type: 'object',
      properties: {
        file_id: {
          type: 'string',
          description: 'Uploaded file ID from the upload response'
        }
      },
      required: ['file_id']
    }
  },

  {
    name: 'get_file_processing_status',
    description: 'Check the current processing status of an uploaded file. Use this to check if classification and extraction are complete, or to get progress updates during long-running extractions.',
    input_schema: {
      type: 'object',
      properties: {
        file_id: {
          type: 'string',
          description: 'File ID to check status for'
        }
      },
      required: ['file_id']
    }
  },

  {
    name: 'process_file_batch',
    description: 'Process multiple files sequentially with real-time progress updates. Use this when the user uploads multiple files at once. The tool will parse, classify, and extract data from each file in sequence, yielding progress events after each stage. Returns detailed results for all files including success status, document types, confidence scores, and any errors.',
    input_schema: {
      type: 'object',
      properties: {
        file_ids: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'Array of file IDs to process in batch'
        }
      },
      required: ['file_ids']
    }
  },

  {
    name: 'save_extracted_data',
    description: 'EXECUTE: Save extracted data to database. Only call AFTER user explicitly confirms (says "yes", "save it", "looks good", "correct", etc.). Never save without confirmation - accounting accuracy is critical. After saving, IMMEDIATELY call auto_reconcile_after_save to find PO matches, payment matches, etc. Returns saved entity ID.',
    input_schema: {
      type: 'object',
      properties: {
        file_id: {
          type: 'string',
          description: 'File ID that was extracted'
        },
        document_type: {
          type: 'string',
          enum: ['PURCHASE_INVOICE', 'PURCHASE_ORDER', 'SALES_INVOICE', 'BANK_STATEMENT', 'GST_RETURN', 'CREDIT_DEBIT_NOTE'],
          description: 'Type of document to save'
        },
        extracted_data: {
          type: 'object',
          description: 'The extracted data to save'
        },
        corrections: {
          type: 'object',
          description: 'Any user-corrected fields (optional) - will override extracted values'
        }
      },
      required: ['file_id', 'document_type', 'extracted_data']
    }
  },

  {
    name: 'auto_reconcile_after_save',
    description: 'EXECUTE: Trigger automatic reconciliation after saving a document. Call this IMMEDIATELY after save_extracted_data. For PURCHASE_INVOICE: finds matching POs and payments. For PURCHASE_ORDER: finds matching invoices. For BANK_STATEMENT: matches transactions to invoices. For GST_RETURN: reconciles with book entries. Returns all matches with confidence scores and suggests next actions.',
    input_schema: {
      type: 'object',
      properties: {
        document_type: {
          type: 'string',
          enum: ['PURCHASE_INVOICE', 'PURCHASE_ORDER', 'SALES_INVOICE', 'BANK_STATEMENT', 'GST_RETURN'],
          description: 'Type of document that was saved (get from classification result)'
        },
        document_id: {
          type: 'string',
          description: 'ID of the saved document (returned from save_extracted_data)'
        },
        run_matching: {
          type: 'boolean',
          description: 'Whether to run matching (default true, always use true)',
          default: true
        }
      },
      required: ['document_type', 'document_id']
    }
  },

  {
    name: 'present_data_table',
    description: 'Display structured data in the side panel as a formatted table. Use this when showing query results, extracted data, or reconciliation results that would be better viewed as a table rather than inline text. The frontend will render this in a dedicated panel.',
    input_schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title for the table display'
        },
        columns: {
          type: 'array',
          description: 'Column definitions (optional, will be inferred if not provided)',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              label: { type: 'string' },
              format: {
                type: 'string',
                enum: ['text', 'currency', 'date', 'number', 'status', 'boolean'],
                description: 'How to format this column'
              }
            },
            required: ['key', 'label']
          }
        },
        rows: {
          type: 'array',
          description: 'Array of data rows (objects)',
          items: {
            type: 'object'
          }
        },
        summary: {
          type: 'object',
          description: 'Optional summary row with totals or aggregates'
        }
      },
      required: ['title', 'rows']
    }
  },

  // ============================================================
  // ANALYTICS TOOLS
  // ============================================================

  {
    name: 'calculate_gst_liability',
    description: 'Calculate GST liability for a given period. Use this when the user asks about GST to be paid, ITC, or tax calculations.',
    input_schema: {
      type: 'object',
      properties: {
        month: {
          type: 'number',
          description: 'Month (1-12)'
        },
        year: {
          type: 'number',
          description: 'Year (e.g., 2025)'
        }
      },
      required: ['month', 'year']
    }
  },

  {
    name: 'find_duplicate_payments',
    description: 'Detect potentially duplicate payments in bank transactions. Use this when the user wants to find duplicate or suspicious payments.',
    input_schema: {
      type: 'object',
      properties: {
        from_date: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD format'
        },
        to_date: {
          type: 'string',
          description: 'End date in YYYY-MM-DD format'
        },
        tolerance_days: {
          type: 'number',
          description: 'Number of days to consider for duplicates (default 7)',
          default: 7
        }
      },
      required: ['from_date', 'to_date']
    }
  },

  {
    name: 'vendor_aging_analysis',
    description: 'Generate accounts payable aging report for vendors. Use this when the user asks about outstanding vendor payments or aging.',
    input_schema: {
      type: 'object',
      properties: {
        vendor_id: {
          type: 'string',
          description: 'Specific vendor ID (optional, if not provided shows all vendors)'
        },
        as_of_date: {
          type: 'string',
          description: 'Aging as of date in YYYY-MM-DD format (defaults to today)'
        }
      }
    }
  },

  {
    name: 'customer_aging_analysis',
    description: 'Generate accounts receivable aging report for customers. Use this when the user asks about outstanding customer payments.',
    input_schema: {
      type: 'object',
      properties: {
        customer_id: {
          type: 'string',
          description: 'Specific customer ID (optional)'
        },
        as_of_date: {
          type: 'string',
          description: 'Aging as of date in YYYY-MM-DD format (defaults to today)'
        }
      }
    }
  },

  {
    name: 'get_dashboard_summary',
    description: 'Get overall dashboard statistics and KPIs. Use this when the user asks for an overview, summary, or wants to see key metrics.',
    input_schema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['today', 'week', 'month', 'quarter', 'year'],
          description: 'Time period for the summary (default: month)',
          default: 'month'
        }
      }
    }
  },

  {
    name: 'show_dashboard_widget',
    description: 'Display a rich dashboard widget in the chat with visual KPIs and metrics. Use this to present summary data in an attractive, visual format with cards, charts, and statistics. Widget types include: summary (overall metrics), vendor_aging (outstanding payments by vendor), gst_status (GST reconciliation status), recent_uploads (latest document uploads), and reconciliation_health (matching success rates).',
    input_schema: {
      type: 'object',
      properties: {
        widget_type: {
          type: 'string',
          enum: ['summary', 'vendor_aging', 'gst_status', 'recent_uploads', 'reconciliation_health'],
          description: 'Type of dashboard widget to display'
        },
        data: {
          type: 'object',
          description: 'Data to display in the widget (structure varies by widget type)'
        },
        period: {
          type: 'string',
          enum: ['today', 'week', 'month', 'quarter', 'year'],
          description: 'Time period for the data (optional)',
          default: 'month'
        }
      },
      required: ['widget_type', 'data']
    }
  },

  // ============================================================
  // ACTION TOOLS
  // ============================================================

  {
    name: 'create_vendor',
    description: 'Create a new vendor in the system. Use this when the user wants to add a new vendor or supplier.',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Vendor name'
        },
        gstin: {
          type: 'string',
          description: 'GSTIN (optional)'
        },
        pan: {
          type: 'string',
          description: 'PAN number (optional)'
        },
        email: {
          type: 'string',
          description: 'Email address (optional)'
        },
        phone: {
          type: 'string',
          description: 'Phone number (optional)'
        },
        address: {
          type: 'string',
          description: 'Address (optional)'
        }
      },
      required: ['name']
    }
  },

  {
    name: 'save_extracted_invoice',
    description: 'Save AI-extracted invoice data to the database. Use this after extracting invoice data from a file.',
    input_schema: {
      type: 'object',
      properties: {
        file_id: {
          type: 'string',
          description: 'File ID that was extracted'
        },
        extracted_data: {
          type: 'object',
          description: 'The extracted invoice data'
        }
      },
      required: ['file_id', 'extracted_data']
    }
  },

  {
    name: 'update_invoice_status',
    description: 'Update the status of a purchase invoice. Use this when the user wants to mark an invoice as verified, disputed, etc.',
    input_schema: {
      type: 'object',
      properties: {
        invoice_id: {
          type: 'string',
          description: 'Invoice ID'
        },
        status: {
          type: 'string',
          enum: ['PENDING', 'PROCESSING', 'EXTRACTED', 'VERIFIED', 'MATCHED', 'DISPUTED', 'CLOSED'],
          description: 'New status'
        },
        notes: {
          type: 'string',
          description: 'Optional notes about the status change'
        }
      },
      required: ['invoice_id', 'status']
    }
  },

  {
    name: 'send_payment_reminder',
    description: 'Send payment reminder email to a customer. Use this when the user wants to send a reminder for overdue invoices.',
    input_schema: {
      type: 'object',
      properties: {
        invoice_id: {
          type: 'string',
          description: 'Sales invoice ID'
        },
        custom_message: {
          type: 'string',
          description: 'Custom message to include in the reminder (optional)'
        }
      },
      required: ['invoice_id']
    }
  },

  {
    name: 'send_vendor_ledger_confirmation',
    description: 'Send vendor ledger statement for confirmation. Use this when the user wants to send ledger to vendor for approval.',
    input_schema: {
      type: 'object',
      properties: {
        vendor_id: {
          type: 'string',
          description: 'Vendor ID'
        },
        from_date: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD'
        },
        to_date: {
          type: 'string',
          description: 'End date in YYYY-MM-DD'
        }
      },
      required: ['vendor_id', 'from_date', 'to_date']
    }
  },

  // ============================================================
  // NEW ADVANCED TOOLS
  // ============================================================

  {
    name: 'export_to_excel',
    description: 'EXECUTE: Export data to Excel spreadsheet. Call when user says "export to Excel", "download as Excel". Returns download URL for formatted Excel file.',
    input_schema: {
      type: 'object',
      properties: {
        data_type: {
          type: 'string',
          enum: ['invoices', 'payments', 'vendors', 'reconciliation'],
          description: 'Type of data to export'
        },
        filters: {
          type: 'object',
          description: 'Filters to apply'
        }
      },
      required: ['data_type']
    }
  },

  {
    name: 'cash_flow_forecast',
    description: 'EXECUTE: Generate cash flow forecast for next 30-90 days based on unpaid invoices and scheduled payments.',
    input_schema: {
      type: 'object',
      properties: {
        forecast_days: {
          type: 'number',
          description: 'Days to forecast (default 30)',
          default: 30
        }
      }
    }
  },

  {
    name: 'vendor_performance_analysis',
    description: 'EXECUTE: Analyze vendor performance - on-time delivery, price variance, quality. Returns performance scores.',
    input_schema: {
      type: 'object',
      properties: {
        vendor_id: {
          type: 'string',
          description: 'Vendor ID (optional, leave empty for all)'
        },
        period_months: {
          type: 'number',
          description: 'Months to analyze (default 6)',
          default: 6
        }
      }
    }
  },

  {
    name: 'compliance_check',
    description: 'EXECUTE: Run compliance checks - GST filing, PAN/GSTIN validation, invoice numbering. Returns compliance score.',
    input_schema: {
      type: 'object',
      properties: {
        check_type: {
          type: 'string',
          enum: ['gst', 'tds', 'all'],
          default: 'all'
        }
      }
    }
  }
];

/**
 * Map of tool names to their categories for better organization
 */
export const TOOL_CATEGORIES = {
  'Data Query': [
    'query_vendors',
    'query_customers',
    'query_purchase_invoices',
    'query_purchase_orders',
    'query_bank_transactions',
    'query_inventory'
  ],
  'Reconciliation': [
    'reconcile_po_invoice',
    'find_po_matches',
    'reconcile_invoice_payment',
    'reconcile_gst',
    'generate_vendor_ledger',
    'reconcile_inventory'
  ],
  'Document Processing': [
    'extract_invoice_from_file',
    'extract_po_from_file',
    'extract_bank_statement_from_file'
  ],
  'File Processing & Auto-Classification': [
    'classify_and_process_file',
    'get_file_processing_status',
    'process_file_batch',
    'save_extracted_data',
    'auto_reconcile_after_save',
    'present_data_table'
  ],
  'Analytics': [
    'calculate_gst_liability',
    'find_duplicate_payments',
    'vendor_aging_analysis',
    'customer_aging_analysis',
    'get_dashboard_summary',
    'show_dashboard_widget'
  ],
  'Actions': [
    'create_vendor',
    'save_extracted_invoice',
    'update_invoice_status',
    'send_payment_reminder',
    'send_vendor_ledger_confirmation'
  ]
};
