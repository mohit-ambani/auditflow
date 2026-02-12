# AuditFlow - Comprehensive Testing Guide

## Overview

This guide covers testing all 13 reconciliation modules and the new multi-file upload system in AuditFlow.

---

## Prerequisites

1. **Backend Running**: `cd apps/api && pnpm dev`
2. **Frontend Running**: `cd apps/web && pnpm dev`
3. **Database Setup**: Migrations applied and seed data loaded
4. **Authentication**: Demo account credentials
   - Email: `demo@auditflow.com`
   - Password: `Password123`

---

## Automated Testing

### Run Full Test Suite

```bash
cd /Users/apple/auditflow
./test-reconciliation-features.sh
```

This script tests all 15 features:
1. Authentication
2. Vendor Management
3. Customer Management
4. SKU Master Management
5. Discount Terms
6. Inventory Management
7. File Upload System
8. Upload Statistics
9. PO-Invoice Matching
10. Payment Matching
11. GST Matching
12. Vendor Ledger
13. Payment Reminders
14. Discount Audits
15. Credit/Debit Notes

**Expected Output**: All tests should pass with green checkmarks.

---

## Manual Testing

### 1. Vendor Management Module

**URL**: http://localhost:3000/vendors

**Test Cases**:
- ✅ Create new vendor with GST validation
- ✅ Edit vendor details
- ✅ Delete vendor
- ✅ Search vendors by name/GSTIN
- ✅ Filter by state

**API Endpoints**:
```bash
# Get all vendors
curl http://localhost:4000/api/vendors \
  -H "Authorization: Bearer $TOKEN"

# Create vendor
curl -X POST http://localhost:4000/api/vendors \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Vendor Ltd",
    "gstin": "29AAAAA0000A1Z5",
    "email": "vendor@test.com",
    "phone": "9876543210",
    "address": "123 Test St",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560001"
  }'
```

---

### 2. Customer Management Module

**URL**: http://localhost:3000/customers

**Test Cases**:
- ✅ Create customer with validation
- ✅ Edit customer details
- ✅ Delete customer
- ✅ View customer aging report
- ✅ Search and filter customers

**API Endpoints**:
```bash
# Get all customers
curl http://localhost:4000/api/customers \
  -H "Authorization: Bearer $TOKEN"

# Create customer
curl -X POST http://localhost:4000/api/customers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Customer Ltd",
    "gstin": "29BBBBB0000B1Z5",
    "email": "customer@test.com"
  }'
```

---

### 3. SKU Master Management

**URL**: http://localhost:3000/skus

**Test Cases**:
- ✅ Create SKU with HSN code
- ✅ Edit SKU pricing
- ✅ Bulk import SKUs
- ✅ Search by SKU code or name
- ✅ View SKU usage in invoices

**API Endpoints**:
```bash
# Get all SKUs
curl http://localhost:4000/api/skus \
  -H "Authorization: Bearer $TOKEN"

# Create SKU
curl -X POST http://localhost:4000/api/skus \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "skuCode": "TEST-001",
    "name": "Test Product",
    "hsnCode": "8471",
    "unit": "PCS",
    "gstRate": 18.0,
    "purchasePrice": 1000.00,
    "sellingPrice": 1500.00
  }'
```

---

### 4. Purchase Order Management

**Test Cases**:
- ✅ Create PO manually
- ✅ Upload PO document
- ✅ Extract PO data with AI
- ✅ Edit PO line items
- ✅ View PO status

---

### 5. Purchase Invoice Management

**Test Cases**:
- ✅ Upload invoice document
- ✅ AI extraction with arithmetic verification
- ✅ Manual invoice creation
- ✅ Edit invoice details
- ✅ Track payment status

**Test with Sample Invoice**:
```bash
# Use the sample invoice
curl -X POST http://localhost:4000/api/ai-demo/process-and-save-invoice \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"documentText\": \"$(cat /Users/apple/auditflow/SAMPLE_INVOICE.txt)\"}"
```

---

### 6. PO-Invoice Reconciliation

**URL**: http://localhost:3000/po-invoice-matches

**Test Cases**:
- ✅ Auto-match invoice to PO
- ✅ Manual match with confidence score
- ✅ View match details
- ✅ Approve/reject matches
- ✅ View discrepancies

**API Endpoints**:
```bash
# Auto-match invoice
curl -X POST http://localhost:4000/api/po-invoice-matches/auto-match \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"invoiceId": "INVOICE_ID"}'

# Get match statistics
curl http://localhost:4000/api/po-invoice-matches/stats \
  -H "Authorization: Bearer $TOKEN"
```

---

### 7. Bank Reconciliation

**Test Cases**:
- ✅ Upload bank statement
- ✅ Extract transactions with AI
- ✅ Match payments to invoices
- ✅ Handle split payments
- ✅ View unmatched transactions

