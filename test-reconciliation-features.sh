#!/bin/bash

# AuditFlow - Comprehensive Reconciliation Feature Testing Script
# Tests all 13 reconciliation modules with sample data

set -e

API_URL="http://localhost:4000/api"
TOKEN=""
ORG_ID=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0

echo "=========================================="
echo "AuditFlow Reconciliation Testing Suite"
echo "=========================================="
echo ""

# Step 1: Login and get token
echo -e "${YELLOW}[1/15] Authenticating...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "demo@auditflow.com",
    "password": "Password123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ Login failed${NC}"
  echo $LOGIN_RESPONSE
  exit 1
else
  echo -e "${GREEN}✓ Authentication successful${NC}"
  PASSED=$((PASSED + 1))
fi

# Extract orgId from token (it's a JWT)
# For now, we'll get it from the user info
USER_INFO=$(curl -s "$API_URL/auth/me" \
  -H "Authorization: Bearer $TOKEN")
ORG_ID=$(echo $USER_INFO | grep -o '"orgId":"[^"]*' | cut -d'"' -f4)
echo "Organization ID: $ORG_ID"
echo ""

# Step 2: Test Vendors API
echo -e "${YELLOW}[2/15] Testing Vendor Management...${NC}"
VENDOR_RESPONSE=$(curl -s -X POST "$API_URL/vendors" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Test Vendor Ltd",
    "gstin": "29AAAAA0000A1Z5",
    "email": "test@vendor.com",
    "phone": "9876543210",
    "address": "123 Test Street",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560001",
    "contactPerson": "John Doe"
  }')

if echo "$VENDOR_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Vendor created successfully${NC}"
  VENDOR_ID=$(echo $VENDOR_RESPONSE | grep -o '"id":"[^"]*' | grep -o 'c[^"]*')
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ Vendor creation failed${NC}"
  echo $VENDOR_RESPONSE
  FAILED=$((FAILED + 1))
fi
echo ""

# Step 3: Test Customers API
echo -e "${YELLOW}[3/15] Testing Customer Management...${NC}"
CUSTOMER_RESPONSE=$(curl -s -X POST "$API_URL/customers" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Test Customer Ltd",
    "gstin": "29BBBBB0000B1Z5",
    "email": "test@customer.com",
    "phone": "9876543211",
    "address": "456 Test Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "contactPerson": "Jane Smith"
  }')

if echo "$CUSTOMER_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Customer created successfully${NC}"
  CUSTOMER_ID=$(echo $CUSTOMER_RESPONSE | grep -o '"id":"[^"]*' | grep -o 'c[^"]*')
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ Customer creation failed${NC}"
  FAILED=$((FAILED + 1))
fi
echo ""

# Step 4: Test SKU Master
echo -e "${YELLOW}[4/15] Testing SKU Master Management...${NC}"
SKU_RESPONSE=$(curl -s -X POST "$API_URL/skus" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "skuCode": "TEST-001",
    "name": "Test Product",
    "description": "A test product for reconciliation",
    "hsnCode": "8471",
    "unit": "PCS",
    "gstRate": 18.0,
    "purchasePrice": 1000.00,
    "sellingPrice": 1500.00
  }')

if echo "$SKU_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ SKU created successfully${NC}"
  SKU_ID=$(echo $SKU_RESPONSE | grep -o '"id":"[^"]*' | grep -o 'c[^"]*')
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ SKU creation failed${NC}"
  FAILED=$((FAILED + 1))
fi
echo ""

# Step 5: Test Discount Terms
echo -e "${YELLOW}[5/15] Testing Discount Terms...${NC}"
DISCOUNT_RESPONSE=$(curl -s -X POST "$API_URL/discount-terms" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "termName": "Early Payment Discount",
    "discountType": "PERCENTAGE",
    "discountValue": 5.0,
    "description": "5% discount for payment within 10 days"
  }')

if echo "$DISCOUNT_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Discount term created successfully${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ Discount term creation failed${NC}"
  FAILED=$((FAILED + 1))
fi
echo ""

# Step 6: Test Inventory Management
echo -e "${YELLOW}[6/15] Testing Inventory Management...${NC}"
INVENTORY_RESPONSE=$(curl -s "$API_URL/inventory/summary" \
  -H "Authorization: Bearer $TOKEN")

if echo "$INVENTORY_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Inventory summary retrieved${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ Inventory summary failed${NC}"
  FAILED=$((FAILED + 1))
fi
echo ""

