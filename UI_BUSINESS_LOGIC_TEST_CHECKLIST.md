# Business Logic Testing Checklist - UI Manual Tests

## Overview
This document provides a comprehensive checklist for manually testing all business logic through the AuditFlow web interface.

Test Date: ___________
Tester: ___________
Version: 1.0.0

---

## Pre-requisites
- [ ] Backend API running on http://localhost:4000
- [ ] Frontend running on http://localhost:3000
- [ ] Logged in as admin user
- [ ] Browser console open (F12)

---

## 1. VENDOR MANAGEMENT MODULE

### 1.1 Vendor Creation
- [ ] Navigate to `/vendors`
- [ ] Click "Add Vendor" button
- [ ] Fill in vendor details:
  - Name: "Test Vendor ABC"
  - GSTIN: 22AAAAA0000A1Z5
  - PAN: AAAPL1234C
  - Email: vendor@test.com
  - Phone: 1234567890
- [ ] Click "Save"
- [ ] **Expected**: Vendor created successfully
- [ ] **Verify**: New vendor appears in list

### 1.2 GSTIN Validation
- [ ] Click "Add Vendor"
- [ ] Enter invalid GSTIN: "INVALID123"
- [ ] Try to save
- [ ] **Expected**: Error "Invalid GSTIN format"
- [ ] **Verify**: Vendor not created

### 1.3 Duplicate GSTIN Detection
- [ ] Click "Add Vendor"
- [ ] Enter same GSTIN as existing vendor: 22AAAAA0000A1Z5
- [ ] Enter different name
- [ ] Click "Save"
- [ ] **Expected**: Error "Vendor with GSTIN already exists"
- [ ] **Verify**: Duplicate not created

### 1.4 Vendor Search
- [ ] In vendor list, enter search term: "Test"
- [ ] **Expected**: Only matching vendors shown
- [ ] Clear search
- [ ] **Expected**: All vendors shown

### 1.5 Vendor Edit
- [ ] Click edit icon on a vendor
- [ ] Change name to "Updated Vendor Name"
- [ ] Click "Save"
- [ ] **Expected**: Vendor updated successfully
- [ ] **Verify**: Name changed in list

### 1.6 Vendor Deletion
- [ ] Click delete icon on a test vendor
- [ ] Confirm deletion
- [ ] **Expected**: Vendor removed from list
- [ ] **Verify**: Vendor no longer appears

**Section Result**: ___/6 passed

---

## 2. CUSTOMER MANAGEMENT MODULE

### 2.1 Customer Creation
- [ ] Navigate to `/customers`
- [ ] Click "Add Customer"
- [ ] Fill details:
  - Name: "Test Customer XYZ"
  - GSTIN: 27BBBBB1111B1Z5
  - Email: customer@test.com
  - Credit Limit: 100000
- [ ] Click "Save"
- [ ] **Expected**: Customer created
- [ ] **Verify**: Appears in customer list

### 2.2 Credit Limit Validation
- [ ] Click "Add Customer"
- [ ] Enter negative credit limit: -1000
- [ ] Try to save
- [ ] **Expected**: Error "Credit limit must be positive"
- [ ] **Verify**: Customer not created

### 2.3 Customer Update
- [ ] Edit a customer
- [ ] Change credit limit to 150000
- [ ] Save
- [ ] **Expected**: Update successful
- [ ] **Verify**: Credit limit updated

**Section Result**: ___/3 passed

---

## 3. SKU/PRODUCT MANAGEMENT MODULE

### 3.1 SKU Creation
- [ ] Navigate to `/skus`
- [ ] Click "Add SKU"
- [ ] Fill details:
  - SKU Code: SKU-TEST-001
  - Description: Test Product
  - HSN Code: 8471
  - Unit: PCS
  - Rate: 1000
- [ ] Click "Save"
- [ ] **Expected**: SKU created
- [ ] **Verify**: Appears in SKU list

### 3.2 Duplicate SKU Prevention
- [ ] Try to create SKU with same code: SKU-TEST-001
- [ ] **Expected**: Error "SKU code already exists"
- [ ] **Verify**: Duplicate prevented

### 3.3 HSN Code Validation
- [ ] Create SKU with invalid HSN: "ABC"
- [ ] **Expected**: Error or validation message
- [ ] **Verify**: Invalid HSN rejected

