#!/bin/bash

# AuditFlow - API Endpoint Testing
# Tests all REST API endpoints for correct responses

set -e

API_URL="http://localhost:4000/api"
TOKEN=""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0

echo "=========================================="
echo "API Endpoint Testing Suite"
echo "=========================================="
echo ""

# Login first
echo -e "${BLUE}Getting authentication token...${NC}"
LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@auditflow.com","password":"Password123"}')

TOKEN=$(echo $LOGIN | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ Failed to get auth token${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Authentication successful${NC}"
echo ""

# Test each endpoint
test_endpoint() {
  local method="$1"
  local endpoint="$2"
  local description="$3"
  local expect_success="${4:-true}"

  echo -n "Testing $method $endpoint... "

  if [ "$method" = "GET" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL$endpoint" \
      -H "Authorization: Bearer $TOKEN")
  elif [ "$method" = "POST" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{}')
  fi

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | head -n-1)

  if [ "$expect_success" = "true" ]; then
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
      echo -e "${GREEN}✓${NC} (HTTP $HTTP_CODE)"
      PASSED=$((PASSED + 1))
    else
      echo -e "${RED}✗${NC} (HTTP $HTTP_CODE)"
      echo "  Response: $BODY"
      FAILED=$((FAILED + 1))
    fi
  else
    if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
      echo -e "${GREEN}✓${NC} (Expected error: HTTP $HTTP_CODE)"
      PASSED=$((PASSED + 1))
    else
      echo -e "${RED}✗${NC} (Should have failed)"
      FAILED=$((FAILED + 1))
    fi
  fi
}

# Health check
echo -e "${BLUE}[SYSTEM ENDPOINTS]${NC}"
test_endpoint "GET" "/health" "Health check"
echo ""

# Vendor endpoints
echo -e "${BLUE}[VENDOR ENDPOINTS]${NC}"
test_endpoint "GET" "/vendors" "List vendors"
test_endpoint "GET" "/vendors?limit=10&offset=0" "Paginated vendors"
test_endpoint "GET" "/vendors?search=Test" "Search vendors"
echo ""

# Customer endpoints
echo -e "${BLUE}[CUSTOMER ENDPOINTS]${NC}"
test_endpoint "GET" "/customers" "List customers"
test_endpoint "GET" "/customers?limit=10" "Paginated customers"
echo ""

# SKU endpoints
echo -e "${BLUE}[SKU ENDPOINTS]${NC}"
test_endpoint "GET" "/skus" "List SKUs"
test_endpoint "GET" "/skus?search=Laptop" "Search SKUs"
echo ""

# Upload endpoints
echo -e "${BLUE}[UPLOAD ENDPOINTS]${NC}"
test_endpoint "GET" "/uploads" "List uploads"
test_endpoint "GET" "/uploads/stats" "Upload statistics"
echo ""

# PO-Invoice matching
echo -e "${BLUE}[PO-INVOICE MATCHING ENDPOINTS]${NC}"
test_endpoint "GET" "/po-invoice-matches" "List matches"
test_endpoint "GET" "/po-invoice-matches/stats" "Match statistics"
echo ""

# Payment matching
echo -e "${BLUE}[PAYMENT MATCHING ENDPOINTS]${NC}"
test_endpoint "GET" "/payment-matches" "List payment matches"
test_endpoint "GET" "/payment-matches/stats" "Payment match stats"
echo ""

# GST matching
echo -e "${BLUE}[GST MATCHING ENDPOINTS]${NC}"
test_endpoint "GET" "/gst-matches" "List GST matches"
test_endpoint "GET" "/gst-matches/stats" "GST match statistics"
echo ""

# Vendor ledger
echo -e "${BLUE}[VENDOR LEDGER ENDPOINTS]${NC}"
test_endpoint "GET" "/vendor-ledger" "Vendor ledger list"
echo ""

# Payment reminders
echo -e "${BLUE}[PAYMENT REMINDER ENDPOINTS]${NC}"
test_endpoint "GET" "/payment-reminders" "Payment reminders"
echo ""

# Inventory
echo -e "${BLUE}[INVENTORY ENDPOINTS]${NC}"
test_endpoint "GET" "/inventory/summary" "Inventory summary"
test_endpoint "GET" "/inventory/movements" "Stock movements"
echo ""

# Credit/Debit notes
echo -e "${BLUE}[CREDIT/DEBIT NOTE ENDPOINTS]${NC}"
test_endpoint "GET" "/credit-debit-notes" "List notes"
echo ""

# Discount audits
echo -e "${BLUE}[DISCOUNT AUDIT ENDPOINTS]${NC}"
test_endpoint "GET" "/discount-audits" "List audits"
test_endpoint "GET" "/discount-terms" "List discount terms"
echo ""

# AI endpoints
echo -e "${BLUE}[AI ENDPOINTS]${NC}"
test_endpoint "GET" "/chat/conversations" "List conversations"
echo ""

# Summary
echo ""
echo "=========================================="
echo "API Endpoint Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}All API endpoints working! ✓${NC}"
  exit 0
else
  echo -e "${YELLOW}Some endpoints failed. Check details above.${NC}"
  exit 1
fi
