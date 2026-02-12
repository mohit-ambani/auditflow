#!/bin/bash

# AuditFlow - Complete Module Testing
# Simple and reliable tests for all modules

API_URL="http://localhost:4000/api"
TOKEN=""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0

echo "=========================================="
echo "  AuditFlow - All Modules Test"
echo "=========================================="
echo ""

# Login
echo -e "${BLUE}Step 1: Authentication${NC}"
LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@auditflow.com","password":"Password123"}')

TOKEN=$(echo $LOGIN | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$TOKEN" ]; then
  echo -e "${GREEN}✓ Login successful${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ Login failed${NC}"
  FAILED=$((FAILED + 1))
  exit 1
fi
echo ""

# Test function
test_module() {
  local name="$1"
  local url="$2"

  echo -n "$name... "

  RESPONSE=$(curl -s "$API_URL$url" -H "Authorization: Bearer $TOKEN")

  if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    PASSED=$((PASSED + 1))

    # Extract and show count if available
    COUNT=$(echo "$RESPONSE" | grep -o '"total":[0-9]*' | head -1 | cut -d':' -f2)
    if [ ! -z "$COUNT" ]; then
      echo "  → $COUNT items found"
    fi
  else
    echo -e "${RED}✗${NC}"
    FAILED=$((FAILED + 1))
  fi
}

# Test all modules
echo -e "${BLUE}Step 2: Testing All Modules${NC}"
echo ""

test_module "Health Check" "/health"
test_module "Vendors" "/vendors"
test_module "Customers" "/customers"
test_module "SKUs" "/skus"
test_module "Uploads" "/uploads"
test_module "Upload Stats" "/uploads/stats"
test_module "PO-Invoice Matches" "/po-invoice-matches"
test_module "PO-Invoice Stats" "/po-invoice-matches/stats"
test_module "Payment Matches" "/payment-matches"
test_module "Payment Stats" "/payment-matches/stats"
test_module "GST Matches" "/gst-matches"
test_module "GST Stats" "/gst-matches/stats"
test_module "Vendor Ledger" "/vendor-ledger"
test_module "Payment Reminders" "/payment-reminders"
test_module "Inventory Summary" "/inventory/summary"
test_module "Credit/Debit Notes" "/credit-debit-notes"
test_module "Discount Audits" "/discount-audits"
test_module "Discount Terms" "/discount-terms"
test_module "Chat Conversations" "/chat/conversations"

echo ""
echo "=========================================="
echo "  Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Total Tests: $((PASSED + FAILED))"

RATE=$(echo "scale=1; $PASSED * 100 / ($PASSED + $FAILED)" | bc 2>/dev/null || echo "N/A")
echo "Pass Rate: ${RATE}%"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All modules working!${NC}"
  exit 0
else
  echo -e "${RED}Some modules failed${NC}"
  exit 1
fi
