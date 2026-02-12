#!/bin/bash

API_URL="http://localhost:4000"

echo "=== Testing Existing API Endpoints ==="
echo ""

# Test 1: Health Check
echo "1. Testing Health Endpoint..."
curl -s "$API_URL/api/health" | jq '.'
echo ""

# Test 2: Login (to get token)
echo "2. Testing Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@auditflow.com","password":"admin123"}')
echo "$LOGIN_RESPONSE" | jq '.'
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token // empty')
echo "Token: ${TOKEN:0:50}..."
echo ""

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get auth token"
  exit 1
fi

# Test 3: Vendors List
echo "3. Testing Get Vendors..."
curl -s "$API_URL/api/vendors" \
  -H "Authorization: Bearer $TOKEN" | jq '.success, .data.vendors | length'
echo ""

# Test 4: Customers List
echo "4. Testing Get Customers..."
curl -s "$API_URL/api/customers" \
  -H "Authorization: Bearer $TOKEN" | jq '.success, .data.customers | length'
echo ""

# Test 5: SKUs List
echo "5. Testing Get SKUs..."
curl -s "$API_URL/api/skus" \
  -H "Authorization: Bearer $TOKEN" | jq '.success, .data.skus | length'
echo ""

# Test 6: PO-Invoice Matches
echo "6. Testing Get PO-Invoice Matches..."
curl -s "$API_URL/api/po-invoice-matches" \
  -H "Authorization: Bearer $TOKEN" | jq '.success, .data.matches | length'
echo ""

# Test 7: Payment Matches Stats
echo "7. Testing Payment Matches Stats..."
curl -s "$API_URL/api/payment-matches/stats" \
  -H "Authorization: Bearer $TOKEN" | jq '.success, .data'
echo ""

# Test 8: GST Matches Stats
echo "8. Testing GST Matches Stats..."
curl -s "$API_URL/api/gst-matches/stats" \
  -H "Authorization: Bearer $TOKEN" | jq '.success, .data'
echo ""

# Test 9: Discount Audits
echo "9. Testing Get Discount Audits..."
curl -s "$API_URL/api/discount-audits" \
  -H "Authorization: Bearer $TOKEN" | jq '.success, .data.audits | length'
echo ""

# Test 10: Discount Terms
echo "10. Testing Get Discount Terms..."
curl -s "$API_URL/api/discount-terms" \
  -H "Authorization: Bearer $TOKEN" | jq '.success, .data.terms | length'
echo ""

# Test 11: Inventory Summary
echo "11. Testing Inventory Summary..."
curl -s "$API_URL/api/inventory/summary" \
  -H "Authorization: Bearer $TOKEN" | jq '.success, .data'
echo ""

# Test 12: Payment Reminders
echo "12. Testing Get Payment Reminders..."
curl -s "$API_URL/api/payment-reminders" \
  -H "Authorization: Bearer $TOKEN" | jq '.success, .data.reminders | length'
echo ""

# Test 13: Vendor Ledger
echo "13. Testing Get Vendor Ledger..."
curl -s "$API_URL/api/vendor-ledger" \
  -H "Authorization: Bearer $TOKEN" | jq '.success'
echo ""

# Test 14: Credit/Debit Notes
echo "14. Testing Get Credit/Debit Notes..."
curl -s "$API_URL/api/credit-debit-notes" \
  -H "Authorization: Bearer $TOKEN" | jq '.success, .data.notes | length'
echo ""

# Test 15: Upload Stats
echo "15. Testing Upload Stats..."
curl -s "$API_URL/api/uploads/stats" \
  -H "Authorization: Bearer $TOKEN" | jq '.success, .data'
echo ""

echo "=== All Basic Endpoint Tests Complete ==="