### 3.4 SKU Bulk Import
- [ ] Click "Import SKUs"
- [ ] Upload CSV with 3 valid SKUs
- [ ] **Expected**: All 3 imported successfully
- [ ] **Verify**: Count shows +3 SKUs

**Section Result**: ___/4 passed

---

## 4. PURCHASE ORDER MODULE

### 4.1 PO Creation
- [ ] Navigate to `/purchases`
- [ ] Click "Create PO"
- [ ] Select vendor: Test Vendor ABC
- [ ] Add line items:
  - SKU: SKU-TEST-001, Qty: 10, Rate: 1000
  - SKU: SKU-TEST-002, Qty: 5, Rate: 500
- [ ] **Expected**: Total calculates automatically: ₹12,500
- [ ] Enter PO Number: PO-2026-001
- [ ] Enter PO Date: Today
- [ ] Click "Save"
- [ ] **Expected**: PO created successfully
- [ ] **Verify**: PO appears in list with status "PENDING"

### 4.2 PO Total Validation
- [ ] Create new PO
- [ ] Add items totaling ₹10,000
- [ ] Manually change total to ₹5,000
- [ ] Try to save
- [ ] **Expected**: Error "Total doesn't match line items"
- [ ] **Verify**: PO not saved

### 4.3 PO Approval Workflow
- [ ] Open a PENDING PO
- [ ] Click "Approve"
- [ ] **Expected**: Status changes to "APPROVED"
- [ ] **Verify**: Status updated in list
- [ ] **Verify**: Cannot edit approved PO

**Section Result**: ___/3 passed

---

## 5. INVOICE MATCHING MODULE

### 5.1 Invoice Creation Against PO
- [ ] Navigate to `/purchases`
- [ ] Select an approved PO
- [ ] Click "Create Invoice"
- [ ] Invoice details auto-fill from PO
- [ ] Enter Invoice Number: INV-2026-001
- [ ] Enter Invoice Date: Today
- [ ] **Verify**: Quantities match PO
- [ ] Click "Save"
- [ ] **Expected**: Invoice created
- [ ] **Expected**: Shows "MATCHED" status

### 5.2 Quantity Mismatch Detection
- [ ] Create invoice against PO
- [ ] Change quantity: PO has 10, invoice has 8
- [ ] Save invoice
- [ ] **Expected**: Status shows "QUANTITY_MISMATCH"
- [ ] **Expected**: Variance: -2 units highlighted
- [ ] **Verify**: Mismatch report generated

### 5.3 Price Mismatch Detection
- [ ] Create invoice against PO
- [ ] Keep quantity same but change price
  - PO rate: ₹1000, Invoice rate: ₹1100
- [ ] Save invoice
- [ ] **Expected**: Status shows "PRICE_MISMATCH"
- [ ] **Expected**: Shows price variance: ₹100/unit
- [ ] **Verify**: Exception report created

### 5.4 Three-Way Matching
- [ ] Create invoice matching PO exactly
- [ ] Create GRN (Goods Receipt) for same PO
- [ ] **Expected**: System shows 3-way match status
- [ ] **Verify**: PO, Invoice, GRN all linked
- [ ] **Verify**: Match status: "COMPLETE"

**Section Result**: ___/4 passed

---

## 6. PAYMENT RECONCILIATION MODULE

### 6.1 Bank Transaction Import
- [ ] Navigate to `/bank`
- [ ] Click "Import Transactions"
- [ ] Upload bank statement CSV
- [ ] **Expected**: Transactions imported
- [ ] **Verify**: Transaction count updated
- [ ] **Verify**: All transactions shown with status "UNMATCHED"

### 6.2 Automatic Payment Matching
- [ ] Click "Auto-Match" button
- [ ] **Expected**: System matches transactions with invoices
- [ ] **Verify**: Matched transactions show "MATCHED" status
- [ ] **Verify**: Match confidence score shown (High/Medium/Low)

### 6.3 Manual Payment Matching
- [ ] Select an unmatched transaction (₹10,000)
- [ ] Click "Match Manually"
- [ ] Search for invoice: INV-2026-001 (₹10,000)
- [ ] Click "Match"
- [ ] **Expected**: Transaction and invoice linked
- [ ] **Expected**: Status changes to "MATCHED"
- [ ] **Verify**: Invoice marked as "PAID"

