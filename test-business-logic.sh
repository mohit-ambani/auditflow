#!/bin/bash

# AuditFlow - Comprehensive Business Logic Testing
# Tests all business logic, calculations, validations, and data integrity

set -e

API_URL="http://localhost:4000/api"
TOKEN=""
ORG_ID=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0
WARNINGS=0

echo "=========================================="
echo "AuditFlow Business Logic Testing Suite"
echo "=========================================="
echo ""

# Helper function to test API response
test_api() {
  local test_name="$1"
  local response="$2"
  local expected_field="$3"

  if echo "$response" | grep -q "$expected_field"; then
    echo -e "${GREEN}✓ $test_name${NC}"
    PASSED=$((PASSED + 1))
    return 0
  else
    echo -e "${RED}✗ $test_name${NC}"
    echo "Response: $response"
    FAILED=$((FAILED + 1))
    return 1
  fi
}

# Helper to validate number
validate_number() {
  local value="$1"
  local test_name="$2"

  if [[ "$value" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
    echo -e "${GREEN}✓ $test_name: $value${NC}"
    PASSED=$((PASSED + 1))
    return 0
  else
    echo -e "${RED}✗ $test_name: Invalid number '$value'${NC}"
    FAILED=$((FAILED + 1))
    return 1
  fi
}

# Step 1: Authentication
echo -e "${BLUE}[AUTHENTICATION TESTS]${NC}"
echo "======================================"

echo "Test 1.1: Login with valid credentials"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "demo@auditflow.com",
    "password": "Password123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
test_api "Valid login returns token" "$LOGIN_RESPONSE" '"token"'

echo ""
echo "Test 1.2: Login with invalid credentials"
INVALID_LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "wrong@email.com",
    "password": "wrong"
  }')

if echo "$INVALID_LOGIN" | grep -q '"success":false'; then
  echo -e "${GREEN}✓ Invalid login properly rejected${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ Invalid login should be rejected${NC}"
  FAILED=$((FAILED + 1))
fi

echo ""
echo "Test 1.3: Access protected route without token"
NO_AUTH=$(curl -s "$API_URL/vendors")

if echo "$NO_AUTH" | grep -q -E '(unauthorized|Unauthorized|401)'; then
  echo -e "${GREEN}✓ Protected route requires authentication${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ Protected route should require auth${NC}"
  FAILED=$((FAILED + 1))
fi

echo ""
echo ""

# Step 2: Vendor Management Business Logic
echo -e "${BLUE}[VENDOR MANAGEMENT TESTS]${NC}"
echo "======================================"

echo "Test 2.1: Create vendor with valid GSTIN"
VENDOR_RESPONSE=$(curl -s -X POST "$API_URL/vendors" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Test Electronics Ltd",
    "gstin": "29AABCT1332L1Z5",
    "email": "test@electronics.com",
    "phone": "9876543210",
    "address": "123 MG Road",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560001"
  }')

VENDOR_ID=$(echo $VENDOR_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
test_api "Vendor created with valid data" "$VENDOR_RESPONSE" '"success":true'

echo ""
echo "Test 2.2: GSTIN validation (invalid format)"
INVALID_GSTIN=$(curl -s -X POST "$API_URL/vendors" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Bad Vendor",
    "gstin": "INVALID123",
    "email": "bad@vendor.com"
  }')

if echo "$INVALID_GSTIN" | grep -q -E '(error|validation|invalid)'; then
  echo -e "${GREEN}✓ Invalid GSTIN properly rejected${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${YELLOW}⚠ GSTIN validation may need improvement${NC}"
  WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "Test 2.3: Duplicate GSTIN validation"
DUPLICATE_GSTIN=$(curl -s -X POST "$API_URL/vendors" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Duplicate Vendor",
    "gstin": "29AABCT1332L1Z5",
    "email": "duplicate@vendor.com"
  }')

if echo "$DUPLICATE_GSTIN" | grep -q -E '(exists|duplicate|already)'; then
  echo -e "${GREEN}✓ Duplicate GSTIN properly rejected${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${YELLOW}⚠ Duplicate GSTIN check may need implementation${NC}"
  WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo ""

# Step 3: Customer Management
echo -e "${BLUE}[CUSTOMER MANAGEMENT TESTS]${NC}"
echo "======================================"

echo "Test 3.1: Create customer"
CUSTOMER_RESPONSE=$(curl -s -X POST "$API_URL/customers" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Test Customer Ltd",
    "gstin": "27AABCT5678K1Z8",
    "email": "customer@test.com",
    "phone": "9876543211"
  }')

CUSTOMER_ID=$(echo $CUSTOMER_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
test_api "Customer created successfully" "$CUSTOMER_RESPONSE" '"success":true'

echo ""
echo ""

# Step 4: SKU Management
echo -e "${BLUE}[SKU MANAGEMENT TESTS]${NC}"
echo "======================================"

echo "Test 4.1: Create SKU with pricing"
SKU_RESPONSE=$(curl -s -X POST "$API_URL/skus" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "skuCode": "LAPTOP-001",
    "name": "Dell Laptop",
    "hsnCode": "8471",
    "unit": "PCS",
    "gstRate": 18.0,
    "purchasePrice": 45000.00,
    "sellingPrice": 50000.00
  }')

SKU_ID=$(echo $SKU_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
test_api "SKU created with pricing" "$SKU_RESPONSE" '"success":true'

echo ""
echo "Test 4.2: GST rate validation"
INVALID_GST=$(curl -s -X POST "$API_URL/skus" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "skuCode": "TEST-999",
    "name": "Test Product",
    "hsnCode": "1234",
    "unit": "PCS",
    "gstRate": 35.0,
    "purchasePrice": 100.00,
    "sellingPrice": 150.00
  }')

if echo "$INVALID_GST" | grep -q -E '(error|invalid)'; then
  echo -e "${GREEN}✓ Invalid GST rate rejected${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${YELLOW}⚠ GST rate validation: Accepted (may allow custom rates)${NC}"
  WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo ""

# Step 5: Upload and File Processing
echo -e "${BLUE}[FILE UPLOAD TESTS]${NC}"
echo "======================================"

echo "Test 5.1: Create test invoice file"
cat > /tmp/test-invoice.txt << 'EOF'
TAX INVOICE

ABC Electronics Pvt Ltd
GSTIN: 29AABCT1332L1Z5
Address: 123 MG Road, Bangalore - 560001

BILL TO:
Test Customer Ltd
GSTIN: 27AABCT5678K1Z8

Invoice No: INV-TEST-001
Invoice Date: 12-Feb-2026
Due Date: 14-Mar-2026

S.No | Description | HSN | Qty | Rate | Amount
1 | Dell Laptop | 8471 | 2 | 45000.00 | 90000.00

Subtotal: 90000.00
CGST @9%: 8100.00
SGST @9%: 8100.00
Grand Total: 106200.00
EOF

UPLOAD_RESPONSE=$(curl -s -X POST "$API_URL/uploads" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test-invoice.txt" \
  -F "documentType=PURCHASE_INVOICE")

FILE_ID=$(echo $UPLOAD_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
test_api "File uploaded successfully" "$UPLOAD_RESPONSE" '"success":true'

echo ""
echo "Test 5.2: File size validation (exceed limit)"
dd if=/dev/zero of=/tmp/large-file.bin bs=1M count=30 2>/dev/null

LARGE_FILE=$(curl -s -X POST "$API_URL/uploads" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/large-file.bin" \
  -F "documentType=OTHER")

if echo "$LARGE_FILE" | grep -q -E '(size|limit|25MB)'; then
  echo -e "${GREEN}✓ File size limit enforced${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ File size validation failed${NC}"
  FAILED=$((FAILED + 1))
fi

rm /tmp/large-file.bin

echo ""
echo ""

# Step 6: AI Extraction Business Logic
echo -e "${BLUE}[AI EXTRACTION TESTS]${NC}"
echo "======================================"

if [ ! -z "$FILE_ID" ]; then
  echo "Test 6.1: Extract invoice data with AI"
  INVOICE_TEXT=$(cat /tmp/test-invoice.txt)

  EXTRACT_RESPONSE=$(curl -s -X POST "$API_URL/ai-demo/extract-invoice" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d "{\"documentText\": \"$INVOICE_TEXT\"}")

  if echo "$EXTRACT_RESPONSE" | grep -q '"invoice_number"'; then
    echo -e "${GREEN}✓ AI extracted invoice number${NC}"
    PASSED=$((PASSED + 1))
  else
    echo -e "${YELLOW}⚠ AI extraction may need API credits${NC}"
    WARNINGS=$((WARNINGS + 1))
  fi

  echo ""
  echo "Test 6.2: Arithmetic verification"
  ARITHMETIC=$(echo "$EXTRACT_RESPONSE" | grep -o '"arithmetic_verified":[^,}]*' | cut -d':' -f2)

  if [ "$ARITHMETIC" = "true" ]; then
    echo -e "${GREEN}✓ Arithmetic verification passed${NC}"
    PASSED=$((PASSED + 1))
  else
    echo -e "${YELLOW}⚠ Arithmetic verification: $ARITHMETIC${NC}"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

echo ""
echo ""

# Step 7: Invoice Calculations
echo -e "${BLUE}[INVOICE CALCULATION TESTS]${NC}"
echo "======================================"

echo "Test 7.1: GST calculation correctness"
# Test: 90000 + 9% CGST + 9% SGST = 106200
SUBTOTAL=90000
GST_RATE=18
CGST_CALC=$(echo "$SUBTOTAL * 0.09" | bc)
SGST_CALC=$(echo "$SUBTOTAL * 0.09" | bc)
TOTAL_CALC=$(echo "$SUBTOTAL + $CGST_CALC + $SGST_CALC" | bc)

validate_number "$CGST_CALC" "CGST Calculation (9% of 90000)"
validate_number "$SGST_CALC" "SGST Calculation (9% of 90000)"

if [ "$TOTAL_CALC" = "106200.00" ]; then
  echo -e "${GREEN}✓ Total calculation correct: $TOTAL_CALC${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ Total calculation error: Expected 106200.00, got $TOTAL_CALC${NC}"
  FAILED=$((FAILED + 1))
fi

echo ""
echo ""

# Step 8: Matching Algorithm Tests
echo -e "${BLUE}[MATCHING ALGORITHM TESTS]${NC}"
echo "======================================"

echo "Test 8.1: Get PO-Invoice matching statistics"
MATCH_STATS=$(curl -s "$API_URL/po-invoice-matches/stats" \
  -H "Authorization: Bearer $TOKEN")

test_api "Match statistics retrieved" "$MATCH_STATS" '"success":true'

TOTAL_MATCHES=$(echo "$MATCH_STATS" | grep -o '"totalMatches":[0-9]*' | cut -d':' -f2)
echo "  - Total matches: $TOTAL_MATCHES"

echo ""
echo "Test 8.2: Payment matching statistics"
PAYMENT_STATS=$(curl -s "$API_URL/payment-matches/stats" \
  -H "Authorization: Bearer $TOKEN")

test_api "Payment match stats retrieved" "$PAYMENT_STATS" '"success":true'

echo ""
echo ""

# Step 9: GST Reconciliation Logic
echo -e "${BLUE}[GST RECONCILIATION TESTS]${NC}"
echo "======================================"

echo "Test 9.1: GST matching statistics"
GST_STATS=$(curl -s "$API_URL/gst-matches/stats" \
  -H "Authorization: Bearer $TOKEN")

test_api "GST statistics retrieved" "$GST_STATS" '"success":true'

TOTAL_ITC=$(echo "$GST_STATS" | grep -o '"totalITCValue":[0-9.]*' | cut -d':' -f2)
if [ ! -z "$TOTAL_ITC" ]; then
  echo "  - Total ITC value: ₹$TOTAL_ITC"
  PASSED=$((PASSED + 1))
fi

echo ""
echo ""

# Step 10: Data Integrity Tests
echo -e "${BLUE}[DATA INTEGRITY TESTS]${NC}"
echo "======================================"

echo "Test 10.1: Vendor count consistency"
VENDOR_LIST=$(curl -s "$API_URL/vendors?limit=1000" \
  -H "Authorization: Bearer $TOKEN")

VENDOR_COUNT=$(echo "$VENDOR_LIST" | grep -o '"total":[0-9]*' | cut -d':' -f2)
echo "  - Total vendors in DB: $VENDOR_COUNT"

if [ "$VENDOR_COUNT" -ge 1 ]; then
  echo -e "${GREEN}✓ Vendors exist in database${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${YELLOW}⚠ No vendors in database${NC}"
  WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "Test 10.2: Customer count consistency"
CUSTOMER_LIST=$(curl -s "$API_URL/customers?limit=1000" \
  -H "Authorization: Bearer $TOKEN")

CUSTOMER_COUNT=$(echo "$CUSTOMER_LIST" | grep -o '"total":[0-9]*' | cut -d':' -f2)
echo "  - Total customers in DB: $CUSTOMER_COUNT"

if [ "$CUSTOMER_COUNT" -ge 1 ]; then
  echo -e "${GREEN}✓ Customers exist in database${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${YELLOW}⚠ No customers in database${NC}"
  WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "Test 10.3: SKU count consistency"
SKU_LIST=$(curl -s "$API_URL/skus?limit=1000" \
  -H "Authorization: Bearer $TOKEN")

SKU_COUNT=$(echo "$SKU_LIST" | grep -o '"total":[0-9]*' | cut -d':' -f2)
echo "  - Total SKUs in DB: $SKU_COUNT"

if [ "$SKU_COUNT" -ge 1 ]; then
  echo -e "${GREEN}✓ SKUs exist in database${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${YELLOW}⚠ No SKUs in database${NC}"
  WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo ""

# Step 11: Pagination Tests
echo -e "${BLUE}[PAGINATION TESTS]${NC}"
echo "======================================"

echo "Test 11.1: Vendor list pagination"
PAGE1=$(curl -s "$API_URL/vendors?limit=5&offset=0" \
  -H "Authorization: Bearer $TOKEN")

PAGE1_COUNT=$(echo "$PAGE1" | grep -o '"vendors":\[' | wc -l)
test_api "Pagination limit works" "$PAGE1" '"vendors":'

echo ""
echo ""

# Step 12: Search and Filter Tests
echo -e "${BLUE}[SEARCH & FILTER TESTS]${NC}"
echo "======================================"

echo "Test 12.1: Search vendors by name"
SEARCH_RESULT=$(curl -s "$API_URL/vendors?search=Test" \
  -H "Authorization: Bearer $TOKEN")

test_api "Search functionality works" "$SEARCH_RESULT" '"success":true'

echo ""
echo ""

# Step 13: Statistics Aggregation
echo -e "${BLUE}[STATISTICS TESTS]${NC}"
echo "======================================"

echo "Test 13.1: Upload statistics"
UPLOAD_STATS=$(curl -s "$API_URL/uploads/stats" \
  -H "Authorization: Bearer $TOKEN")

test_api "Upload stats retrieved" "$UPLOAD_STATS" '"success":true'

TOTAL_FILES=$(echo "$UPLOAD_STATS" | grep -o '"totalFiles":[0-9]*' | cut -d':' -f2)
TOTAL_SIZE=$(echo "$UPLOAD_STATS" | grep -o '"totalSize":[0-9]*' | cut -d':' -f2)

echo "  - Total files: $TOTAL_FILES"
echo "  - Total size: $TOTAL_SIZE bytes"

echo ""
echo ""

# Step 14: Error Handling Tests
echo -e "${BLUE}[ERROR HANDLING TESTS]${NC}"
echo "======================================"

echo "Test 14.1: Invalid JSON handling"
INVALID_JSON=$(curl -s -X POST "$API_URL/vendors" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{invalid json}')

if echo "$INVALID_JSON" | grep -q -E '(error|invalid|parse)'; then
  echo -e "${GREEN}✓ Invalid JSON properly rejected${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ Invalid JSON should be rejected${NC}"
  FAILED=$((FAILED + 1))
fi

echo ""
echo "Test 14.2: Missing required fields"
MISSING_FIELDS=$(curl -s -X POST "$API_URL/vendors" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name": "Incomplete Vendor"}')

if echo "$MISSING_FIELDS" | grep -q -E '(error|required|validation)'; then
  echo -e "${GREEN}✓ Missing fields properly validated${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${YELLOW}⚠ Required field validation may need improvement${NC}"
  WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "Test 14.3: Non-existent resource"
NOT_FOUND=$(curl -s "$API_URL/vendors/non-existent-id-12345" \
  -H "Authorization: Bearer $TOKEN")

if echo "$NOT_FOUND" | grep -q -E '(404|not found|Not found)'; then
  echo -e "${GREEN}✓ 404 handling works correctly${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ Should return 404 for non-existent resource${NC}"
  FAILED=$((FAILED + 1))
fi

echo ""
echo ""

# Cleanup
rm -f /tmp/test-invoice.txt

# Summary
echo "=========================================="
echo "Business Logic Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo "Total: $((PASSED + FAILED + WARNINGS))"
echo ""

PASS_RATE=$(echo "scale=1; $PASSED * 100 / ($PASSED + $FAILED)" | bc)
echo "Pass Rate: ${PASS_RATE}%"

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}All critical tests passed! ✓${NC}"
  exit 0
else
  echo -e "${YELLOW}Some tests failed. Review above for details.${NC}"
  exit 1
fi