# Step 7: Test File Upload
echo -e "${YELLOW}[7/15] Testing File Upload System...${NC}"
# Create a temporary test file
echo "TEST INVOICE - INV-TEST-001" > /tmp/test-upload.txt
UPLOAD_RESPONSE=$(curl -s -X POST "$API_URL/uploads" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test-upload.txt" \
  -F "documentType=PURCHASE_INVOICE")

if echo "$UPLOAD_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ File uploaded successfully${NC}"
  FILE_ID=$(echo $UPLOAD_RESPONSE | grep -o '"id":"[^"]*' | head -1 | grep -o 'c[^"]*')
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ File upload failed${NC}"
  FAILED=$((FAILED + 1))
fi
rm /tmp/test-upload.txt
echo ""

# Step 8: Test Upload Statistics
echo -e "${YELLOW}[8/15] Testing Upload Statistics...${NC}"
UPLOAD_STATS=$(curl -s "$API_URL/uploads/stats" \
  -H "Authorization: Bearer $TOKEN")

if echo "$UPLOAD_STATS" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Upload statistics retrieved${NC}"
  echo "Stats: $UPLOAD_STATS" | grep -o '"totalFiles":[0-9]*'
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ Upload statistics failed${NC}"
  FAILED=$((FAILED + 1))
fi
echo ""

# Step 9: Test PO-Invoice Matching Statistics
echo -e "${YELLOW}[9/15] Testing PO-Invoice Match Statistics...${NC}"
PO_STATS=$(curl -s "$API_URL/po-invoice-matches/stats" \
  -H "Authorization: Bearer $TOKEN")

if echo "$PO_STATS" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ PO-Invoice match statistics retrieved${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ PO-Invoice match statistics failed${NC}"
  FAILED=$((FAILED + 1))
fi
echo ""

# Step 10: Test Payment Matching Statistics
echo -e "${YELLOW}[10/15] Testing Payment Match Statistics...${NC}"
PAYMENT_STATS=$(curl -s "$API_URL/payment-matches/stats" \
  -H "Authorization: Bearer $TOKEN")

if echo "$PAYMENT_STATS" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Payment match statistics retrieved${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ Payment match statistics failed${NC}"
  FAILED=$((FAILED + 1))
fi
echo ""

# Step 11: Test GST Matching Statistics
echo -e "${YELLOW}[11/15] Testing GST Match Statistics...${NC}"
GST_STATS=$(curl -s "$API_URL/gst-matches/stats" \
  -H "Authorization: Bearer $TOKEN")

if echo "$GST_STATS" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ GST match statistics retrieved${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ GST match statistics failed${NC}"
  FAILED=$((FAILED + 1))
fi
echo ""

# Step 12: Test Vendor Ledger
echo -e "${YELLOW}[12/15] Testing Vendor Ledger...${NC}"
LEDGER_RESPONSE=$(curl -s "$API_URL/vendor-ledger" \
  -H "Authorization: Bearer $TOKEN")

if echo "$LEDGER_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Vendor ledger retrieved${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ Vendor ledger retrieval failed${NC}"
  FAILED=$((FAILED + 1))
fi
echo ""

# Step 13: Test Payment Reminders
echo -e "${YELLOW}[13/15] Testing Payment Reminders...${NC}"
REMINDERS_RESPONSE=$(curl -s "$API_URL/payment-reminders" \
  -H "Authorization: Bearer $TOKEN")

if echo "$REMINDERS_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Payment reminders retrieved${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ Payment reminders retrieval failed${NC}"
  FAILED=$((FAILED + 1))
fi
echo ""

# Step 14: Test Discount Audits
echo -e "${YELLOW}[14/15] Testing Discount Audits...${NC}"
AUDIT_RESPONSE=$(curl -s "$API_URL/discount-audits" \
  -H "Authorization: Bearer $TOKEN")

if echo "$AUDIT_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Discount audits retrieved${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ Discount audits retrieval failed${NC}"
  FAILED=$((FAILED + 1))
fi
echo ""

# Step 15: Test Credit/Debit Notes
echo -e "${YELLOW}[15/15] Testing Credit/Debit Notes...${NC}"
NOTES_RESPONSE=$(curl -s "$API_URL/credit-debit-notes" \
  -H "Authorization: Bearer $TOKEN")

if echo "$NOTES_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Credit/Debit notes retrieved${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ Credit/Debit notes retrieval failed${NC}"
  FAILED=$((FAILED + 1))
fi
echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed! ✓${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed. Please review the errors above.${NC}"
  exit 1
fi