### 6.4 Partial Payment Handling
- [ ] Select transaction (₹5,000)
- [ ] Match to invoice (₹10,000)
- [ ] **Expected**: Shows as "PARTIAL PAYMENT"
- [ ] **Verify**: Invoice shows ₹5,000 paid, ₹5,000 outstanding
- [ ] **Verify**: Can match another transaction for remaining amount

### 6.5 Payment Reconciliation Report
- [ ] Click "Generate Report"
- [ ] Select date range: Last month
- [ ] **Expected**: Report shows:
  - Total matched: ₹X
  - Total unmatched: ₹Y
  - Reconciliation %: Z%
- [ ] **Verify**: Export to Excel works

**Section Result**: ___/5 passed

---

## 7. GST RECONCILIATION MODULE

### 7.1 GSTR-2A Import
- [ ] Navigate to `/gst`
- [ ] Click "Import GSTR-2A"
- [ ] Select period: February 2026
- [ ] Upload JSON file
- [ ] **Expected**: Data imported successfully
- [ ] **Verify**: Entry count shown
- [ ] **Verify**: ITC amount calculated

### 7.2 GST Invoice Matching
- [ ] Click "Auto-Match with Purchase Register"
- [ ] **Expected**: System matches GSTR-2A with invoices
- [ ] **Verify**: Match status shown:
  - Exact Match: Green
  - Amount Mismatch: Yellow
  - Missing in Books: Red
  - Missing in GSTR-2A: Orange

### 7.3 GST Mismatch Analysis
- [ ] Filter by "Amount Mismatch"
- [ ] Select a mismatch entry
- [ ] **Expected**: Shows comparison:
  - Books: ₹X
  - GSTR-2A: ₹Y
  - Difference: ₹Z
- [ ] Click "View Details"
- [ ] **Expected**: Shows line-by-line comparison

### 7.4 ITC Claim Validation
- [ ] Go to "ITC Summary"
- [ ] **Expected**: Shows:
  - Total ITC as per books
  - Total ITC as per GSTR-2A
  - Eligible ITC
  - Ineligible ITC
- [ ] **Verify**: Calculations are correct
- [ ] **Verify**: Can export ITC report

### 7.5 GST Return Preparation
- [ ] Click "Prepare GSTR-3B"
- [ ] Select period: February 2026
- [ ] **Expected**: Auto-fills from reconciled data
- [ ] **Verify**: All sections populated
- [ ] **Verify**: Totals match summary
- [ ] Download JSON for filing

**Section Result**: ___/5 passed

---

## 8. DISCOUNT AUDIT MODULE

### 8.1 Discount Term Setup
- [ ] Navigate to `/discount-terms`
- [ ] Click "Add Discount Term"
- [ ] Fill details:
  - Vendor: Test Vendor ABC
  - Type: Volume Discount
  - Min Qty: 100
  - Max Qty: 500
  - Discount %: 5%
  - Valid From: 2026-01-01
  - Valid To: 2026-12-31
- [ ] Save
- [ ] **Expected**: Discount term created
- [ ] **Verify**: Appears in active discounts list

### 8.2 Discount Compliance Check
- [ ] Navigate to `/discount-audits`
- [ ] Click "Run Audit"
- [ ] Select period: Last month
- [ ] **Expected**: Audit runs and shows results
- [ ] **Verify**: Shows:
  - Compliant invoices: Green
  - Non-compliant: Red
  - Missing discount: Yellow

### 8.3 Discount Variance Detection
- [ ] View audit results
- [ ] Find invoice where discount applied doesn't match terms
  - Expected: 5%, Applied: 3%
- [ ] **Expected**: Highlighted as discrepancy
- [ ] **Expected**: Shows variance: -2%
- [ ] **Verify**: Amount difference calculated

### 8.4 Discount Recovery Calculation
- [ ] Go to "Recovery Report"
- [ ] **Expected**: Shows total recoverable amount
- [ ] **Verify**: Lists all discrepancy invoices
- [ ] **Verify**: Can generate debit note for recovery

**Section Result**: ___/4 passed

---

## 9. INVENTORY RECONCILIATION MODULE

### 9.1 Stock Receipt
- [ ] Navigate to `/inventory`
- [ ] Select "Goods Receipt"
- [ ] Select PO: PO-2026-001
- [ ] Enter received quantities
- [ ] Enter GRN Number: GRN-2026-001
- [ ] Save
- [ ] **Expected**: Inventory updated
- [ ] **Verify**: Stock levels increased

