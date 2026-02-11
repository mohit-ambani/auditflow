// Indian GST rates
export const GST_RATES = [0, 5, 12, 18, 28] as const;

// Indian states (for GST)
export const INDIAN_STATES = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
] as const;

// File upload limits
export const MAX_FILE_SIZE = 26214400; // 25MB in bytes
export const MAX_FILES_PER_UPLOAD = 10;

export const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/csv': ['.csv'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
} as const;

// Payment reminder days (configurable per org)
export const DEFAULT_REMINDER_DAYS = [7, 15, 30];

// Reconciliation frequency options
export const RECONCILIATION_FREQUENCIES = [
  'WEEKLY',
  'BIWEEKLY',
  'MONTHLY',
  'QUARTERLY',
] as const;

// Default tolerances
export const DEFAULT_TOLERANCES = {
  payment: 1.0, // Rs 1
  gst: 1.0, // Rs 1
  quantity: 0, // Exact match
  price: 0.5, // 0.5%
} as const;

// Bank transaction types
export const BANK_TRANSACTION_TYPES = [
  'NEFT',
  'RTGS',
  'IMPS',
  'UPI',
  'CHEQUE',
  'CASH_DEPOSIT',
  'CASH_WITHDRAWAL',
  'BANK_CHARGES',
  'INTEREST',
  'OTHER',
] as const;

// Units of measurement
export const UNITS = [
  'PCS',
  'KG',
  'GRAM',
  'LTR',
  'ML',
  'MTR',
  'CM',
  'SQM',
  'SQFT',
  'BOX',
  'CTN',
  'BUNDLE',
  'DOZEN',
  'SET',
] as const;

// Financial year months (India: April to March)
export const FINANCIAL_YEAR_START_MONTH = 4; // April
export const FINANCIAL_YEAR_END_MONTH = 3; // March

// Regex patterns
export const PATTERNS = {
  GSTIN: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  MOBILE: /^[6-9]\d{9}$/,
  PINCODE: /^[1-9][0-9]{5}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;
