import { extractWithClaude } from '../lib/claude';
import logger from '../lib/logger';

/**
 * Extract Purchase Order data using Claude API
 */
export async function extractPurchaseOrder(text: string): Promise<any> {
  const prompt = `You are an expert Indian accountant. Extract the following from this Purchase Order.
Return ONLY valid JSON, no other text.

{
  "po_number": "string",
  "po_date": "YYYY-MM-DD",
  "vendor_name": "string",
  "vendor_gstin": "string or null",
  "delivery_date": "YYYY-MM-DD or null",
  "line_items": [
    {
      "line_number": number,
      "description": "string",
      "hsn_code": "string or null",
      "quantity": number,
      "unit": "string",
      "unit_price": number,
      "discount_percent": number or 0,
      "discount_amount": number or 0,
      "taxable_amount": number,
      "gst_rate": number or null,
      "cgst": number or 0,
      "sgst": number or 0,
      "igst": number or 0,
      "total": number
    }
  ],
  "subtotal": number,
  "cgst_total": number,
  "sgst_total": number,
  "igst_total": number,
  "round_off": number or 0,
  "grand_total": number,
  "notes": "string or null"
}`;

  try {
    const result = await extractWithClaude(prompt, text);
    return result;
  } catch (error) {
    logger.error({ error }, 'Failed to extract PO data');
    throw error;
  }
}

/**
 * Extract Purchase Invoice data using Claude API
 */
export async function extractPurchaseInvoice(text: string): Promise<any> {
  const prompt = `You are an expert Indian accountant. Extract the following from this Purchase Invoice.
Return ONLY valid JSON, no other text. Verify all arithmetic calculations.

{
  "invoice_number": "string",
  "invoice_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD or null",
  "vendor_name": "string",
  "vendor_gstin": "string or null",
  "vendor_address": "string or null",
  "buyer_name": "string or null",
  "buyer_gstin": "string or null",
  "po_reference": "string or null",
  "irn": "string or null",
  "line_items": [
    {
      "line_number": number,
      "description": "string",
      "hsn_code": "string or null",
      "quantity": number,
      "unit": "string",
      "unit_price": number,
      "discount_percent": number or 0,
      "discount_amount": number or 0,
      "taxable_amount": number,
      "gst_rate": number or null,
      "cgst": number or 0,
      "sgst": number or 0,
      "igst": number or 0,
      "total": number
    }
  ],
  "subtotal": number,
  "total_discount": number or 0,
  "taxable_total": number,
  "cgst_total": number,
  "sgst_total": number,
  "igst_total": number,
  "tcs": number or 0,
  "round_off": number or 0,
  "grand_total": number,
  "amount_in_words": "string or null",
  "payment_terms": "string or null",
  "arithmetic_verified": boolean
}`;

  try {
    const result = await extractWithClaude(prompt, text);

    // Verify arithmetic
    if (result.line_items && Array.isArray(result.line_items)) {
      const calculatedSubtotal = result.line_items.reduce(
        (sum: number, item: any) => sum + (item.taxable_amount || 0),
        0
      );

      const calculatedCGST = result.line_items.reduce(
        (sum: number, item: any) => sum + (item.cgst || 0),
        0
      );

      const calculatedSGST = result.line_items.reduce(
        (sum: number, item: any) => sum + (item.sgst || 0),
        0
      );

      const calculatedIGST = result.line_items.reduce(
        (sum: number, item: any) => sum + (item.igst || 0),
        0
      );

      const tolerance = 1; // Rs 1 tolerance
      result.arithmetic_verified =
        Math.abs(calculatedSubtotal - (result.taxable_total || 0)) <= tolerance &&
        Math.abs(calculatedCGST - (result.cgst_total || 0)) <= tolerance &&
        Math.abs(calculatedSGST - (result.sgst_total || 0)) <= tolerance &&
        Math.abs(calculatedIGST - (result.igst_total || 0)) <= tolerance;
    }

    return result;
  } catch (error) {
    logger.error({ error }, 'Failed to extract invoice data');
    throw error;
  }
}

/**
 * Extract Sales Invoice data using Claude API
 */