### 9.2 Stock Issue
- [ ] Select "Stock Issue"
- [ ] Select items to issue
- [ ] Enter quantities
- [ ] Save
- [ ] **Expected**: Inventory reduced
- [ ] **Verify**: Stock levels decreased

### 9.3 Physical Count Entry
- [ ] Select "Physical Stock Count"
- [ ] Enter counted quantities for all items
- [ ] **Expected**: System calculates variances
- [ ] **Verify**: Shows:
  - System Qty
  - Physical Qty
  - Variance
  - Variance Value

### 9.4 Inventory Reconciliation
- [ ] Click "Reconcile Inventory"
- [ ] Review variances
- [ ] **Expected**: Shows items with discrepancies
- [ ] Approve adjustments
- [ ] **Expected**: Inventory adjusted to physical count
- [ ] **Verify**: Adjustment journal entries created

### 9.5 Stock Valuation Report
- [ ] Go to "Stock Valuation"
- [ ] **Expected**: Shows:
  - Total stock value
  - By category
  - By location
  - Aging analysis
- [ ] **Verify**: Export works

**Section Result**: ___/5 passed

---

## 10. PAYMENT REMINDERS MODULE

### 10.1 Overdue Detection
- [ ] Navigate to `/payment-reminders`
- [ ] **Expected**: Automatically shows overdue invoices
- [ ] **Verify**: Sorted by days overdue
- [ ] **Verify**: Shows:
  - Customer name
  - Invoice number
  - Amount
  - Due date
  - Days overdue

### 10.2 Reminder Configuration
- [ ] Click "Configure Reminders"
- [ ] Set rules:
  - 1st reminder: 3 days after due
  - 2nd reminder: 7 days after due
  - 3rd reminder: 15 days after due
- [ ] Save
- [ ] **Expected**: Rules saved successfully

### 10.3 Manual Reminder Send
- [ ] Select an overdue invoice
- [ ] Click "Send Reminder"
- [ ] Preview email
- [ ] **Expected**: Email template shown with:
  - Customer name
  - Invoice details
  - Amount due
  - Payment link
- [ ] Click "Send"
- [ ] **Expected**: Email sent confirmation
- [ ] **Verify**: Reminder logged in history

### 10.4 Bulk Reminder Send
- [ ] Select multiple overdue invoices
- [ ] Click "Send Bulk Reminders"
- [ ] **Expected**: Sends to all selected customers
- [ ] **Verify**: Sent count matches selected count
- [ ] **Verify**: All reminders logged

### 10.5 Reminder Effectiveness Report
- [ ] Go to "Reminder Report"
- [ ] **Expected**: Shows:
  - Reminders sent
  - Payments received after reminder
  - Effectiveness rate
  - Avg days to payment after reminder
- [ ] **Verify**: Charts display correctly

**Section Result**: ___/5 passed

---

## 11. VENDOR LEDGER MODULE

### 11.1 Ledger Statement Generation
- [ ] Navigate to `/vendor-ledger`
- [ ] Select vendor: Test Vendor ABC
- [ ] Select date range: Last 3 months
- [ ] Click "Generate Statement"
- [ ] **Expected**: Statement shows:
  - Opening balance
  - All invoices
  - All payments
  - Closing balance
- [ ] **Verify**: Running balance correct

### 11.2 Outstanding Balance Calculation
- [ ] View vendor statement
- [ ] **Expected**: Shows:
  - Total invoiced
  - Total paid
  - Outstanding amount
  - Aging (0-30, 31-60, 61-90, 90+ days)
- [ ] **Verify**: Math is correct

### 11.3 Ledger Confirmation Email
- [ ] Click "Send for Confirmation"
- [ ] **Expected**: Email sent to vendor
- [ ] **Expected**: Confirmation link generated
- [ ] **Verify**: Email logged

### 11.4 Vendor Acknowledgment
- [ ] Simulate vendor clicking confirmation link
- [ ] **Expected**: Shows statement for vendor review
- [ ] Vendor clicks "Confirm"
- [ ] **Expected**: Status changes to "CONFIRMED"
- [ ] **Verify**: Confirmation logged with timestamp

