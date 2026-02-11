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
    description: 'Search and retrieve purchase invoices with filters. Use this when the user asks about invoices, unpaid bills, vendor transactions, or purchases.',
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
    description: 'Match a purchase order with an invoice and analyze discrepancies. Use this when the user wants to reconcile or match a PO with an invoice.',
    input_schema: {
      type: 'object',
      properties: {
        po_id: {
          type: 'string',
          description: 'Purchase Order ID'
        },
        invoice_id: {
          type: 'string',
          description: 'Purchase Invoice ID'
        }
      },
      required: ['po_id', 'invoice_id']
    }
  },

  {
    name: 'find_po_matches',
    description: 'Find matching purchase orders for an invoice using AI. Use this when the user wants to find which PO matches an invoice.',
    input_schema: {
      type: 'object',
      properties: {
        invoice_id: {
          type: 'string',
          description: 'Purchase Invoice ID'
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
    description: 'Match an invoice with bank transactions to verify payments. Use this when the user asks about payment reconciliation or wants to match payments to invoices.',
    input_schema: {
      type: 'object',
      properties: {
        invoice_id: {
          type: 'string',
          description: 'Purchase Invoice ID'
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
    description: 'Reconcile GST between invoices and GSTR-2A. Use this when the user asks about GST reconciliation or tax verification.',
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
  'Analytics': [
    'calculate_gst_liability',
    'find_duplicate_payments',
    'vendor_aging_analysis',
    'customer_aging_analysis',
    'get_dashboard_summary'
  ],
  'Actions': [
    'create_vendor',
    'save_extracted_invoice',
    'update_invoice_status',
    'send_payment_reminder',
    'send_vendor_ledger_confirmation'
  ]
};
