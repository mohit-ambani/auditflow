import { PATTERNS } from '../constants';

/**
 * Validate GSTIN format
 */
export function validateGSTIN(gstin: string): boolean {
  return PATTERNS.GSTIN.test(gstin);
}

/**
 * Validate PAN format
 */
export function validatePAN(pan: string): boolean {
  return PATTERNS.PAN.test(pan);
}

/**
 * Validate mobile number (Indian)
 */
export function validateMobile(mobile: string): boolean {
  return PATTERNS.MOBILE.test(mobile);
}

/**
 * Validate pincode (Indian)
 */
export function validatePincode(pincode: string): boolean {
  return PATTERNS.PINCODE.test(pincode);
}

/**
 * Validate email
 */
export function validateEmail(email: string): boolean {
  return PATTERNS.EMAIL.test(email);
}

/**
 * Format currency in Indian format
 */
export function formatCurrency(
  amount: number,
  locale: string = 'en-IN',
  currency: string = 'INR'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format number in Indian format (lakhs/crores)
 */
export function formatIndianNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num);
}

/**
 * Calculate GST breakdown for intra-state transaction
 */
export function calculateIntraStateGST(
  taxableAmount: number,
  gstRate: number
): { cgst: number; sgst: number; total: number } {
  const halfRate = gstRate / 2;
  const cgst = (taxableAmount * halfRate) / 100;
  const sgst = (taxableAmount * halfRate) / 100;
  return {
    cgst: Math.round(cgst * 100) / 100,
    sgst: Math.round(sgst * 100) / 100,
    total: Math.round((cgst + sgst) * 100) / 100,
  };
}

/**
 * Calculate GST breakdown for inter-state transaction
 */
export function calculateInterStateGST(
  taxableAmount: number,
  gstRate: number
): { igst: number; total: number } {
  const igst = (taxableAmount * gstRate) / 100;
  return {
    igst: Math.round(igst * 100) / 100,
    total: Math.round(igst * 100) / 100,
  };
}

/**
 * Determine if transaction is intra-state or inter-state
 */
export function isIntraStateTransaction(
  supplierGSTIN: string,
  recipientGSTIN: string
): boolean {
  if (!validateGSTIN(supplierGSTIN) || !validateGSTIN(recipientGSTIN)) {
    return false;
  }
  // Compare first 2 digits (state code)
  return supplierGSTIN.substring(0, 2) === recipientGSTIN.substring(0, 2);
}

/**
 * Extract state code from GSTIN
 */
export function getStateCodeFromGSTIN(gstin: string): string | null {
  if (!validateGSTIN(gstin)) {
    return null;
  }
  return gstin.substring(0, 2);
}

/**
 * Extract PAN from GSTIN
 */
export function getPANFromGSTIN(gstin: string): string | null {
  if (!validateGSTIN(gstin)) {
    return null;
  }
  return gstin.substring(2, 12);
}

/**
 * Calculate percentage
 */
export function calculatePercentage(part: number, whole: number): number {
  if (whole === 0) return 0;
  return (part / whole) * 100;
}

/**
 * Round to 2 decimal places
 */
export function roundTo2Decimals(num: number): number {
  return Math.round(num * 100) / 100;
}

/**
 * Check if two numbers are within tolerance
 */
export function isWithinTolerance(
  a: number,
  b: number,
  tolerance: number
): boolean {
  return Math.abs(a - b) <= tolerance;
}

/**
 * Get financial year for a given date (India: Apr to Mar)
 */
export function getFinancialYear(date: Date): string {
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();

  if (month >= 4) {
    // April onwards
    return `${year}-${(year + 1).toString().substring(2)}`;
  } else {
    // Jan-Mar
    return `${year - 1}-${year.toString().substring(2)}`;
  }
}

/**
 * Slugify a string
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Generate a random ID
 */
export function generateId(prefix?: string): string {
  const random = Math.random().toString(36).substring(2, 15);
  return prefix ? `${prefix}_${random}` : random;
}

/**
 * Parse period string (e.g., "042024" to Date)
 */
export function parsePeriod(period: string): { month: number; year: number } | null {
  if (period.length !== 6) return null;
  const month = parseInt(period.substring(0, 2), 10);
  const year = parseInt(period.substring(2), 10);
  if (month < 1 || month > 12 || year < 2000) return null;
  return { month, year };
}

/**
 * Format period to string (e.g., Date to "042024")
 */
export function formatPeriod(date: Date): string {
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${month}${year}`;
}
