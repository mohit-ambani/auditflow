/**
 * Validate GSTIN (GST Identification Number)
 * Format: 2 digits (state code) + 10 alphanumeric (PAN) + 1 digit (entity number) + Z + 1 alphanumeric (checksum)
 * Example: 29ABCDE1234F1Z5
 */
export function validateGSTIN(gstin: string | null | undefined): boolean {
  if (!gstin) return false;

  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin);
}

/**
 * Validate PAN (Permanent Account Number)
 * Format: 5 letters + 4 digits + 1 letter
 * Example: ABCDE1234F
 */
export function validatePAN(pan: string | null | undefined): boolean {
  if (!pan) return false;

  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan);
}

/**
 * Validate Indian Pincode
 * Format: 6 digits
 * Example: 560001
 */
export function validatePincode(pincode: string | null | undefined): boolean {
  if (!pincode) return false;

  const pincodeRegex = /^[0-9]{6}$/;
  return pincodeRegex.test(pincode);
}
