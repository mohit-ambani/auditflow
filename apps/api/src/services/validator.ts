import { validateGSTIN, validatePAN } from '@auditflow/shared';
import logger from '../lib/logger';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate extracted invoice data
 */
export function validateInvoiceData(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!data.invoice_number) {
    errors.push('Missing invoice number');
  }

  if (!data.invoice_date) {
    errors.push('Missing invoice date');
  } else if (!isValidDate(data.invoice_date)) {
    errors.push('Invalid invoice date format');
  }

  if (!data.vendor_name && !data.party_name) {
    errors.push('Missing vendor/party name');
  }

  if (!data.grand_total && !data.total_amount) {
    errors.push('Missing total amount');
  }

  // Validate GSTIN if present
  if (data.vendor_gstin) {
    if (!validateGSTIN(data.vendor_gstin)) {
      errors.push('Invalid vendor GSTIN format');
    }
  }

  if (data.buyer_gstin) {
    if (!validateGSTIN(data.buyer_gstin)) {
      errors.push('Invalid buyer GSTIN format');
    }
  }

  // Validate amounts
  if (data.grand_total !== undefined && data.grand_total < 0) {
    errors.push('Grand total cannot be negative');
  }

  if (data.line_items && Array.isArray(data.line_items)) {
    if (data.line_items.length === 0) {
      warnings.push('No line items found');
    }

    // Validate each line item
    data.line_items.forEach((item: any, index: number) => {
      if (item.quantity !== undefined && item.quantity <= 0) {
        warnings.push(`Line ${index + 1}: Invalid quantity`);
      }

      if (item.unit_price !== undefined && item.unit_price < 0) {
        warnings.push(`Line ${index + 1}: Invalid unit price`);
      }
    });
  }

  // Check GST tax structure (should have either CGST+SGST or IGST, not both)
  if (data.cgst_total && data.igst_total && data.cgst_total > 0 && data.igst_total > 0) {
    warnings.push('Invoice has both CGST and IGST (should be one or the other)');
  }

  if (data.cgst_total && data.sgst_total) {
    // CGST and SGST should be equal for intra-state
    if (Math.abs(data.cgst_total - data.sgst_total) > 1) {
      warnings.push('CGST and SGST amounts differ (should be equal)');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate extracted PO data
 */
export function validatePOData(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data.po_number) {
    errors.push('Missing PO number');
  }

  if (!data.po_date) {
    errors.push('Missing PO date');
  } else if (!isValidDate(data.po_date)) {
    errors.push('Invalid PO date format');
  }

  if (!data.vendor_name) {
    errors.push('Missing vendor name');
  }

  if (!data.line_items || !Array.isArray(data.line_items) || data.line_items.length === 0) {
    errors.push('No line items found');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate extracted bank statement data
 */
export function validateBankStatementData(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data.transactions || !Array.isArray(data.transactions)) {
    errors.push('No transactions found');
  } else if (data.transactions.length === 0) {
    errors.push('Empty transaction list');
  } else {
    // Validate each transaction
    data.transactions.forEach((txn: any, index: number) => {
      if (!txn.date) {
        warnings.push(`Transaction ${index + 1}: Missing date`);
      }

      if (!txn.description) {
        warnings.push(`Transaction ${index + 1}: Missing description`);
      }

      if (!txn.debit && !txn.credit) {
        warnings.push(`Transaction ${index + 1}: Missing debit/credit amount`);
      }

      if (txn.debit && txn.credit) {
        warnings.push(`Transaction ${index + 1}: Has both debit and credit`);
      }
    });
  }

  // Check balance consistency
  if (data.opening_balance !== null && data.closing_balance !== null && data.transactions) {
    const calculatedBalance = calculateBalance(
      data.opening_balance,
      data.transactions
    );

    if (Math.abs(calculatedBalance - data.closing_balance) > 1) {
      warnings.push(
        `Balance mismatch: Expected ${data.closing_balance}, calculated ${calculatedBalance}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Helper: Check if date is valid
 */
function isValidDate(dateStr: string): boolean {
  if (!dateStr) return false;

  // Check format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }

  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Helper: Calculate balance from transactions
 */
function calculateBalance(opening: number, transactions: any[]): number {
  let balance = opening;

  for (const txn of transactions) {
    if (txn.debit) {
      balance -= txn.debit;
    }
    if (txn.credit) {
      balance += txn.credit;
    }
  }

  return balance;
}

/**
 * Validate extracted data based on document type
 */
export function validateExtractedData(documentType: string, data: any): ValidationResult {
  switch (documentType) {
    case 'PURCHASE_ORDER':
      return validatePOData(data);

    case 'PURCHASE_INVOICE':
    case 'SALES_INVOICE':
      return validateInvoiceData(data);

    case 'BANK_STATEMENT':
      return validateBankStatementData(data);

    default:
      // Generic validation
      return {
        valid: true,
        errors: [],
        warnings: [],
      };
  }
}
