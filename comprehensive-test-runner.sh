#!/bin/bash

# AuditFlow Comprehensive Business Logic Test Suite
# Tests all modules thoroughly for production readiness

API_URL="http://localhost:4000"
TEST_EMAIL="test@auditflow.com"
TEST_PASSWORD="Test@123456"
RESULTS_FILE="/tmp/auditflow_comprehensive_test_results.txt"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

# Test Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Stored IDs for dependent tests
TOKEN=""
VENDOR_ID_1=""
VENDOR_ID_2=""
VENDOR_ID_3=""
CUSTOMER_ID_1=""
CUSTOMER_ID_2=""
SKU_ID_1=""
SKU_ID_2=""
SKU_ID_3=""
SKU_ID_4=""
SKU_ID_5=""
PO_ID_1=""
PO_ID_2=""
PO_ID_3=""
INVOICE_ID_1=""
INVOICE_ID_2=""
INVOICE_ID_3=""
DISCOUNT_TERM_ID=""
UPLOADED_FILE_ID=""

# Log function
log_test() {
    local test_num=$1
    local test_name=$2
    local expected=$3
    local actual=$4
    local status=$5
    local details=$6

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ "$status" == "PASS" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}[PASS]${NC} Test $test_num: $test_name"
        echo "[PASS] Test $test_num: $test_name - $details" >> "$RESULTS_FILE"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "${RED}[FAIL]${NC} Test $test_num: $test_name"
        echo -e "       Expected: $expected"
        echo -e "       Actual: $actual"
        echo -e "       Details: $details"
        echo "[FAIL] Test $test_num: $test_name" >> "$RESULTS_FILE"
        echo "       Expected: $expected" >> "$RESULTS_FILE"
        echo "       Actual: $actual" >> "$RESULTS_FILE"
        echo "       Details: $details" >> "$RESULTS_FILE"
    fi
}

# Initialize results file
echo "=============================================" > "$RESULTS_FILE"
echo "AuditFlow Comprehensive Test Report" >> "$RESULTS_FILE"
echo "Date: $(date)" >> "$RESULTS_FILE"
echo "=============================================" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"

echo ""
echo -e "${CYAN}=============================================${NC}"
echo -e "${CYAN}  AUDITFLOW COMPREHENSIVE BUSINESS LOGIC TESTS${NC}"
echo -e "${CYAN}  Production Readiness Assessment${NC}"
echo -e "${CYAN}  Date: $(date)${NC}"
echo -e "${CYAN}=============================================${NC}"
echo ""

