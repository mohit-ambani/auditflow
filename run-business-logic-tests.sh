#!/bin/bash

# Comprehensive Business Logic Testing Script
# Tests actual business rules, validations, and calculations

API_URL="http://localhost:4000"
RESULTS_FILE="/tmp/business_logic_detailed_results.txt"
PASSED=0
FAILED=0
TOTAL=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test result function
test_result() {
    local test_name=$1
    local status=$2
    local details=$3

    TOTAL=$((TOTAL + 1))

    if [ "$status" == "PASS" ]; then
        echo -e "${GREEN}✓${NC} Test $TOTAL: $test_name"
        PASSED=$((PASSED + 1))
        echo "✓ $test_name - $details" >> "$RESULTS_FILE"
    else
        echo -e "${RED}✗${NC} Test $TOTAL: $test_name"
        echo -e "  ${RED}Details: $details${NC}"
        FAILED=$((FAILED + 1))
        echo "✗ $test_name - $details" >> "$RESULTS_FILE"
    fi
}

# Initialize
echo "=========================================" | tee "$RESULTS_FILE"
echo "  BUSINESS LOGIC COMPREHENSIVE TESTS" | tee -a "$RESULTS_FILE"
echo "  Date: $(date)" | tee -a "$RESULTS_FILE"
echo "=========================================" | tee -a "$RESULTS_FILE"
echo ""

# Login and get token
echo -e "${BLUE}Setting up authentication...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@auditflow.com","password":"Test@123456"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token // empty')

if [ -z "$TOKEN" ]; then
    echo -e "${RED}Failed to authenticate. Cannot proceed with tests.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Authentication successful${NC}"
echo ""

# ============================================
# MODULE 1: VENDOR MANAGEMENT BUSINESS LOGIC
# ============================================
echo "========================================="
echo "MODULE 1: VENDOR MANAGEMENT"
echo "========================================="
echo ""

# Test 1.1: Create vendor with valid GSTIN
echo "Test 1.1: Create vendor with valid GSTIN..."
VENDOR_CREATE=$(curl -s -X POST "$API_URL/api/vendors" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "name": "Test Vendor Alpha",
        "gstin": "22AAAAA0000A1Z5",
        "pan": "AAAPL1234C",
        "email": "alpha@vendor.com",
        "phone": "9876543210",
        "address": "123 Test Street",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001"
    }')

if echo "$VENDOR_CREATE" | jq -e '.success == true' > /dev/null 2>&1; then
    VENDOR_ID=$(echo "$VENDOR_CREATE" | jq -r '.data.id')
    test_result "Create vendor with valid GSTIN" "PASS" "Vendor ID: $VENDOR_ID"
else
    ERROR=$(echo "$VENDOR_CREATE" | jq -r '.error // "Unknown error"')
    test_result "Create vendor with valid GSTIN" "FAIL" "$ERROR"
fi

# Test 1.2: Validate GSTIN format (invalid format should be rejected)
echo ""
echo "Test 1.2: Reject invalid GSTIN format..."
INVALID_GSTIN=$(curl -s -X POST "$API_URL/api/vendors" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "name": "Invalid GSTIN Vendor",
        "gstin": "INVALID123456",
        "email": "invalid@vendor.com"
    }')

if echo "$INVALID_GSTIN" | jq -e '.success == false' > /dev/null 2>&1; then
    test_result "Reject invalid GSTIN format" "PASS" "Invalid GSTIN properly rejected"
else
    test_result "Reject invalid GSTIN format" "FAIL" "Should reject invalid GSTIN"
fi

# Test 1.3: Duplicate GSTIN detection
echo ""
echo "Test 1.3: Prevent duplicate GSTIN..."
DUPLICATE_GSTIN=$(curl -s -X POST "$API_URL/api/vendors" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "name": "Duplicate GSTIN Vendor",
        "gstin": "22AAAAA0000A1Z5",
        "email": "duplicate@vendor.com"
    }')

if echo "$DUPLICATE_GSTIN" | jq -e '.success == false and (.error | contains("exists"))' > /dev/null 2>&1; then
    test_result "Prevent duplicate GSTIN" "PASS" "Duplicate GSTIN blocked"
else
    test_result "Prevent duplicate GSTIN" "FAIL" "Should prevent duplicate GSTIN"
fi