### 11.5 Discrepancy Reporting
- [ ] Vendor clicks "Report Discrepancy"
- [ ] Enters details of difference
- [ ] **Expected**: Discrepancy flagged
- [ ] **Expected**: Alert sent to accounts team
- [ ] **Verify**: Shows in pending actions

**Section Result**: ___/5 passed

---

## 12. CREDIT/DEBIT NOTES MODULE

### 12.1 Credit Note Creation
- [ ] Navigate to `/credit-debit-notes`
- [ ] Click "Create Credit Note"
- [ ] Select invoice: INV-2026-001
- [ ] Enter reason: "Damaged goods"
- [ ] Enter amount: ₹1,000
- [ ] **Expected**: Cannot exceed invoice amount
- [ ] Save
- [ ] **Expected**: Credit note created
- [ ] **Verify**: Note number generated: CN-XXXX

### 12.2 Credit Note Validation
- [ ] Try to create credit note for ₹50,000
- [ ] Against invoice of ₹10,000
- [ ] **Expected**: Error "Amount exceeds invoice value"
- [ ] **Verify**: Credit note not created

### 12.3 Debit Note Creation
- [ ] Click "Create Debit Note"
- [ ] Select invoice
- [ ] Enter reason: "Price difference recovery"
- [ ] Enter amount: ₹500
- [ ] Save
- [ ] **Expected**: Debit note created
- [ ] **Verify**: Note number generated: DN-XXXX

### 12.4 Note Impact on Balance
- [ ] View vendor ledger after credit note
- [ ] **Expected**: Outstanding reduced by credit note amount
- [ ] View after debit note
- [ ] **Expected**: Outstanding increased by debit note amount
- [ ] **Verify**: Balance calculations correct

### 12.5 GST Treatment of Notes
- [ ] Create credit note with GST
- [ ] **Expected**: GST calculated on credit amount
- [ ] **Expected**: ITC reduced accordingly
- [ ] **Verify**: Shows in GST reports
- [ ] **Verify**: Reflects in GSTR-2 preparation

**Section Result**: ___/5 passed

---

## 13. REPORTING & ANALYTICS

### 13.1 Dashboard KPIs
- [ ] Navigate to `/dashboard`
- [ ] **Expected**: Shows key metrics:
  - Total POs (count & value)
  - Pending invoices
  - Matched vs Unmatched
  - Outstanding payments
  - ITC available
- [ ] **Verify**: All numbers are current
- [ ] **Verify**: Charts render correctly

### 13.2 Reconciliation Summary
- [ ] Go to `/reconciliation`
- [ ] **Expected**: Shows all module status:
  - PO-Invoice: X% matched
  - Payments: Y% reconciled
  - GST: Z% matched
  - Inventory: Variance ₹W
- [ ] **Verify**: Can drill down into each

### 13.3 Exception Reports
- [ ] Click "View All Exceptions"
- [ ] **Expected**: Shows:
  - Quantity mismatches
  - Price variances
  - Payment discrepancies
  - GST differences
  - Discount issues
- [ ] **Verify**: Can filter by type
- [ ] **Verify**: Can assign for resolution

### 13.4 Audit Trail
- [ ] Go to any transaction
- [ ] Click "View History"
- [ ] **Expected**: Shows:
  - Created by/when
  - All modifications
  - Modified by/when
  - Status changes
  - Approvals
- [ ] **Verify**: Complete trail maintained

### 13.5 Custom Reports
- [ ] Go to `/reports`
- [ ] Click "Create Custom Report"
- [ ] Select fields to include
- [ ] Set filters
- [ ] **Expected**: Report generates with selected data
- [ ] **Verify**: Can save report template
- [ ] **Verify**: Can schedule email delivery

**Section Result**: ___/5 passed

---

## 14. FILE UPLOAD FUNCTIONALITY

### 14.1 Single File Upload
- [ ] Navigate to `/uploads`
- [ ] Click "Upload Files"
- [ ] Select document type: "Purchase Invoice"
- [ ] Drag and drop a PDF file
- [ ] **Expected**: File appears in queue
- [ ] Click "Upload 1 file"
- [ ] **Expected**: Progress bar shows 0% → 100%
- [ ] **Expected**: Status changes to success ✓
- [ ] **Verify**: File appears in uploads list