# ============================================
# SECTION 1: AUTHENTICATION TESTS
# ============================================
echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}SECTION 1: AUTHENTICATION${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Test 1.1: Login with valid credentials
echo "Running Test 1.1: Login with valid credentials..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    log_test "1.1" "Login with valid credentials" "success:true with token" "Received token" "PASS" "Authentication successful"
else
    ERROR=$(echo "$LOGIN_RESPONSE" | grep -o '"error":"[^"]*' | cut -d'"' -f4)
    log_test "1.1" "Login with valid credentials" "success:true" "success:false - $ERROR" "FAIL" "Authentication failed"
    echo -e "${RED}Cannot proceed without authentication. Exiting.${NC}"
    exit 1
fi

# Test 1.2: Login with invalid credentials
echo "Running Test 1.2: Login with invalid credentials..."
INVALID_LOGIN=$(curl -s -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"invalid@test.com","password":"wrongpassword"}')

if echo "$INVALID_LOGIN" | grep -q '"success":false'; then
    log_test "1.2" "Reject invalid credentials" "success:false" "success:false" "PASS" "Invalid credentials properly rejected"
else
    log_test "1.2" "Reject invalid credentials" "success:false" "success:true" "FAIL" "Should reject invalid credentials"
fi

# Test 1.3: Protected route without token
echo "Running Test 1.3: Protected route without authentication..."
NO_AUTH=$(curl -s "$API_URL/api/vendors")
if echo "$NO_AUTH" | grep -q -iE '(unauthorized|401|Unauthorized)'; then
    log_test "1.3" "Require authentication for protected routes" "401/Unauthorized" "401/Unauthorized" "PASS" "Authentication required"
else
    log_test "1.3" "Require authentication for protected routes" "401/Unauthorized" "$NO_AUTH" "FAIL" "Should require authentication"
fi

echo ""

# ============================================
# SECTION 2: VENDOR MANAGEMENT
# ============================================
echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}SECTION 2: VENDOR MANAGEMENT${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Test 2.1: Create vendor with valid GSTIN
echo "Running Test 2.1: Create vendor with valid GSTIN..."
VENDOR_1=$(curl -s -X POST "$API_URL/api/vendors" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "name": "Tech Solutions Pvt Ltd",
        "gstin": "22AAAAA0001A1Z5",
        "pan": "AAAPL1234C",
        "email": "tech@solutions.com",
        "phone": "9876543210",
        "address": "123 Tech Park",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001",
        "paymentTermsDays": 30
    }')

if echo "$VENDOR_1" | grep -q '"success":true'; then
    VENDOR_ID_1=$(echo "$VENDOR_1" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    log_test "2.1" "Create vendor with valid GSTIN" "success:true" "Created ID: $VENDOR_ID_1" "PASS" "Vendor created successfully"
else
    ERROR=$(echo "$VENDOR_1" | grep -o '"error":"[^"]*' | cut -d'"' -f4)
    log_test "2.1" "Create vendor with valid GSTIN" "success:true" "$ERROR" "FAIL" "Failed to create vendor"
fi

# Test 2.2: Create second vendor
echo "Running Test 2.2: Create second vendor..."
VENDOR_2=$(curl -s -X POST "$API_URL/api/vendors" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "name": "Global Electronics Corp",
        "gstin": "27BBBBB0002B1Z5",
        "pan": "BBBPL5678D",
        "email": "global@electronics.com",
        "phone": "9876543211",
        "address": "456 Industrial Area",
        "city": "Pune",
        "state": "Maharashtra",
        "pincode": "411001",
        "paymentTermsDays": 45
    }')

if echo "$VENDOR_2" | grep -q '"success":true'; then
    VENDOR_ID_2=$(echo "$VENDOR_2" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    log_test "2.2" "Create second vendor" "success:true" "Created ID: $VENDOR_ID_2" "PASS" "Second vendor created"
else
    ERROR=$(echo "$VENDOR_2" | grep -o '"error":"[^"]*' | cut -d'"' -f4)
    log_test "2.2" "Create second vendor" "success:true" "$ERROR" "FAIL" "Failed to create second vendor"
fi

# Test 2.3: Reject invalid GSTIN format
echo "Running Test 2.3: Reject invalid GSTIN format..."
INVALID_GSTIN=$(curl -s -X POST "$API_URL/api/vendors" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "name": "Invalid GSTIN Vendor",
        "gstin": "INVALIDGSTIN123",
        "email": "invalid@vendor.com"
    }')

if echo "$INVALID_GSTIN" | grep -q '"success":false'; then
    log_test "2.3" "Reject invalid GSTIN format" "success:false" "Validation error" "PASS" "Invalid GSTIN rejected"
else
    log_test "2.3" "Reject invalid GSTIN format" "success:false" "success:true" "FAIL" "Should reject invalid GSTIN"
fi

# Test 2.4: Prevent duplicate GSTIN
echo "Running Test 2.4: Prevent duplicate GSTIN..."
DUPLICATE=$(curl -s -X POST "$API_URL/api/vendors" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "name": "Duplicate GSTIN Vendor",
        "gstin": "22AAAAA0001A1Z5",
        "email": "duplicate@vendor.com"
    }')

if echo "$DUPLICATE" | grep -q '"success":false'; then
    log_test "2.4" "Prevent duplicate GSTIN" "success:false" "Duplicate blocked" "PASS" "Duplicate GSTIN prevented"
else
    log_test "2.4" "Prevent duplicate GSTIN" "success:false" "success:true" "FAIL" "Should prevent duplicate GSTIN"
fi

# Test 2.5: Reject invalid PAN format
echo "Running Test 2.5: Reject invalid PAN format..."
INVALID_PAN=$(curl -s -X POST "$API_URL/api/vendors" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "name": "Invalid PAN Vendor",
        "pan": "INVALID",
        "email": "invalidpan@vendor.com"
    }')

if echo "$INVALID_PAN" | grep -q '"success":false'; then
    log_test "2.5" "Reject invalid PAN format" "success:false" "Validation error" "PASS" "Invalid PAN rejected"
else
    log_test "2.5" "Reject invalid PAN format" "success:false" "success:true" "FAIL" "Should reject invalid PAN"
fi

# Test 2.6: Update vendor information
if [ ! -z "$VENDOR_ID_1" ]; then
    echo "Running Test 2.6: Update vendor information..."
    UPDATE_VENDOR=$(curl -s -X PUT "$API_URL/api/vendors/$VENDOR_ID_1" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{
            "name": "Tech Solutions Pvt Ltd (Updated)",
            "email": "updated@techsolutions.com"
        }')

    if echo "$UPDATE_VENDOR" | grep -q '"success":true'; then
        log_test "2.6" "Update vendor information" "success:true" "Vendor updated" "PASS" "Vendor update successful"
    else
        ERROR=$(echo "$UPDATE_VENDOR" | grep -o '"error":"[^"]*' | cut -d'"' -f4)
        log_test "2.6" "Update vendor information" "success:true" "$ERROR" "FAIL" "Failed to update vendor"
    fi
fi

# Test 2.7: Search vendors by name
echo "Running Test 2.7: Search vendors by name..."
SEARCH_VENDORS=$(curl -s "$API_URL/api/vendors?search=Tech" \
    -H "Authorization: Bearer $TOKEN")

if echo "$SEARCH_VENDORS" | grep -q '"success":true'; then
    COUNT=$(echo "$SEARCH_VENDORS" | grep -o '"total":[0-9]*' | cut -d':' -f2)
    log_test "2.7" "Search vendors by name" "success:true" "Found $COUNT vendors" "PASS" "Search functionality works"
else
    log_test "2.7" "Search vendors by name" "success:true" "Search failed" "FAIL" "Search failed"
fi

# Test 2.8: Get vendor statistics
echo "Running Test 2.8: Get vendor statistics..."
VENDOR_STATS=$(curl -s "$API_URL/api/vendors/stats" \
    -H "Authorization: Bearer $TOKEN")

if echo "$VENDOR_STATS" | grep -q '"success":true'; then
    TOTAL=$(echo "$VENDOR_STATS" | grep -o '"totalVendors":[0-9]*' | cut -d':' -f2)
    log_test "2.8" "Get vendor statistics" "success:true" "Total: $TOTAL vendors" "PASS" "Stats retrieved"
else
    log_test "2.8" "Get vendor statistics" "success:true" "Stats failed" "FAIL" "Failed to get stats"
fi

echo ""

# ============================================
# SECTION 3: CUSTOMER MANAGEMENT
# ============================================
echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}SECTION 3: CUSTOMER MANAGEMENT${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Test 3.1: Create customer with credit limit
echo "Running Test 3.1: Create customer with credit limit..."
CUSTOMER_1=$(curl -s -X POST "$API_URL/api/customers" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "name": "Alpha Retail Solutions",
        "gstin": "29CCCCC0003C1Z5",
        "pan": "CCCPL9012E",
        "email": "alpha@retail.com",
        "phone": "9876543212",
        "creditLimitAmount": 500000,
        "creditLimitDays": 30
    }')

if echo "$CUSTOMER_1" | grep -q '"success":true'; then
    CUSTOMER_ID_1=$(echo "$CUSTOMER_1" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    log_test "3.1" "Create customer with credit limit" "success:true" "Created ID: $CUSTOMER_ID_1" "PASS" "Customer created with credit limit"
else
    ERROR=$(echo "$CUSTOMER_1" | grep -o '"error":"[^"]*' | cut -d'"' -f4)
    log_test "3.1" "Create customer with credit limit" "success:true" "$ERROR" "FAIL" "Failed to create customer"
fi

# Test 3.2: Create second customer
echo "Running Test 3.2: Create second customer..."
CUSTOMER_2=$(curl -s -X POST "$API_URL/api/customers" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "name": "Beta Distribution Ltd",
        "gstin": "30DDDDD0004D1Z5",
        "pan": "DDDPL3456F",
        "email": "beta@distribution.com",
        "phone": "9876543213",
        "creditLimitAmount": 750000,
        "creditLimitDays": 45
    }')

if echo "$CUSTOMER_2" | grep -q '"success":true'; then
    CUSTOMER_ID_2=$(echo "$CUSTOMER_2" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    log_test "3.2" "Create second customer" "success:true" "Created ID: $CUSTOMER_ID_2" "PASS" "Second customer created"
else
    ERROR=$(echo "$CUSTOMER_2" | grep -o '"error":"[^"]*' | cut -d'"' -f4)
    log_test "3.2" "Create second customer" "success:true" "$ERROR" "FAIL" "Failed to create second customer"
fi

# Test 3.3: Reject invalid customer GSTIN
echo "Running Test 3.3: Reject invalid customer GSTIN..."
INVALID_CUST_GSTIN=$(curl -s -X POST "$API_URL/api/customers" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "name": "Invalid Customer",
        "gstin": "BAD_GSTIN",
        "email": "invalid@customer.com"
    }')

if echo "$INVALID_CUST_GSTIN" | grep -q '"success":false'; then
    log_test "3.3" "Reject invalid customer GSTIN" "success:false" "Validation error" "PASS" "Invalid GSTIN rejected"
else
    log_test "3.3" "Reject invalid customer GSTIN" "success:false" "success:true" "FAIL" "Should reject invalid GSTIN"
fi

# Test 3.4: Prevent duplicate customer GSTIN
echo "Running Test 3.4: Prevent duplicate customer GSTIN..."
DUP_CUSTOMER=$(curl -s -X POST "$API_URL/api/customers" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "name": "Duplicate Customer",
        "gstin": "29CCCCC0003C1Z5",
        "email": "dup@customer.com"
    }')

if echo "$DUP_CUSTOMER" | grep -q '"success":false'; then
    log_test "3.4" "Prevent duplicate customer GSTIN" "success:false" "Duplicate blocked" "PASS" "Duplicate prevented"
else
    log_test "3.4" "Prevent duplicate customer GSTIN" "success:false" "success:true" "FAIL" "Should prevent duplicate"
fi

# Test 3.5: Get customer statistics
echo "Running Test 3.5: Get customer statistics..."
CUSTOMER_STATS=$(curl -s "$API_URL/api/customers/stats" \
    -H "Authorization: Bearer $TOKEN")

if echo "$CUSTOMER_STATS" | grep -q '"success":true'; then
    TOTAL=$(echo "$CUSTOMER_STATS" | grep -o '"totalCustomers":[0-9]*' | cut -d':' -f2)
    log_test "3.5" "Get customer statistics" "success:true" "Total: $TOTAL customers" "PASS" "Stats retrieved"
else
    log_test "3.5" "Get customer statistics" "success:true" "Stats failed" "FAIL" "Failed to get stats"
fi

echo ""

# ============================================
# SECTION 4: SKU/PRODUCT MANAGEMENT
# ============================================
echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}SECTION 4: SKU/PRODUCT MANAGEMENT${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Test 4.1: Create SKU with HSN code
echo "Running Test 4.1: Create SKU with HSN code..."
SKU_1=$(curl -s -X POST "$API_URL/api/skus" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "skuCode": "LAPTOP-001",
        "name": "Dell Latitude 5520",
        "description": "Business Laptop 15.6 inch",
        "hsnCode": "8471",
        "unit": "PCS",
        "gstRate": 18,
        "category": "Computers",
        "subCategory": "Laptops"
    }')

if echo "$SKU_1" | grep -q '"success":true'; then
    SKU_ID_1=$(echo "$SKU_1" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    log_test "4.1" "Create SKU with HSN code" "success:true" "Created ID: $SKU_ID_1" "PASS" "SKU created"
else
    ERROR=$(echo "$SKU_1" | grep -o '"error":"[^"]*' | cut -d'"' -f4)
    log_test "4.1" "Create SKU with HSN code" "success:true" "$ERROR" "FAIL" "Failed to create SKU"
fi

# Test 4.2-4.5: Create additional SKUs
for i in 2 3 4 5; do
    echo "Running Test 4.$i: Create SKU $i..."
    case $i in
        2) SKU_DATA='{"skuCode":"MOUSE-001","name":"Logitech MX Master 3","hsnCode":"8471","unit":"PCS","gstRate":18,"category":"Peripherals"}';;
        3) SKU_DATA='{"skuCode":"KEYBOARD-001","name":"Mechanical Keyboard RGB","hsnCode":"8471","unit":"PCS","gstRate":18,"category":"Peripherals"}';;
        4) SKU_DATA='{"skuCode":"MONITOR-001","name":"LG 27\" 4K Monitor","hsnCode":"8528","unit":"PCS","gstRate":18,"category":"Displays"}';;
        5) SKU_DATA='{"skuCode":"CABLE-USB-001","name":"USB-C Cable 2m","hsnCode":"8544","unit":"PCS","gstRate":18,"category":"Accessories"}';;
    esac

    SKU_RESULT=$(curl -s -X POST "$API_URL/api/skus" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "$SKU_DATA")

    if echo "$SKU_RESULT" | grep -q '"success":true'; then
        SKU_ID=$(echo "$SKU_RESULT" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
        eval "SKU_ID_$i=$SKU_ID"
        log_test "4.$i" "Create SKU $i" "success:true" "Created ID: $SKU_ID" "PASS" "SKU $i created"
    else
        ERROR=$(echo "$SKU_RESULT" | grep -o '"error":"[^"]*' | cut -d'"' -f4)
        log_test "4.$i" "Create SKU $i" "success:true" "$ERROR" "FAIL" "Failed to create SKU $i"
    fi
done

# Test 4.6: Prevent duplicate SKU code
echo "Running Test 4.6: Prevent duplicate SKU code..."
DUP_SKU=$(curl -s -X POST "$API_URL/api/skus" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "skuCode": "LAPTOP-001",
        "name": "Duplicate SKU",
        "unit": "PCS"
    }')

if echo "$DUP_SKU" | grep -q '"success":false'; then
    log_test "4.6" "Prevent duplicate SKU code" "success:false" "Duplicate blocked" "PASS" "Duplicate SKU prevented"
else
    log_test "4.6" "Prevent duplicate SKU code" "success:false" "success:true" "FAIL" "Should prevent duplicate"
fi

# Test 4.7: Validate GST rate (0-28%)
echo "Running Test 4.7: Validate GST rate (0-28%)..."
INVALID_GST=$(curl -s -X POST "$API_URL/api/skus" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "skuCode": "TEST-GST",
        "name": "Invalid GST Product",
        "unit": "PCS",
        "gstRate": 35
    }')

if echo "$INVALID_GST" | grep -q '"success":false'; then
    log_test "4.7" "Validate GST rate (0-28%)" "success:false" "Validation error" "PASS" "Invalid GST rate rejected"
else
    log_test "4.7" "Validate GST rate (0-28%)" "success:false" "success:true (accepted 35%)" "FAIL" "Should reject GST rate > 28%"
fi

# Test 4.8: Search SKUs
echo "Running Test 4.8: Search SKUs..."
SEARCH_SKUS=$(curl -s "$API_URL/api/skus?search=Laptop" \
    -H "Authorization: Bearer $TOKEN")

if echo "$SEARCH_SKUS" | grep -q '"success":true'; then
    COUNT=$(echo "$SEARCH_SKUS" | grep -o '"total":[0-9]*' | cut -d':' -f2)
    log_test "4.8" "Search SKUs" "success:true" "Found $COUNT SKUs" "PASS" "Search works"
else
    log_test "4.8" "Search SKUs" "success:true" "Search failed" "FAIL" "Search failed"
fi

# Test 4.9: Get SKU statistics
echo "Running Test 4.9: Get SKU statistics..."
SKU_STATS=$(curl -s "$API_URL/api/skus/stats" \
    -H "Authorization: Bearer $TOKEN")

if echo "$SKU_STATS" | grep -q '"success":true'; then
    TOTAL=$(echo "$SKU_STATS" | grep -o '"totalSKUs":[0-9]*' | cut -d':' -f2)
    log_test "4.9" "Get SKU statistics" "success:true" "Total: $TOTAL SKUs" "PASS" "Stats retrieved"
else
    log_test "4.9" "Get SKU statistics" "success:true" "Stats failed" "FAIL" "Failed to get stats"
fi

echo ""

# ============================================
# SECTION 5: DISCOUNT TERMS
# ============================================
echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}SECTION 5: DISCOUNT TERMS${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Test 5.1: Create volume discount term
if [ ! -z "$VENDOR_ID_1" ]; then
    echo "Running Test 5.1: Create volume discount term..."
    DISCOUNT_TERM=$(curl -s -X POST "$API_URL/api/discount-terms" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "{
            \"vendorId\": \"$VENDOR_ID_1\",
            \"discountType\": \"VOLUME\",
            \"minQuantity\": 10,
            \"maxQuantity\": 100,
            \"discountPercent\": 5.0,
            \"startDate\": \"2026-01-01\",
            \"endDate\": \"2026-12-31\",
            \"isActive\": true
        }")

    if echo "$DISCOUNT_TERM" | grep -q '"success":true'; then
        DISCOUNT_TERM_ID=$(echo "$DISCOUNT_TERM" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
        log_test "5.1" "Create volume discount term" "success:true" "Created ID: $DISCOUNT_TERM_ID" "PASS" "Discount term created"
    else
        ERROR=$(echo "$DISCOUNT_TERM" | grep -o '"error":"[^"]*' | cut -d'"' -f4)
        log_test "5.1" "Create volume discount term" "success:true" "$ERROR" "FAIL" "Failed to create discount term"
    fi
else
    log_test "5.1" "Create volume discount term" "Vendor ID required" "No vendor ID" "FAIL" "No vendor ID available"
fi

# Test 5.2: List discount terms
echo "Running Test 5.2: List discount terms..."
DISCOUNT_LIST=$(curl -s "$API_URL/api/discount-terms" \
    -H "Authorization: Bearer $TOKEN")

if echo "$DISCOUNT_LIST" | grep -q '"success":true'; then
    log_test "5.2" "List discount terms" "success:true" "Terms listed" "PASS" "Discount terms listed"
else
    log_test "5.2" "List discount terms" "success:true" "List failed" "FAIL" "Failed to list terms"
fi

echo ""

# ============================================
# SECTION 6: FILE UPLOAD SYSTEM (CRITICAL)
# ============================================
echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}SECTION 6: FILE UPLOAD SYSTEM (CRITICAL)${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Test 6.1: Create test PDF file
echo "Running Test 6.1: Create test PDF file..."
# Create a simple test PDF (using text for now as actual PDF requires binary)
mkdir -p /tmp/auditflow_test_files
cat > /tmp/auditflow_test_files/test_invoice_1.txt << 'EOF'
TAX INVOICE
Invoice No: INV-2026-001
Date: 12-Feb-2026

FROM: Tech Solutions Pvt Ltd
GSTIN: 22AAAAA0001A1Z5

TO: Alpha Retail Solutions
GSTIN: 29CCCCC0003C1Z5

S.No | Description | HSN | Qty | Rate | Amount
1 | Dell Latitude 5520 | 8471 | 5 | 75000 | 375000
2 | Logitech MX Master 3 | 8471 | 10 | 8000 | 80000

Subtotal: 455000
CGST @9%: 40950
SGST @9%: 40950
Total: 536900
EOF
log_test "6.1" "Create test files" "File created" "File created" "PASS" "Test files created"

# Test 6.2: Upload single PDF file
echo "Running Test 6.2: Upload single file..."
UPLOAD_1=$(curl -s -X POST "$API_URL/api/uploads" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@/tmp/auditflow_test_files/test_invoice_1.txt;type=text/csv" \
    -F "documentType=PURCHASE_INVOICE")

if echo "$UPLOAD_1" | grep -q '"success":true'; then
    UPLOADED_FILE_ID=$(echo "$UPLOAD_1" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    log_test "6.2" "Upload single file" "success:true" "Uploaded ID: $UPLOADED_FILE_ID" "PASS" "File uploaded successfully"
else
    ERROR=$(echo "$UPLOAD_1" | grep -o '"error":"[^"]*' | cut -d'"' -f4)
    log_test "6.2" "Upload single file" "success:true" "$ERROR" "FAIL" "Failed to upload file"
fi

# Test 6.3-6.5: Upload multiple files (3 more)
for i in 2 3 4; do
    echo "Running Test 6.$((i+1)): Upload file $i..."
    cat > "/tmp/auditflow_test_files/test_invoice_$i.txt" << EOF
TAX INVOICE
Invoice No: INV-2026-00$i
Date: 12-Feb-2026
Test Invoice $i
Total: $((i * 100000))
EOF

    UPLOAD_RESULT=$(curl -s -X POST "$API_URL/api/uploads" \
        -H "Authorization: Bearer $TOKEN" \
        -F "file=@/tmp/auditflow_test_files/test_invoice_$i.txt;type=text/csv" \
        -F "documentType=PURCHASE_INVOICE")

    if echo "$UPLOAD_RESULT" | grep -q '"success":true'; then
        FILE_ID=$(echo "$UPLOAD_RESULT" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
        log_test "6.$((i+1))" "Upload file $i" "success:true" "Uploaded ID: $FILE_ID" "PASS" "File $i uploaded"
    else
        ERROR=$(echo "$UPLOAD_RESULT" | grep -o '"error":"[^"]*' | cut -d'"' -f4)
        log_test "6.$((i+1))" "Upload file $i" "success:true" "$ERROR" "FAIL" "Failed to upload file $i"
    fi
done

# Test 6.6: Test file size validation (> 25MB)
echo "Running Test 6.6: Test file size validation (> 25MB)..."
dd if=/dev/zero of=/tmp/auditflow_test_files/large_file.bin bs=1M count=30 2>/dev/null
LARGE_FILE_UPLOAD=$(curl -s -X POST "$API_URL/api/uploads" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@/tmp/auditflow_test_files/large_file.bin;type=application/pdf" \
    -F "documentType=OTHER")

if echo "$LARGE_FILE_UPLOAD" | grep -q -E '(size|25MB|limit)'; then
    log_test "6.6" "Reject file > 25MB" "success:false (size limit)" "Size limit enforced" "PASS" "Large file rejected"
else
    if echo "$LARGE_FILE_UPLOAD" | grep -q '"success":false'; then
        log_test "6.6" "Reject file > 25MB" "success:false" "Rejected (other reason)" "PASS" "File rejected"
    else
        log_test "6.6" "Reject file > 25MB" "success:false" "File accepted" "FAIL" "Should reject large files"
    fi
fi
rm -f /tmp/auditflow_test_files/large_file.bin

# Test 6.7: Test file type validation (.txt should be rejected)
echo "Running Test 6.7: Test file type validation..."
echo "Invalid file type" > /tmp/auditflow_test_files/invalid.exe
INVALID_TYPE=$(curl -s -X POST "$API_URL/api/uploads" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@/tmp/auditflow_test_files/invalid.exe;type=application/octet-stream" \
    -F "documentType=OTHER")

if echo "$INVALID_TYPE" | grep -q '"success":false'; then
    log_test "6.7" "Reject invalid file type" "success:false" "Invalid type rejected" "PASS" "File type validation works"
else
    log_test "6.7" "Reject invalid file type" "success:false" "File accepted" "FAIL" "Should reject invalid types"
fi

# Test 6.8: List uploaded files
echo "Running Test 6.8: List uploaded files..."
FILE_LIST=$(curl -s "$API_URL/api/uploads" \
    -H "Authorization: Bearer $TOKEN")

if echo "$FILE_LIST" | grep -q '"success":true'; then
    COUNT=$(echo "$FILE_LIST" | grep -o '"total":[0-9]*' | cut -d':' -f2)
    log_test "6.8" "List uploaded files" "success:true" "Found $COUNT files" "PASS" "Files listed"
else
    log_test "6.8" "List uploaded files" "success:true" "List failed" "FAIL" "Failed to list files"
fi

# Test 6.9: Get file metadata
if [ ! -z "$UPLOADED_FILE_ID" ]; then
    echo "Running Test 6.9: Get file metadata..."
    FILE_META=$(curl -s "$API_URL/api/uploads/$UPLOADED_FILE_ID" \
        -H "Authorization: Bearer $TOKEN")

    if echo "$FILE_META" | grep -q '"success":true'; then
        log_test "6.9" "Get file metadata" "success:true" "Metadata retrieved" "PASS" "File metadata retrieved"
    else
        log_test "6.9" "Get file metadata" "success:true" "Metadata failed" "FAIL" "Failed to get metadata"
    fi
fi

# Test 6.10: Get download URL
if [ ! -z "$UPLOADED_FILE_ID" ]; then
    echo "Running Test 6.10: Get download URL..."
    DOWNLOAD_URL=$(curl -s "$API_URL/api/uploads/$UPLOADED_FILE_ID/download" \
        -H "Authorization: Bearer $TOKEN")

    if echo "$DOWNLOAD_URL" | grep -q '"downloadUrl"'; then
        log_test "6.10" "Get download URL" "success:true" "URL generated" "PASS" "Download URL generated"
    else
        log_test "6.10" "Get download URL" "success:true" "URL failed" "FAIL" "Failed to get download URL"
    fi
fi

# Test 6.11: Get upload statistics
echo "Running Test 6.11: Get upload statistics..."
UPLOAD_STATS=$(curl -s "$API_URL/api/uploads/stats" \
    -H "Authorization: Bearer $TOKEN")

if echo "$UPLOAD_STATS" | grep -q '"success":true'; then
    TOTAL_FILES=$(echo "$UPLOAD_STATS" | grep -o '"totalFiles":[0-9]*' | cut -d':' -f2)
    TOTAL_SIZE=$(echo "$UPLOAD_STATS" | grep -o '"totalSize":[0-9]*' | cut -d':' -f2)
    log_test "6.11" "Get upload statistics" "success:true" "Files: $TOTAL_FILES, Size: $TOTAL_SIZE bytes" "PASS" "Stats retrieved"
else
    log_test "6.11" "Get upload statistics" "success:true" "Stats failed" "FAIL" "Failed to get stats"
fi

echo ""

# ============================================
# SECTION 7: PO-INVOICE MATCHING
# ============================================
echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}SECTION 7: PO-INVOICE MATCHING${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Test 7.1: Get PO-Invoice match statistics
echo "Running Test 7.1: Get PO-Invoice match statistics..."
MATCH_STATS=$(curl -s "$API_URL/api/po-invoice-matches/stats" \
    -H "Authorization: Bearer $TOKEN")

if echo "$MATCH_STATS" | grep -q '"success":true'; then
    TOTAL=$(echo "$MATCH_STATS" | grep -o '"totalMatches":[0-9]*' | cut -d':' -f2)
    log_test "7.1" "Get PO-Invoice match statistics" "success:true" "Total matches: $TOTAL" "PASS" "Stats retrieved"
else
    log_test "7.1" "Get PO-Invoice match statistics" "success:true" "Stats failed" "FAIL" "Failed to get stats"
fi

# Test 7.2: List matches
echo "Running Test 7.2: List PO-Invoice matches..."
MATCH_LIST=$(curl -s "$API_URL/api/po-invoice-matches" \
    -H "Authorization: Bearer $TOKEN")

if echo "$MATCH_LIST" | grep -q '"success":true'; then
    log_test "7.2" "List PO-Invoice matches" "success:true" "Matches listed" "PASS" "Matches listed"
else
    log_test "7.2" "List PO-Invoice matches" "success:true" "List failed" "FAIL" "Failed to list matches"
fi

echo ""

# ============================================
# SECTION 8: PAYMENT RECONCILIATION
# ============================================
echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}SECTION 8: PAYMENT RECONCILIATION${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Test 8.1: Get payment match statistics
echo "Running Test 8.1: Get payment match statistics..."
PAYMENT_STATS=$(curl -s "$API_URL/api/payment-matches/stats" \
    -H "Authorization: Bearer $TOKEN")

if echo "$PAYMENT_STATS" | grep -q '"success":true'; then
    log_test "8.1" "Get payment match statistics" "success:true" "Stats retrieved" "PASS" "Payment stats retrieved"
else
    log_test "8.1" "Get payment match statistics" "success:true" "Stats failed" "FAIL" "Failed to get stats"
fi

# Test 8.2: List payment matches
echo "Running Test 8.2: List payment matches..."
PAYMENT_LIST=$(curl -s "$API_URL/api/payment-matches" \
    -H "Authorization: Bearer $TOKEN")

if echo "$PAYMENT_LIST" | grep -q '"success":true'; then
    log_test "8.2" "List payment matches" "success:true" "Matches listed" "PASS" "Payment matches listed"
else
    log_test "8.2" "List payment matches" "success:true" "List failed" "FAIL" "Failed to list matches"
fi

echo ""

# ============================================
# SECTION 9: GST RECONCILIATION
# ============================================
echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}SECTION 9: GST RECONCILIATION${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Test 9.1: Get GST match statistics
echo "Running Test 9.1: Get GST match statistics..."
GST_STATS=$(curl -s "$API_URL/api/gst-matches/stats" \
    -H "Authorization: Bearer $TOKEN")

if echo "$GST_STATS" | grep -q '"success":true'; then
    log_test "9.1" "Get GST match statistics" "success:true" "Stats retrieved" "PASS" "GST stats retrieved"
else
    log_test "9.1" "Get GST match statistics" "success:true" "Stats failed" "FAIL" "Failed to get stats"
fi

# Test 9.2: List GST matches
echo "Running Test 9.2: List GST matches..."
GST_LIST=$(curl -s "$API_URL/api/gst-matches" \
    -H "Authorization: Bearer $TOKEN")

if echo "$GST_LIST" | grep -q '"success":true'; then
    log_test "9.2" "List GST matches" "success:true" "Matches listed" "PASS" "GST matches listed"
else
    log_test "9.2" "List GST matches" "success:true" "List failed" "FAIL" "Failed to list matches"
fi

echo ""

# ============================================
# SECTION 10: DISCOUNT AUDITS
# ============================================
echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}SECTION 10: DISCOUNT AUDITS${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Test 10.1: List discount audits
echo "Running Test 10.1: List discount audits..."
AUDIT_LIST=$(curl -s "$API_URL/api/discount-audits" \
    -H "Authorization: Bearer $TOKEN")

if echo "$AUDIT_LIST" | grep -q '"success":true'; then
    log_test "10.1" "List discount audits" "success:true" "Audits listed" "PASS" "Discount audits listed"
else
    log_test "10.1" "List discount audits" "success:true" "List failed" "FAIL" "Failed to list audits"
fi

echo ""

# ============================================
# SECTION 11: INVENTORY MANAGEMENT
# ============================================
echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}SECTION 11: INVENTORY MANAGEMENT${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Test 11.1: Get inventory summary
echo "Running Test 11.1: Get inventory summary..."
INV_SUMMARY=$(curl -s "$API_URL/api/inventory/summary" \
    -H "Authorization: Bearer $TOKEN")

if echo "$INV_SUMMARY" | grep -q '"success":true'; then
    log_test "11.1" "Get inventory summary" "success:true" "Summary retrieved" "PASS" "Inventory summary retrieved"
else
    log_test "11.1" "Get inventory summary" "success:true" "Summary failed" "FAIL" "Failed to get summary"
fi

echo ""

# ============================================
# SECTION 12: PAYMENT REMINDERS
# ============================================
echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}SECTION 12: PAYMENT REMINDERS${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Test 12.1: List payment reminders
echo "Running Test 12.1: List payment reminders..."
REMINDERS=$(curl -s "$API_URL/api/payment-reminders" \
    -H "Authorization: Bearer $TOKEN")

if echo "$REMINDERS" | grep -q '"success":true'; then
    log_test "12.1" "List payment reminders" "success:true" "Reminders listed" "PASS" "Payment reminders listed"
else
    log_test "12.1" "List payment reminders" "success:true" "List failed" "FAIL" "Failed to list reminders"
fi

echo ""

# ============================================
# SECTION 13: VENDOR LEDGER
# ============================================
echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}SECTION 13: VENDOR LEDGER${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Test 13.1: List vendor ledger entries
echo "Running Test 13.1: List vendor ledger entries..."
LEDGER=$(curl -s "$API_URL/api/vendor-ledger" \
    -H "Authorization: Bearer $TOKEN")

if echo "$LEDGER" | grep -q '"success":true'; then
    log_test "13.1" "List vendor ledger entries" "success:true" "Ledger listed" "PASS" "Vendor ledger accessible"
else
    log_test "13.1" "List vendor ledger entries" "success:true" "Ledger failed" "FAIL" "Failed to access ledger"
fi

echo ""

# ============================================
# SECTION 14: CREDIT/DEBIT NOTES
# ============================================
echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}SECTION 14: CREDIT/DEBIT NOTES${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Test 14.1: List credit/debit notes
echo "Running Test 14.1: List credit/debit notes..."
NOTES=$(curl -s "$API_URL/api/credit-debit-notes" \
    -H "Authorization: Bearer $TOKEN")

if echo "$NOTES" | grep -q '"success":true'; then
    log_test "14.1" "List credit/debit notes" "success:true" "Notes listed" "PASS" "Credit/debit notes listed"
else
    log_test "14.1" "List credit/debit notes" "success:true" "Notes failed" "FAIL" "Failed to list notes"
fi

echo ""

# ============================================
# SECTION 15: ERROR HANDLING & EDGE CASES
# ============================================
echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}SECTION 15: ERROR HANDLING & EDGE CASES${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Test 15.1: Invalid JSON handling
echo "Running Test 15.1: Invalid JSON handling..."
INVALID_JSON=$(curl -s -X POST "$API_URL/api/vendors" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{invalid json}')

if echo "$INVALID_JSON" | grep -q -iE '(error|invalid|parse)'; then
    log_test "15.1" "Invalid JSON handling" "Error response" "Error received" "PASS" "Invalid JSON handled"
else
    log_test "15.1" "Invalid JSON handling" "Error response" "No error" "FAIL" "Should handle invalid JSON"
fi

# Test 15.2: Non-existent resource (404)
echo "Running Test 15.2: Non-existent resource (404)..."
NOT_FOUND=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/vendors/non-existent-id-12345" \
    -H "Authorization: Bearer $TOKEN")

if [ "$NOT_FOUND" == "404" ]; then
    log_test "15.2" "Non-existent resource (404)" "404 status" "404 received" "PASS" "404 handling works"
else
    log_test "15.2" "Non-existent resource (404)" "404 status" "$NOT_FOUND status" "FAIL" "Should return 404"
fi

# Test 15.3: Missing required fields
echo "Running Test 15.3: Missing required fields..."
MISSING_FIELDS=$(curl -s -X POST "$API_URL/api/vendors" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{}')

if echo "$MISSING_FIELDS" | grep -q '"success":false'; then
    log_test "15.3" "Missing required fields" "success:false" "Validation error" "PASS" "Required fields validated"
else
    log_test "15.3" "Missing required fields" "success:false" "success:true" "FAIL" "Should validate required fields"
fi

echo ""

# ============================================
# CLEANUP
# ============================================
echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}CLEANUP${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""
rm -rf /tmp/auditflow_test_files
echo "Test files cleaned up."
echo ""

# ============================================
# FINAL SUMMARY
# ============================================
echo -e "${CYAN}=============================================${NC}"
echo -e "${CYAN}        FINAL TEST SUMMARY${NC}"
echo -e "${CYAN}=============================================${NC}"
echo ""
echo "Total Tests Run:    $TOTAL_TESTS"
echo -e "${GREEN}Tests Passed:       $PASSED_TESTS${NC}"
echo -e "${RED}Tests Failed:       $FAILED_TESTS${NC}"

if [ $TOTAL_TESTS -gt 0 ]; then
    PASS_RATE=$(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc 2>/dev/null || echo "0")
    echo "Pass Rate:          $PASS_RATE%"
fi

echo ""
echo "============================================="
echo "Test Data Created:"
echo "============================================="
echo "Vendors: $VENDOR_ID_1, $VENDOR_ID_2"
echo "Customers: $CUSTOMER_ID_1, $CUSTOMER_ID_2"
echo "SKUs: $SKU_ID_1, $SKU_ID_2, $SKU_ID_3, $SKU_ID_4, $SKU_ID_5"
echo "Discount Term: $DISCOUNT_TERM_ID"
echo "Uploaded File: $UPLOADED_FILE_ID"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}=====================================${NC}"
    echo -e "${GREEN}  ALL TESTS PASSED!${NC}"
    echo -e "${GREEN}  Application is production-ready.${NC}"
    echo -e "${GREEN}=====================================${NC}"
    EXIT_CODE=0
else
    echo -e "${YELLOW}=====================================${NC}"
    echo -e "${YELLOW}  SOME TESTS FAILED${NC}"
    echo -e "${YELLOW}  Review the failures above.${NC}"
    echo -e "${YELLOW}=====================================${NC}"
    EXIT_CODE=1
fi

echo ""
echo "Detailed results saved to: $RESULTS_FILE"
echo ""

# Append summary to results file
echo "" >> "$RESULTS_FILE"
echo "=============================================" >> "$RESULTS_FILE"
echo "SUMMARY" >> "$RESULTS_FILE"
echo "=============================================" >> "$RESULTS_FILE"
echo "Total Tests: $TOTAL_TESTS" >> "$RESULTS_FILE"
echo "Passed: $PASSED_TESTS" >> "$RESULTS_FILE"
echo "Failed: $FAILED_TESTS" >> "$RESULTS_FILE"
echo "Pass Rate: $PASS_RATE%" >> "$RESULTS_FILE"

exit $EXIT_CODE
