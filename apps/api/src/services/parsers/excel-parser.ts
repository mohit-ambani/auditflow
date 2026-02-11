import * as XLSX from 'xlsx';
import logger from '../../lib/logger';

export interface ExcelParseResult {
  sheets: SheetData[];
  rawText: string;
  metadata: {
    sheetNames: string[];
    sheetCount: number;
  };
}

export interface SheetData {
  name: string;
  rows: any[][];
  headers?: string[];
  data?: Record<string, any>[];
}

/**
 * Parse Excel file (XLSX, XLS) or CSV
 */
export async function parseExcel(buffer: Buffer, mimeType: string): Promise<ExcelParseResult> {
  try {
    // Read workbook
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const sheets: SheetData[] = [];
    let rawText = '';

    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];

      // Convert to array of arrays
      const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        blankrows: false,
      });

      // Skip empty sheets
      if (rows.length === 0) continue;

      // Extract headers (first row)
      const headers = rows[0]?.map((h: any) => String(h).trim()) || [];

      // Convert to array of objects (for easier access)
      const data: Record<string, any>[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const obj: Record<string, any> = {};
        for (let j = 0; j < headers.length; j++) {
          const header = headers[j] || `Column_${j}`;
          obj[header] = row[j] !== undefined ? row[j] : '';
        }
        // Only add non-empty rows
        if (Object.values(obj).some((v) => v !== '')) {
          data.push(obj);
        }
      }

      sheets.push({
        name: sheetName,
        rows,
        headers,
        data,
      });

      // Add to raw text
      rawText += `Sheet: ${sheetName}\n`;
      rawText += rows.map((row) => row.join('\t')).join('\n');
      rawText += '\n\n';
    }

    return {
      sheets,
      rawText: rawText.trim(),
      metadata: {
        sheetNames: workbook.SheetNames,
        sheetCount: sheets.length,
      },
    };
  } catch (error) {
    logger.error({ error }, 'Failed to parse Excel file');
    throw new Error('Failed to parse Excel file');
  }
}

/**
 * Parse CSV file
 */
export async function parseCSV(buffer: Buffer): Promise<ExcelParseResult> {
  // CSV is treated as single-sheet Excel
  return parseExcel(buffer, 'text/csv');
}

/**
 * Detect GST return type from sheet names/headers
 */
export function detectGSTReturnType(result: ExcelParseResult): string | null {
  const text = result.rawText.toLowerCase();
  const sheetNames = result.metadata.sheetNames.map((s) => s.toLowerCase());

  // GSTR-1 (Outward supplies)
  if (
    sheetNames.some((s) => s.includes('gstr-1') || s.includes('gstr1')) ||
    text.includes('outward supplies')
  ) {
    return 'GSTR1';
  }

  // GSTR-2A (Auto-populated ITC)
  if (
    sheetNames.some((s) => s.includes('gstr-2a') || s.includes('gstr2a')) ||
    text.includes('gstr-2a')
  ) {
    return 'GSTR2A';
  }

  // GSTR-2B (Auto-populated ITC)
  if (
    sheetNames.some((s) => s.includes('gstr-2b') || s.includes('gstr2b')) ||
    text.includes('gstr-2b')
  ) {
    return 'GSTR2B';
  }

  // GSTR-3B (Summary return)
  if (
    sheetNames.some((s) => s.includes('gstr-3b') || s.includes('gstr3b')) ||
    text.includes('gstr-3b')
  ) {
    return 'GSTR3B';
  }

  return null;
}

/**
 * Parse GSTR-2A/2B format
 * Standard columns: GSTIN, Invoice Number, Invoice Date, Invoice Value, Taxable Value, IGST, CGST, SGST
 */
