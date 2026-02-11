import { extractWithClaude } from '../lib/claude';
import logger from '../lib/logger';

export interface ClassificationResult {
  documentType: string;
  confidence: number;
  reasoning: string;
}

const DOCUMENT_TYPES = [
  'PURCHASE_ORDER',
  'PURCHASE_INVOICE',
  'SALES_INVOICE',
  'BANK_STATEMENT',
  'GST_RETURN',
  'CREDIT_DEBIT_NOTE',
  'INVENTORY_UPLOAD',
  'VENDOR_MASTER',
  'CUSTOMER_MASTER',
  'OTHER',
];

/**
 * Classify document type using Claude API
 */
export async function classifyDocument(text: string): Promise<ClassificationResult> {
  const prompt = `You are an expert Indian accountant. Classify this document into ONE of the following types:

- PURCHASE_ORDER: Purchase order from buyer to supplier
- PURCHASE_INVOICE: Invoice from supplier for goods/services purchased
- SALES_INVOICE: Invoice issued to customer for goods/services sold
- BANK_STATEMENT: Bank account statement showing transactions
- GST_RETURN: GST return file (GSTR-1, GSTR-2A, GSTR-2B, GSTR-3B)
- CREDIT_DEBIT_NOTE: Credit note or debit note
- INVENTORY_UPLOAD: Inventory list or stock statement
- VENDOR_MASTER: List of vendors/suppliers
- CUSTOMER_MASTER: List of customers
- OTHER: Any other document

Return ONLY valid JSON, no other text:
{
  "document_type": "one of the types above",
  "confidence": number between 0 and 1,
  "reasoning": "brief explanation of why this classification was chosen"
}

Look for keywords like:
- Purchase Order: "PO", "Purchase Order", "Delivery Date", "Order Confirmation"
- Purchase Invoice: "Tax Invoice", "Bill", "Invoice" with vendor details
- Sales Invoice: "Tax Invoice", "Invoice" with customer details
- Bank Statement: "Account Statement", "Transaction History", bank name, account number
- GST Return: "GSTR", "GST Return", "Outward Supplies", "Input Tax Credit"
- Credit/Debit Note: "Credit Note", "Debit Note", "CN", "DN"`;

  try {
    const result = await extractWithClaude(prompt, text);

    // Validate document type
    if (!DOCUMENT_TYPES.includes(result.document_type)) {
      logger.warn({ type: result.document_type }, 'Invalid document type from Claude');
      result.document_type = 'OTHER';
      result.confidence = 0.5;
    }

    return {
      documentType: result.document_type,
      confidence: result.confidence || 0.5,
      reasoning: result.reasoning || 'Classified by AI',
    };
  } catch (error) {
    logger.error({ error }, 'Failed to classify document');

    // Fallback to keyword-based classification
    return classifyByKeywords(text);
  }
}

/**
 * Fallback: Classify document by keywords (rule-based)
 */
function classifyByKeywords(text: string): ClassificationResult {
  const lowerText = text.toLowerCase();

  // Purchase Order
  if (
    (lowerText.includes('purchase order') || lowerText.includes('po no')) &&
    !lowerText.includes('invoice')
  ) {
    return {
      documentType: 'PURCHASE_ORDER',
      confidence: 0.7,
      reasoning: 'Contains "Purchase Order" keywords',
    };
  }

  // Invoice (need to determine if purchase or sales)
  if (lowerText.includes('invoice') || lowerText.includes('tax invoice')) {
    // Check if it's from supplier (purchase) or to customer (sales)
    if (
      lowerText.includes('bill to') ||
      lowerText.includes('customer') ||
      lowerText.includes('buyer')
    ) {
      return {
        documentType: 'SALES_INVOICE',
        confidence: 0.6,
        reasoning: 'Contains invoice keywords with customer references',
      };
    } else {
      return {
        documentType: 'PURCHASE_INVOICE',
        confidence: 0.6,
        reasoning: 'Contains invoice keywords',
      };
    }
  }

  // Bank Statement
  if (
    lowerText.includes('account statement') ||
    lowerText.includes('bank statement') ||
    lowerText.includes('transaction history') ||
    (lowerText.includes('debit') && lowerText.includes('credit') && lowerText.includes('balance'))
  ) {
    return {
      documentType: 'BANK_STATEMENT',
      confidence: 0.7,
      reasoning: 'Contains bank statement keywords',
    };
  }

  // GST Return
  if (
    lowerText.includes('gstr') ||
    lowerText.includes('gst return') ||
    lowerText.includes('outward supplies') ||
    lowerText.includes('input tax credit')
  ) {
    return {
      documentType: 'GST_RETURN',
      confidence: 0.8,
      reasoning: 'Contains GST return keywords',
    };
  }

  // Credit/Debit Note
  if (lowerText.includes('credit note') || lowerText.includes('debit note')) {
    return {
      documentType: 'CREDIT_DEBIT_NOTE',
      confidence: 0.7,
      reasoning: 'Contains credit/debit note keywords',
    };
  }

  // Inventory
  if (
    lowerText.includes('stock statement') ||
    lowerText.includes('inventory list') ||
    (lowerText.includes('item') && lowerText.includes('quantity') && lowerText.includes('sku'))
  ) {
    return {
      documentType: 'INVENTORY_UPLOAD',
      confidence: 0.6,
      reasoning: 'Contains inventory keywords',
    };
  }

  // Default
  return {
    documentType: 'OTHER',
    confidence: 0.5,
    reasoning: 'Could not determine document type from keywords',
  };
}