### 14.2 Multiple File Upload
- [ ] Select 5 PDF files
- [ ] Upload all together
- [ ] **Expected**: All files upload concurrently
- [ ] **Expected**: Individual progress for each file
- [ ] **Verify**: All 5 files successful

### 14.3 File Type Validation
- [ ] Try to upload .txt file
- [ ] **Expected**: Error "File type not supported"
- [ ] **Verify**: Only PDF, Excel, CSV, images allowed

### 14.4 File Size Validation
- [ ] Try to upload 30MB file
- [ ] **Expected**: Error "File exceeds 25MB limit"
- [ ] **Verify**: File not uploaded

### 14.5 Document Processing
- [ ] Upload invoice PDF
- [ ] **Expected**: Shows "Processing" status
- [ ] Wait for processing
- [ ] **Expected**: Status changes to "Completed"
- [ ] Click "View Extracted Data"
- [ ] **Expected**: Shows OCR results:
  - Vendor name
  - Invoice number
  - Date
  - Amount
  - Line items
- [ ] **Verify**: Data extraction accurate

**Section Result**: ___/5 passed

---

## 15. AI CHAT ASSISTANT

### 15.1 Basic Query
- [ ] Navigate to `/chat`
- [ ] Type: "Show me all unpaid invoices"
- [ ] Send
- [ ] **Expected**: AI responds with list of unpaid invoices
- [ ] **Expected**: Shows in side panel with details
- [ ] **Verify**: Response is relevant

### 15.2 Complex Analysis
- [ ] Type: "What's my GST liability for February 2026?"
- [ ] Send
- [ ] **Expected**: AI calculates and shows:
  - Output tax
  - Input tax (ITC)
  - Net liability
  - Breakdown by type (CGST, SGST, IGST)
- [ ] **Verify**: Numbers match GST reports

### 15.3 Document Upload in Chat
- [ ] Click attach icon
- [ ] Upload invoice PDF
- [ ] Ask: "Extract data from this invoice"
- [ ] **Expected**: AI extracts and shows invoice details
- [ ] **Expected**: Asks if you want to save to system
- [ ] **Verify**: Extraction accurate

### 15.4 Real-time Streaming
- [ ] Ask complex question
- [ ] **Expected**: Response streams word-by-word
- [ ] **Expected**: No need to refresh page
- [ ] **Verify**: Smooth streaming display

### 15.5 Conversation Context
- [ ] Ask: "Show me vendor ABC's invoices"
- [ ] Then ask: "What's their outstanding amount?"
- [ ] **Expected**: AI understands "their" refers to vendor ABC
- [ ] **Expected**: Correct context maintained
- [ ] **Verify**: Context-aware responses

**Section Result**: ___/5 passed

---

## FINAL SCORE SUMMARY

| Module | Tests | Passed | % |
|--------|-------|--------|---|
| 1. Vendors | 6 | ___ | ___ |
| 2. Customers | 3 | ___ | ___ |
| 3. SKUs | 4 | ___ | ___ |
| 4. Purchase Orders | 3 | ___ | ___ |
| 5. Invoice Matching | 4 | ___ | ___ |
| 6. Payment Reconciliation | 5 | ___ | ___ |
| 7. GST Reconciliation | 5 | ___ | ___ |
| 8. Discount Audit | 4 | ___ | ___ |
| 9. Inventory | 5 | ___ | ___ |
| 10. Payment Reminders | 5 | ___ | ___ |
| 11. Vendor Ledger | 5 | ___ | ___ |
| 12. Credit/Debit Notes | 5 | ___ | ___ |
| 13. Reporting | 5 | ___ | ___ |
| 14. File Upload | 5 | ___ | ___ |
| 15. AI Chat | 5 | ___ | ___ |
| **TOTAL** | **68** | **___** | **___%** |

---

## CRITICAL ISSUES FOUND

| # | Module | Issue | Severity | Status |
|---|--------|-------|----------|--------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

---

## RECOMMENDATIONS

1.
2.
3.

---

## SIGN-OFF

Tester Signature: ___________________  Date: ___________

QA Lead Approval: ___________________  Date: ___________

---

**Notes:**
- Mark each test with ✓ (Pass), ✗ (Fail), or N/A (Not Applicable)
- Document all failures in Critical Issues section
- Take screenshots of any errors
- Record browser console errors
- Test on multiple browsers (Chrome, Firefox, Safari)
- Test with different data volumes (10, 100, 1000 records)