export function parseGSTR2(sheet: SheetData): any[] {
  const entries: any[] = [];

  if (!sheet.data || sheet.data.length === 0) return entries;

  // Common column name variations
  const columnMap: Record<string, string[]> = {
    gstin: ['gstin', 'gstin of supplier', 'supplier gstin', 'gstin/uin of supplier'],
    invoiceNumber: ['invoice number', 'invoice no', 'invoice no.', 'document number', 'note/refund voucher number'],
    invoiceDate: ['invoice date', 'date', 'invoice/advance receipt date', 'note/refund voucher date'],
    invoiceValue: ['invoice value', 'total invoice value', 'note/refund voucher value', 'gross advance paid'],
    taxableValue: ['taxable value', 'taxable amt', 'value'],
    igst: ['integrated tax', 'igst', 'igst amount'],
    cgst: ['central tax', 'cgst', 'cgst amount'],
    sgst: ['state tax', 'sgst', 'sgst amount'],
    cess: ['cess', 'cess amount'],
    placeOfSupply: ['place of supply', 'pos'],
  };

  // Find column mappings
  const findColumn = (aliases: string[]): string | null => {
    const headers = sheet.headers?.map((h) => h.toLowerCase()) || [];
    for (const alias of aliases) {
      const index = headers.findIndex((h) => h.includes(alias));
      if (index !== -1) {
        return sheet.headers![index];
      }
    }
    return null;
  };

  const cols = {
    gstin: findColumn(columnMap.gstin),
    invoiceNumber: findColumn(columnMap.invoiceNumber),
    invoiceDate: findColumn(columnMap.invoiceDate),
    invoiceValue: findColumn(columnMap.invoiceValue),
    taxableValue: findColumn(columnMap.taxableValue),
    igst: findColumn(columnMap.igst),
    cgst: findColumn(columnMap.cgst),
    sgst: findColumn(columnMap.sgst),
    cess: findColumn(columnMap.cess),
    placeOfSupply: findColumn(columnMap.placeOfSupply),
  };

  // Parse rows
  for (const row of sheet.data) {
    const entry: any = {};

    if (cols.gstin) entry.gstin = String(row[cols.gstin] || '').trim();
    if (cols.invoiceNumber) entry.invoiceNumber = String(row[cols.invoiceNumber] || '').trim();
    if (cols.invoiceDate) entry.invoiceDate = parseDate(row[cols.invoiceDate]);
    if (cols.invoiceValue) entry.invoiceValue = parseNumber(row[cols.invoiceValue]);
    if (cols.taxableValue) entry.taxableValue = parseNumber(row[cols.taxableValue]);
    if (cols.igst) entry.igst = parseNumber(row[cols.igst]);
    if (cols.cgst) entry.cgst = parseNumber(row[cols.cgst]);
    if (cols.sgst) entry.sgst = parseNumber(row[cols.sgst]);
    if (cols.cess) entry.cess = parseNumber(row[cols.cess]);
    if (cols.placeOfSupply) entry.placeOfSupply = String(row[cols.placeOfSupply] || '').trim();

    // Only add if has essential data
    if (entry.gstin && entry.invoiceNumber) {
      entries.push(entry);
    }
  }

  return entries;
}

/**
 * Parse bank statement format
 * Common columns: Date, Description/Narration, Debit, Credit, Balance, Reference
 */
export function parseBankStatement(sheet: SheetData): any[] {
  const transactions: any[] = [];

  if (!sheet.data || sheet.data.length === 0) return transactions;

  // Common column name variations
  const columnMap: Record<string, string[]> = {
    date: ['date', 'txn date', 'transaction date', 'value date', 'posting date'],
    description: ['description', 'narration', 'particulars', 'details', 'remarks'],
    debit: ['debit', 'withdrawal', 'dr', 'debit amount', 'withdrawals'],
    credit: ['credit', 'deposit', 'cr', 'credit amount', 'deposits'],
    balance: ['balance', 'closing balance', 'available balance'],
    reference: ['reference', 'ref no', 'cheque no', 'transaction ref', 'utr'],
  };

  // Find column mappings
  const findColumn = (aliases: string[]): string | null => {
    const headers = sheet.headers?.map((h) => h.toLowerCase()) || [];
    for (const alias of aliases) {
      const index = headers.findIndex((h) => h.includes(alias));
      if (index !== -1) {
        return sheet.headers![index];
      }
    }
    return null;
  };

  const cols = {
    date: findColumn(columnMap.date),
    description: findColumn(columnMap.description),
    debit: findColumn(columnMap.debit),
    credit: findColumn(columnMap.credit),
    balance: findColumn(columnMap.balance),
    reference: findColumn(columnMap.reference),
  };

  // Parse rows
  for (const row of sheet.data) {
    const txn: any = {};

    if (cols.date) txn.date = parseDate(row[cols.date]);
    if (cols.description) txn.description = String(row[cols.description] || '').trim();
    if (cols.debit) txn.debit = parseNumber(row[cols.debit]);
    if (cols.credit) txn.credit = parseNumber(row[cols.credit]);
    if (cols.balance) txn.balance = parseNumber(row[cols.balance]);
    if (cols.reference) txn.reference = String(row[cols.reference] || '').trim();

    // Only add if has essential data
    if (txn.date && txn.description && (txn.debit || txn.credit)) {
      transactions.push(txn);
    }
  }

  return transactions;
}

/**
 * Helper: Parse number from various formats
 */
function parseNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;

  let str = String(value).trim();

  // Remove currency symbols
  str = str.replace(/[₹Rs\.]/g, '');

  // Remove commas
  str = str.replace(/,/g, '');

  // Handle parentheses as negative
  if (str.startsWith('(') && str.endsWith(')')) {
    str = '-' + str.substring(1, str.length - 1);
  }

  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

/**
 * Helper: Parse date from various formats
 */
function parseDate(value: any): string | null {
  if (value === null || value === undefined || value === '') return null;

  // Excel dates are stored as numbers (days since 1900-01-01)
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }

  // Try to parse string date
  const str = String(value).trim();
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  return str; // Return as-is if can't parse
}