**API Endpoints**:
```bash
# Auto-match payment
curl -X POST http://localhost:4000/api/payment-matches/auto-match \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bankTxnId": "TXN_ID",
    "invoiceType": "purchase"
  }'

# Create split payment
curl -X POST http://localhost:4000/api/payment-matches/split \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bankTxnId": "TXN_ID",
    "splits": [
      {"invoiceId": "INV1", "invoiceType": "purchase", "amount": 1000},
      {"invoiceId": "INV2", "invoiceType": "purchase", "amount": 500}
    ]
  }'
```

---

### 8. GST Reconciliation (GSTR-2A)

**URL**: http://localhost:3000/gst-matches

**Test Cases**:
- ✅ Upload GSTR-2A data
- ✅ Match with purchase invoices
- ✅ Identify ITC mismatches
- ✅ Generate exception report
- ✅ Calculate GST liability

**API Endpoints**:
```bash
# Reconcile GST return
curl -X POST http://localhost:4000/api/gst-matches/reconcile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "returnId": "RETURN_ID",
    "autoSave": true
  }'

# Get GST statistics
curl http://localhost:4000/api/gst-matches/stats \
  -H "Authorization: Bearer $TOKEN"

# Get exceptions
curl http://localhost:4000/api/gst-matches/return/RETURN_ID/exceptions \
  -H "Authorization: Bearer $TOKEN"
```

---

### 9. Vendor Ledger Confirmation

**URL**: http://localhost:3000/vendor-ledger

**Test Cases**:
- ✅ Generate vendor ledger
- ✅ Send confirmation email
- ✅ Track confirmation status
- ✅ View discrepancies
- ✅ Export ledger to PDF

**API Endpoints**:
```bash
# Get vendor ledger
curl http://localhost:4000/api/vendor-ledger \
  -H "Authorization: Bearer $TOKEN"

# Send confirmation
curl -X POST http://localhost:4000/api/vendor-ledger/send-confirmation \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vendorId": "VENDOR_ID",
    "period": "2025-01"
  }'
```

---

### 10. Payment Reminders

**URL**: http://localhost:3000/payment-reminders

**Test Cases**:
- ✅ View upcoming payments
- ✅ Send reminder emails
- ✅ Mark as paid
- ✅ Filter by due date
- ✅ Schedule automated reminders

**API Endpoints**:
```bash
# Get payment reminders
curl http://localhost:4000/api/payment-reminders \
  -H "Authorization: Bearer $TOKEN"

# Send reminder
curl -X POST http://localhost:4000/api/payment-reminders/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"invoiceId": "INVOICE_ID"}'
```

---

### 11. Inventory Reconciliation

**URL**: http://localhost:3000/inventory

**Test Cases**:
- ✅ Upload stock data
- ✅ Reconcile with PO/Invoice
- ✅ View stock movements
- ✅ Identify discrepancies
- ✅ Generate stock report

**API Endpoints**:
```bash
# Get inventory summary
curl http://localhost:4000/api/inventory/summary \
  -H "Authorization: Bearer $TOKEN"

# Get stock movements
curl http://localhost:4000/api/inventory/movements \
  -H "Authorization: Bearer $TOKEN"
```

---

### 12. Credit/Debit Notes

**URL**: http://localhost:3000/credit-debit-notes

**Test Cases**:
- ✅ Create credit note
- ✅ Create debit note
- ✅ Link to original invoice
- ✅ Track adjustments
- ✅ View impact on ledger

**API Endpoints**:
```bash
# Get all notes
curl http://localhost:4000/api/credit-debit-notes \
  -H "Authorization: Bearer $TOKEN"

# Create credit note
curl -X POST http://localhost:4000/api/credit-debit-notes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "noteType": "CREDIT",
    "invoiceId": "INVOICE_ID",
    "amount": 1000,
    "reason": "Goods returned"
  }'
```

---

### 13. Discount Audits

**URL**: http://localhost:3000/discount-audits

**Test Cases**:
- ✅ Set discount terms
- ✅ Track discount compliance
- ✅ Identify unauthorized discounts
- ✅ Calculate discount impact
- ✅ Generate audit report

**API Endpoints**:
```bash
# Get discount audits
curl http://localhost:4000/api/discount-audits \
  -H "Authorization: Bearer $TOKEN"

# Get discount statistics
curl http://localhost:4000/api/discount-audits/stats \
  -H "Authorization: Bearer $TOKEN"
```

---

## Multi-File Upload System Testing

### New Features

1. **Batch Upload**: Upload up to 10 files simultaneously
2. **Individual Progress**: Track progress for each file
3. **Error Handling**: Retry failed uploads
4. **Document Type Selection**: Categorize uploads
5. **Visual Feedback**: Real-time status indicators

### Test Cases

**URL**: http://localhost:3000/uploads

✅ **Test 1: Single File Upload**
1. Navigate to Uploads page
2. Click "Upload Files"
3. Select document type: "Purchase Invoice"
4. Drag & drop a single PDF file
5. Verify progress bar appears
6. Verify success status after completion

✅ **Test 2: Multiple Files (Batch)**
1. Click "Upload Files"
2. Select document type: "Purchase Order"
3. Drag & drop 5 PDF files at once
4. Verify all files show in queue
5. Click "Upload 5 files"
6. Verify individual progress for each file
7. Verify success count updates