export async function extractSalesInvoice(text: string): Promise<any> {
  // Similar structure to purchase invoice
  return extractPurchaseInvoice(text);
}

/**
 * Extract Bank Statement transactions using Claude API
 */
export async function extractBankStatement(text: string): Promise<any> {
  const prompt = `You are an expert Indian accountant. Extract all transactions from this bank statement as JSON.
Return ONLY valid JSON, no other text.

{
  "bank_name": "string or null",
  "account_number": "string or null",
  "statement_period": {
    "from": "YYYY-MM-DD",
    "to": "YYYY-MM-DD"
  },
  "opening_balance": number or null,
  "closing_balance": number or null,
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "value_date": "YYYY-MM-DD or null",
      "description": "string (full narration)",
      "reference": "string or null (UTR/cheque/ref number)",
      "debit": number or null,
      "credit": number or null,
      "balance": number or null,
      "type": "NEFT|RTGS|IMPS|UPI|CHEQUE|CASH|OTHER"
    }
  ]
}`;

  try {
    const result = await extractWithClaude(prompt, text);
    return result;
  } catch (error) {
    logger.error({ error }, 'Failed to extract bank statement data');
    throw error;
  }
}

/**
 * Extract key information from any document (generic)
 */
export async function extractGenericDocument(text: string, documentType: string): Promise<any> {
  const prompt = `You are an expert Indian accountant. Extract key information from this ${documentType} document.
Return ONLY valid JSON with the most important fields you can identify.

{
  "document_type": "string",
  "document_number": "string or null",
  "document_date": "YYYY-MM-DD or null",
  "party_name": "string or null",
  "party_gstin": "string or null",
  "total_amount": number or null,
  "key_fields": {
    // Any other important fields as key-value pairs
  },
  "summary": "Brief summary of what this document is about"
}`;

  try {
    const result = await extractWithClaude(prompt, text);
    return result;
  } catch (error) {
    logger.error({ error }, 'Failed to extract generic document data');
    throw error;
  }
}

/**
 * Calculate confidence score based on extracted data
 */
export function calculateConfidence(extractedData: any): number {
  let score = 0;
  let checks = 0;

  // Check for required fields (weighted)
  const requiredFields = [
    { field: 'invoice_number', weight: 15 },
    { field: 'po_number', weight: 15 },
    { field: 'document_number', weight: 15 },
    { field: 'invoice_date', weight: 10 },
    { field: 'po_date', weight: 10 },
    { field: 'document_date', weight: 10 },
    { field: 'vendor_name', weight: 10 },
    { field: 'party_name', weight: 10 },
    { field: 'grand_total', weight: 15 },
    { field: 'total_amount', weight: 15 },
    { field: 'line_items', weight: 20 },
    { field: 'transactions', weight: 20 },
  ];

  for (const { field, weight } of requiredFields) {
    checks++;
    if (extractedData[field]) {
      if (Array.isArray(extractedData[field])) {
        // Array fields: check if not empty
        if (extractedData[field].length > 0) {
          score += weight;
        }
      } else {
        // Non-array fields: check if truthy
        score += weight;
      }
    }
  }

  // Check for GSTIN format if present
  if (extractedData.vendor_gstin || extractedData.party_gstin) {
    checks++;
    const gstin = extractedData.vendor_gstin || extractedData.party_gstin;
    if (/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)) {
      score += 10;
    }
  }

  // Check arithmetic verification
  if (extractedData.arithmetic_verified !== undefined) {
    checks++;
    if (extractedData.arithmetic_verified) {
      score += 15;
    }
  }

  // Normalize to 0-1 scale
  return Math.min(score / 100, 1);
}

/**
 * Determine if manual review is needed
 */
export function needsManualReview(extractedData: any, confidence: number): boolean {
  // Low confidence
  if (confidence < 0.7) return true;

  // Arithmetic mismatch
  if (extractedData.arithmetic_verified === false) return true;

  // Missing critical fields
  const hasCriticalFields =
    extractedData.invoice_number ||
    extractedData.po_number ||
    extractedData.document_number;

  if (!hasCriticalFields) return true;

  return false;
}