# Test 1.4: Validate PAN format
echo ""
echo "Test 1.4: Validate PAN format..."
INVALID_PAN=$(curl -s -X POST "$API_URL/api/vendors" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "name": "Invalid PAN Vendor",
        "pan": "INVALID",
        "email": "invalidpan@vendor.com"
    }')

if echo "$INVALID_PAN" | jq -e '.success == false' > /dev/null 2>&1; then
    test_result "Validate PAN format" "PASS" "Invalid PAN rejected"
else
    test_result "Validate PAN format" "FAIL" "Should validate PAN format"
fi

# Test 1.5: Update vendor information
if [ ! -z "$VENDOR_ID" ]; then
    echo ""
    echo "Test 1.5: Update vendor information..."
    UPDATE_VENDOR=$(curl -s -X PUT "$API_URL/api/vendors/$VENDOR_ID" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{
            "name": "Updated Vendor Alpha",
            "email": "updated@vendor.com"
        }')

    if echo "$UPDATE_VENDOR" | jq -e '.success == true' > /dev/null 2>&1; then
        test_result "Update vendor information" "PASS" "Vendor updated successfully"
    else
        ERROR=$(echo "$UPDATE_VENDOR" | jq -r '.error // "Unknown error"')
        test_result "Update vendor information" "FAIL" "$ERROR"
    fi
fi

# Test 1.6: Search vendors
echo ""
echo "Test 1.6: Search vendors by name..."
SEARCH_VENDORS=$(curl -s -X GET "$API_URL/api/vendors?search=Test" \
    -H "Authorization: Bearer $TOKEN")

if echo "$SEARCH_VENDORS" | jq -e '.success == true' > /dev/null 2>&1; then
    COUNT=$(echo "$SEARCH_VENDORS" | jq '.data.vendors | length')
    test_result "Search vendors by name" "PASS" "Found $COUNT matching vendors"
else
    test_result "Search vendors by name" "FAIL" "Search failed"
fi

echo ""

# ============================================
# MODULE 2: CUSTOMER MANAGEMENT
# ============================================
echo "========================================="
echo "MODULE 2: CUSTOMER MANAGEMENT"
echo "========================================="
echo ""

# Test 2.1: Create customer with credit limit
echo "Test 2.1: Create customer with credit limit..."
CUSTOMER_CREATE=$(curl -s -X POST "$API_URL/api/customers" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "name": "Test Customer Beta",
        "gstin": "27BBBBB1111B1Z5",
        "email": "beta@customer.com",
        "phone": "9876543210",
        "creditLimit": 100000,
        "creditDays": 30
    }')

if echo "$CUSTOMER_CREATE" | jq -e '.success == true' > /dev/null 2>&1; then
    CUSTOMER_ID=$(echo "$CUSTOMER_CREATE" | jq -r '.data.id')
    CREDIT_LIMIT=$(echo "$CUSTOMER_CREATE" | jq -r '.data.creditLimit')
    test_result "Create customer with credit limit" "PASS" "Customer ID: $CUSTOMER_ID, Credit: $CREDIT_LIMIT"
else
    ERROR=$(echo "$CUSTOMER_CREATE" | jq -r '.error // "Unknown error"')
    test_result "Create customer with credit limit" "FAIL" "$ERROR"
fi

# Test 2.2: Validate customer GSTIN
echo ""
echo "Test 2.2: Validate customer GSTIN format..."
INVALID_CUST_GSTIN=$(curl -s -X POST "$API_URL/api/customers" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "name": "Invalid Customer",
        "gstin": "BAD_GSTIN",
        "email": "invalid@customer.com"
    }')

if echo "$INVALID_CUST_GSTIN" | jq -e '.success == false' > /dev/null 2>&1; then
    test_result "Validate customer GSTIN" "PASS" "Invalid GSTIN rejected"
else
    test_result "Validate customer GSTIN" "FAIL" "Should validate GSTIN"
fi

# Test 2.3: Prevent duplicate customer GSTIN
echo ""
echo "Test 2.3: Prevent duplicate customer GSTIN..."
DUP_CUSTOMER=$(curl -s -X POST "$API_URL/api/customers" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "name": "Duplicate Customer",
        "gstin": "27BBBBB1111B1Z5",
        "email": "dup@customer.com"
    }')

if echo "$DUP_CUSTOMER" | jq -e '.success == false' > /dev/null 2>&1; then
    test_result "Prevent duplicate customer GSTIN" "PASS" "Duplicate prevented"
else
    test_result "Prevent duplicate customer GSTIN" "FAIL" "Should prevent duplicates"
fi

echo ""

# ============================================
# MODULE 3: SKU/PRODUCT MANAGEMENT
# ============================================
echo "========================================="
echo "MODULE 3: SKU/PRODUCT MANAGEMENT"
echo "========================================="
echo ""

# Test 3.1: Create SKU with HSN code
echo "Test 3.1: Create SKU with HSN code..."
SKU_CREATE=$(curl -s -X POST "$API_URL/api/skus" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "code": "SKU-TEST-001",
        "description": "Test Product Alpha",
        "hsnCode": "8471",
        "unit": "PCS",
        "gstRate": 18,
        "purchasePrice": 1000,
        "sellingPrice": 1500
    }')

if echo "$SKU_CREATE" | jq -e '.success == true' > /dev/null 2>&1; then
    SKU_ID=$(echo "$SKU_CREATE" | jq -r '.data.id')
    test_result "Create SKU with HSN code" "PASS" "SKU ID: $SKU_ID"
else
    ERROR=$(echo "$SKU_CREATE" | jq -r '.error // "Unknown error"')
    test_result "Create SKU with HSN code" "FAIL" "$ERROR"
fi

# Test 3.2: Prevent duplicate SKU code
echo ""
echo "Test 3.2: Prevent duplicate SKU code..."
DUP_SKU=$(curl -s -X POST "$API_URL/api/skus" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "code": "SKU-TEST-001",
        "description": "Duplicate SKU",
        "unit": "PCS",
        "gstRate": 18
    }')

if echo "$DUP_SKU" | jq -e '.success == false' > /dev/null 2>&1; then
    test_result "Prevent duplicate SKU code" "PASS" "Duplicate SKU blocked"
else
    test_result "Prevent duplicate SKU code" "FAIL" "Should prevent duplicate SKU codes"
fi

# Test 3.3: Create another SKU for testing
echo ""
echo "Test 3.3: Create additional SKU for testing..."
SKU_CREATE2=$(curl -s -X POST "$API_URL/api/skus" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "code": "SKU-TEST-002",
        "description": "Test Product Beta",
        "hsnCode": "8471",
        "unit": "PCS",
        "gstRate": 18,
        "purchasePrice": 500,
        "sellingPrice": 750
    }')

if echo "$SKU_CREATE2" | jq -e '.success == true' > /dev/null 2>&1; then
    SKU_ID2=$(echo "$SKU_CREATE2" | jq -r '.data.id')
    test_result "Create additional SKU" "PASS" "SKU ID: $SKU_ID2"
else
    ERROR=$(echo "$SKU_CREATE2" | jq -r '.error // "Unknown error"')
    test_result "Create additional SKU" "FAIL" "$ERROR"
fi

echo ""

# ============================================
# MODULE 4: DISCOUNT TERMS
# ============================================
echo "========================================="
echo "MODULE 4: DISCOUNT TERMS"
echo "========================================="
echo ""

# Test 4.1: Create discount term
if [ ! -z "$VENDOR_ID" ]; then
    echo "Test 4.1: Create volume discount term..."
    DISCOUNT_TERM=$(curl -s -X POST "$API_URL/api/discount-terms" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{
            "vendorId": "'"$VENDOR_ID"'",
            "discountType": "VOLUME",
            "minQuantity": 100,
            "maxQuantity": 500,
            "discountPercent": 5.0,
            "startDate": "2026-01-01",
            "endDate": "2026-12-31"
        }')

    if echo "$DISCOUNT_TERM" | jq -e '.success == true' > /dev/null 2>&1; then
        TERM_ID=$(echo "$DISCOUNT_TERM" | jq -r '.data.id')
        test_result "Create volume discount term" "PASS" "Term ID: $TERM_ID"
    else
        ERROR=$(echo "$DISCOUNT_TERM" | jq -r '.error // "Unknown error"')
        test_result "Create volume discount term" "FAIL" "$ERROR"
    fi
else
    test_result "Create volume discount term" "FAIL" "No vendor ID available"
fi

# Test 4.2: Get discount terms list
echo ""
echo "Test 4.2: List all discount terms..."
DISCOUNT_LIST=$(curl -s -X GET "$API_URL/api/discount-terms" \
    -H "Authorization: Bearer $TOKEN")

if echo "$DISCOUNT_LIST" | jq -e '.success == true' > /dev/null 2>&1; then
    TERM_COUNT=$(echo "$DISCOUNT_LIST" | jq '.data.terms | length')
    test_result "List discount terms" "PASS" "Found $TERM_COUNT terms"
else
    test_result "List discount terms" "FAIL" "Failed to list terms"
fi

echo ""

# ============================================
# MODULE 5: PO-INVOICE MATCHING
# ============================================
echo "========================================="
echo "MODULE 5: PO-INVOICE MATCHING"
echo "========================================="
echo ""

# Test 5.1: Create PO
if [ ! -z "$VENDOR_ID" ] && [ ! -z "$SKU_ID" ]; then
    echo "Test 5.1: Create purchase order with line items..."
    PO_CREATE=$(curl -s -X POST "$API_URL/api/po-invoice-matches" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{
            "type": "PO",
            "vendorId": "'"$VENDOR_ID"'",
            "documentNumber": "PO-2026-001",
            "documentDate": "2026-02-12",
            "items": [
                {
                    "skuId": "'"$SKU_ID"'",
                    "quantity": 10,
                    "rate": 1000,
                    "amount": 10000
                }
            ],
            "subtotal": 10000,
            "gstAmount": 1800,
            "total": 11800
        }')

    if echo "$PO_CREATE" | jq -e '.success == true' > /dev/null 2>&1; then
        PO_ID=$(echo "$PO_CREATE" | jq -r '.data.id')
        PO_TOTAL=$(echo "$PO_CREATE" | jq -r '.data.total')
        test_result "Create purchase order" "PASS" "PO ID: $PO_ID, Total: ₹$PO_TOTAL"
    else
        ERROR=$(echo "$PO_CREATE" | jq -r '.error // "Unknown error"')
        test_result "Create purchase order" "FAIL" "$ERROR"
    fi
else
    test_result "Create purchase order" "FAIL" "Missing vendor or SKU ID"
fi

# Test 5.2: Create matching invoice
if [ ! -z "$VENDOR_ID" ] && [ ! -z "$SKU_ID" ] && [ ! -z "$PO_ID" ]; then
    echo ""
    echo "Test 5.2: Create invoice matching PO..."
    INVOICE_CREATE=$(curl -s -X POST "$API_URL/api/po-invoice-matches" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{
            "type": "INVOICE",
            "vendorId": "'"$VENDOR_ID"'",
            "documentNumber": "INV-2026-001",
            "documentDate": "2026-02-12",
            "items": [
                {
                    "skuId": "'"$SKU_ID"'",
                    "quantity": 10,
                    "rate": 1000,
                    "amount": 10000
                }
            ],
            "subtotal": 10000,
            "gstAmount": 1800,
            "total": 11800
        }')

    if echo "$INVOICE_CREATE" | jq -e '.success == true' > /dev/null 2>&1; then
        INVOICE_ID=$(echo "$INVOICE_CREATE" | jq -r '.data.id')
        test_result "Create matching invoice" "PASS" "Invoice ID: $INVOICE_ID"
    else
        ERROR=$(echo "$INVOICE_CREATE" | jq -r '.error // "Unknown error"')
        test_result "Create matching invoice" "FAIL" "$ERROR"
    fi
fi

# Test 5.3: Get match statistics
echo ""
echo "Test 5.3: Get PO-Invoice match statistics..."
MATCH_STATS=$(curl -s -X GET "$API_URL/api/po-invoice-matches/stats" \
    -H "Authorization: Bearer $TOKEN")

if echo "$MATCH_STATS" | jq -e '.success == true' > /dev/null 2>&1; then
    TOTAL_PO=$(echo "$MATCH_STATS" | jq '.data.totalPO // 0')
    TOTAL_INV=$(echo "$MATCH_STATS" | jq '.data.totalInvoices // 0')
    test_result "Get match statistics" "PASS" "POs: $TOTAL_PO, Invoices: $TOTAL_INV"
else
    test_result "Get match statistics" "FAIL" "Failed to get stats"
fi

echo ""

# ============================================
# MODULE 6: PAYMENT MATCHING
# ============================================
echo "========================================="
echo "MODULE 6: PAYMENT MATCHING"
echo "========================================="
echo ""

# Test 6.1: Get payment match stats
echo "Test 6.1: Get payment reconciliation statistics..."
PAYMENT_STATS=$(curl -s -X GET "$API_URL/api/payment-matches/stats" \
    -H "Authorization: Bearer $TOKEN")

if echo "$PAYMENT_STATS" | jq -e '.success == true' > /dev/null 2>&1; then
    TOTAL_TXN=$(echo "$PAYMENT_STATS" | jq '.data.totalTransactions // 0')
    MATCHED=$(echo "$PAYMENT_STATS" | jq '.data.matched // 0')
    UNMATCHED=$(echo "$PAYMENT_STATS" | jq '.data.unmatched // 0')
    test_result "Get payment statistics" "PASS" "Total: $TOTAL_TXN, Matched: $MATCHED, Unmatched: $UNMATCHED"
else
    test_result "Get payment statistics" "FAIL" "Failed to get payment stats"
fi

echo ""

# ============================================
# MODULE 7: GST RECONCILIATION
# ============================================
echo "========================================="
echo "MODULE 7: GST RECONCILIATION"
echo "========================================="
echo ""

# Test 7.1: Get GST match stats
echo "Test 7.1: Get GST reconciliation statistics..."
GST_STATS=$(curl -s -X GET "$API_URL/api/gst-matches/stats" \
    -H "Authorization: Bearer $TOKEN")

if echo "$GST_STATS" | jq -e '.success == true' > /dev/null 2>&1; then
    ITC_AVAILABLE=$(echo "$GST_STATS" | jq '.data.itcAvailable // 0')
    MATCHED_GST=$(echo "$GST_STATS" | jq '.data.matched // 0')
    test_result "Get GST statistics" "PASS" "ITC Available: ₹$ITC_AVAILABLE, Matched: $MATCHED_GST"
else
    test_result "Get GST statistics" "FAIL" "Failed to get GST stats"
fi

echo ""

# ============================================
# MODULE 8: INVENTORY
# ============================================
echo "========================================="
echo "MODULE 8: INVENTORY MANAGEMENT"
echo "========================================="
echo ""

# Test 8.1: Get inventory summary
echo "Test 8.1: Get inventory summary..."
INV_SUMMARY=$(curl -s -X GET "$API_URL/api/inventory/summary" \
    -H "Authorization: Bearer $TOKEN")

if echo "$INV_SUMMARY" | jq -e '.success == true' > /dev/null 2>&1; then
    TOTAL_ITEMS=$(echo "$INV_SUMMARY" | jq '.data.totalItems // 0')
    TOTAL_VALUE=$(echo "$INV_SUMMARY" | jq '.data.totalValue // 0')
    test_result "Get inventory summary" "PASS" "Items: $TOTAL_ITEMS, Value: ₹$TOTAL_VALUE"
else
    test_result "Get inventory summary" "FAIL" "Failed to get inventory summary"
fi

echo ""

# ============================================
# MODULE 9: DISCOUNT AUDITS
# ============================================
echo "========================================="
echo "MODULE 9: DISCOUNT AUDITS"
echo "========================================="
echo ""

# Test 9.1: List discount audits
echo "Test 9.1: List discount audit entries..."
AUDIT_LIST=$(curl -s -X GET "$API_URL/api/discount-audits" \
    -H "Authorization: Bearer $TOKEN")

if echo "$AUDIT_LIST" | jq -e '.success == true' > /dev/null 2>&1; then
    AUDIT_COUNT=$(echo "$AUDIT_LIST" | jq '.data.audits | length // 0')
    test_result "List discount audits" "PASS" "Found $AUDIT_COUNT audit entries"
else
    test_result "List discount audits" "FAIL" "Failed to list audits"
fi

echo ""

# ============================================
# MODULE 10: PAYMENT REMINDERS
# ============================================
echo "========================================="
echo "MODULE 10: PAYMENT REMINDERS"
echo "========================================="
echo ""

# Test 10.1: List payment reminders
echo "Test 10.1: List payment reminders..."
REMINDERS=$(curl -s -X GET "$API_URL/api/payment-reminders" \
    -H "Authorization: Bearer $TOKEN")

if echo "$REMINDERS" | jq -e '.success == true' > /dev/null 2>&1; then
    REMINDER_COUNT=$(echo "$REMINDERS" | jq '.data.reminders | length // 0')
    test_result "List payment reminders" "PASS" "Found $REMINDER_COUNT reminders"
else
    test_result "List payment reminders" "FAIL" "Failed to list reminders"
fi

echo ""

# ============================================
# MODULE 11: VENDOR LEDGER
# ============================================
echo "========================================="
echo "MODULE 11: VENDOR LEDGER"
echo "========================================="
echo ""

# Test 11.1: List vendor ledger entries
echo "Test 11.1: List vendor ledger entries..."
LEDGER=$(curl -s -X GET "$API_URL/api/vendor-ledger" \
    -H "Authorization: Bearer $TOKEN")

if echo "$LEDGER" | jq -e '.success == true' > /dev/null 2>&1; then
    test_result "List vendor ledger" "PASS" "Ledger API accessible"
else
    test_result "List vendor ledger" "FAIL" "Failed to access ledger"
fi

echo ""

# ============================================
# MODULE 12: CREDIT/DEBIT NOTES
# ============================================
echo "========================================="
echo "MODULE 12: CREDIT/DEBIT NOTES"
echo "========================================="
echo ""

# Test 12.1: List credit/debit notes
echo "Test 12.1: List credit/debit notes..."
NOTES=$(curl -s -X GET "$API_URL/api/credit-debit-notes" \
    -H "Authorization: Bearer $TOKEN")

if echo "$NOTES" | jq -e '.success == true' > /dev/null 2>&1; then
    NOTE_COUNT=$(echo "$NOTES" | jq '.data.notes | length // 0')
    test_result "List credit/debit notes" "PASS" "Found $NOTE_COUNT notes"
else
    test_result "List credit/debit notes" "FAIL" "Failed to list notes"
fi

echo ""

# ============================================
# MODULE 13: FILE UPLOADS
# ============================================
echo "========================================="
echo "MODULE 13: FILE UPLOADS"
echo "========================================="
echo ""

# Test 13.1: Get upload statistics
echo "Test 13.1: Get upload statistics..."
UPLOAD_STATS=$(curl -s -X GET "$API_URL/api/uploads/stats" \
    -H "Authorization: Bearer $TOKEN")

if echo "$UPLOAD_STATS" | jq -e '.success == true' > /dev/null 2>&1; then
    TOTAL_FILES=$(echo "$UPLOAD_STATS" | jq '.data.totalFiles // 0')
    TOTAL_SIZE=$(echo "$UPLOAD_STATS" | jq '.data.totalSize // 0')
    test_result "Get upload statistics" "PASS" "Files: $TOTAL_FILES, Size: $TOTAL_SIZE bytes"
else
    test_result "Get upload statistics" "FAIL" "Failed to get upload stats"
fi

echo ""

# ============================================
# FINAL SUMMARY
# ============================================
echo "========================================="
echo "         FINAL TEST SUMMARY"
echo "========================================="
echo ""

PASS_RATE=$(echo "scale=2; $PASSED * 100 / $TOTAL" | bc 2>/dev/null || echo "0")

echo "Total Tests:    $TOTAL"
echo -e "${GREEN}Tests Passed:   $PASSED${NC}"
echo -e "${RED}Tests Failed:   $FAILED${NC}"
echo "Pass Rate:      $PASS_RATE%"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓✓✓ ALL BUSINESS LOGIC TESTS PASSED! ✓✓✓${NC}"
    echo ""
    echo "Business Logic Status: VALIDATED"
else
    echo -e "${YELLOW}⚠ Some tests failed. Review details above.${NC}"
    echo ""
    echo "Business Logic Status: NEEDS ATTENTION"
fi

echo ""
echo "Detailed results saved to: $RESULTS_FILE"
echo ""
echo "Test Data Created:"
if [ ! -z "$VENDOR_ID" ]; then
    echo "  - Vendor ID: $VENDOR_ID"
fi
if [ ! -z "$CUSTOMER_ID" ]; then
    echo "  - Customer ID: $CUSTOMER_ID"
fi
if [ ! -z "$SKU_ID" ]; then
    echo "  - SKU ID: $SKU_ID"
fi
if [ ! -z "$SKU_ID2" ]; then
    echo "  - SKU ID 2: $SKU_ID2"
fi
if [ ! -z "$PO_ID" ]; then
    echo "  - PO ID: $PO_ID"
fi
if [ ! -z "$INVOICE_ID" ]; then
    echo "  - Invoice ID: $INVOICE_ID"
fi
echo ""
echo "You can now test these records in the UI at http://localhost:3000"
echo ""