✅ **Test 3: Mixed File Types**
1. Upload combination of PDF, Excel, CSV, and images
2. Verify all accepted types work
3. Try uploading unsupported type (e.g., .doc)
4. Verify error message appears

✅ **Test 4: File Size Validation**
1. Try uploading file > 25MB
2. Verify size error appears
3. Upload file < 25MB
4. Verify success

✅ **Test 5: Maximum Files Limit**
1. Try uploading 11 files
2. Verify limit error appears
3. Upload exactly 10 files
4. Verify all process successfully

✅ **Test 6: Error Recovery**
1. Disconnect network mid-upload
2. Verify error status appears
3. Reconnect network
4. Click "Retry" on failed file
5. Verify successful upload

✅ **Test 7: Clear Completed**
1. Upload 3 files successfully
2. Click "Clear Completed"
3. Verify only successful files removed
4. Verify failed/pending files remain

✅ **Test 8: Real-time Statistics**
1. Start batch upload
2. Observe statistics cards update:
   - Pending count decreases
   - Uploading count changes
   - Success count increases
3. Verify totals are accurate

---

## AI Chat Interface Testing

**URL**: http://localhost:3000/chat

### Test Natural Language Queries

```
✅ "Show me all unpaid invoices"
✅ "What's my GST liability for January?"
✅ "Find duplicate payments in the last 30 days"
✅ "Reconcile invoice INV-2025-001"
✅ "Generate vendor ledger for ABC Electronics"
✅ "Upload and extract this invoice" (with file attachment)
```

### Test File Upload in Chat

1. Navigate to AI Chat
2. Click attachment icon
3. Upload invoice PDF
4. Send message: "Extract data from this invoice"
5. Verify AI processes and shows results in side panel

---

## Performance Testing

### Load Testing

```bash
# Test concurrent uploads
for i in {1..10}; do
  curl -X POST http://localhost:4000/api/uploads \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@test-file-$i.pdf" \
    -F "documentType=PURCHASE_INVOICE" &
done
wait
```

### Database Performance

```bash
# Test with large datasets
curl http://localhost:4000/api/vendors?limit=1000 \
  -H "Authorization: Bearer $TOKEN"
```

---

## Integration Testing

### End-to-End Reconciliation Flow

1. **Upload PO**: Upload purchase order document
2. **AI Extract**: Verify AI extracts PO data
3. **Upload Invoice**: Upload matching invoice
4. **Auto-Match**: Trigger auto-matching
5. **Review Match**: Check match quality
6. **Upload Bank Statement**: Add payment proof
7. **Payment Match**: Match payment to invoice
8. **GST Reconciliation**: Verify GST compliance
9. **Reports**: Generate all reconciliation reports

---

## Known Issues & Limitations

1. **Excel Preview**: Not yet implemented (shows download prompt)
2. **Concurrent Uploads**: Limited to 10 files at a time
3. **Large Files**: May timeout on slow connections
4. **AI Processing**: Requires Anthropic API credits

---

## Troubleshooting

### Issue: Upload Fails

**Solution**:
- Check backend is running on port 4000
- Verify authentication token is valid
- Check file size < 25MB
- Verify file type is supported

### Issue: AI Extraction Fails

**Solution**:
- Check Anthropic API key in .env
- Verify API credits are available
- Check file content is readable text

### Issue: Authentication Error

**Solution**:
```bash
# Get fresh token
curl -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "demo@auditflow.com",
    "password": "Password123"
  }'
```

---

## Success Criteria

All tests pass if:
- ✅ All 15 automated tests pass
- ✅ All manual test cases complete successfully
- ✅ Multi-file upload handles 10 files concurrently
- ✅ Error handling works correctly
- ✅ Progress tracking is accurate
- ✅ AI chat processes queries correctly
- ✅ No memory leaks or crashes
- ✅ API responses < 2 seconds

---

## Test Results Log

Document your test results:

```
Date: ____________________
Tester: __________________

Module                     | Status | Notes
---------------------------|--------|------------------
Vendor Management          | ⬜     |
Customer Management        | ⬜     |
SKU Master                 | ⬜     |
PO Management              | ⬜     |
Invoice Management         | ⬜     |
PO-Invoice Matching        | ⬜     |
Payment Matching           | ⬜     |
GST Reconciliation         | ⬜     |
Vendor Ledger              | ⬜     |
Payment Reminders          | ⬜     |
Inventory                  | ⬜     |
Credit/Debit Notes         | ⬜     |
Discount Audits            | ⬜     |
Multi-File Upload          | ⬜     |
AI Chat                    | ⬜     |

Overall Status: ⬜ PASS / ⬜ FAIL
```

---

**🎉 Testing Complete!**

After completing all tests, you can be confident that all 13 reconciliation modules and the file management system are working correctly.

For issues or questions, check:
- Backend logs: `apps/api/logs/`
- Frontend console: Browser DevTools
- API documentation: `README.md`
