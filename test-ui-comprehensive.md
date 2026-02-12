# AuditFlow - Comprehensive UI Testing Checklist

## Test Execution Date: __________
## Tester: __________

---

## ✅ Testing Instructions

For each test:
1. Perform the action
2. Check the expected result
3. Mark ✓ if passed, ✗ if failed
4. Note any issues in the "Notes" column

---

## 1. Authentication & Authorization

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 1.1 | Valid login | Navigate to `/`, enter demo@auditflow.com / Password123, click Login | Redirect to /dashboard, show welcome message | ⬜ | |
| 1.2 | Invalid login | Enter wrong@email.com / wrong, click Login | Show error message, stay on login page | ⬜ | |
| 1.3 | Empty form | Click Login without entering credentials | Show validation errors | ⬜ | |
| 1.4 | Protected route | Try to access /dashboard without login | Redirect to login page | ⬜ | |
| 1.5 | Logout | Click user menu → Logout | Clear session, redirect to login | ⬜ | |
| 1.6 | Session persistence | Login → close browser → reopen | Still logged in | ⬜ | |

---

## 2. Dashboard

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 2.1 | Load dashboard | Navigate to /dashboard | Show summary cards with statistics | ⬜ | |
| 2.2 | Statistics accuracy | Check vendor count | Matches actual count from vendors page | ⬜ | |
| 2.3 | Quick actions | Click "Add Vendor" | Navigate to vendor creation form | ⬜ | |
| 2.4 | Recent activity | Check recent uploads/matches | Shows latest 5-10 items | ⬜ | |
| 2.5 | Navigation | Click each menu item | Navigate to correct page | ⬜ | |

---

## 3. Vendor Management (`/vendors`)

### 3.1 List View

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 3.1.1 | Load vendor list | Navigate to /vendors | Show all vendors in table | ⬜ | |
| 3.1.2 | Pagination | Click "Next" page | Load next set of vendors | ⬜ | |
| 3.1.3 | Search by name | Type "Test" in search box | Filter vendors containing "Test" | ⬜ | |
| 3.1.4 | Search by GSTIN | Type GSTIN in search | Find vendor with that GSTIN | ⬜ | |
| 3.1.5 | Filter by state | Select "Karnataka" in filter | Show only Karnataka vendors | ⬜ | |
| 3.1.6 | Sort by name | Click "Name" column header | Sort alphabetically | ⬜ | |
| 3.1.7 | Empty state | Clear all filters with no results | Show "No vendors found" message | ⬜ | |

### 3.2 Create Vendor

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 3.2.1 | Valid vendor | Fill all required fields, click Save | Vendor created, redirect to list | ⬜ | |
| 3.2.2 | GSTIN validation | Enter invalid GSTIN (e.g., "ABC123") | Show error: Invalid GSTIN format | ⬜ | |
| 3.2.3 | Duplicate GSTIN | Enter existing GSTIN | Show error: GSTIN already exists | ⬜ | |
| 3.2.4 | Email validation | Enter invalid email | Show error: Invalid email format | ⬜ | |
| 3.2.5 | Phone validation | Enter invalid phone | Show error: Invalid phone number | ⬜ | |
| 3.2.6 | Required fields | Leave name empty, click Save | Show error: Name is required | ⬜ | |
| 3.2.7 | Cancel action | Click Cancel | Discard changes, return to list | ⬜ | |

### 3.3 Edit Vendor

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 3.3.1 | Load edit form | Click Edit icon on vendor | Form pre-filled with vendor data | ⬜ | |
| 3.3.2 | Update name | Change name, click Save | Name updated, show success message | ⬜ | |
| 3.3.3 | Update contact | Change email/phone, click Save | Contact updated successfully | ⬜ | |
| 3.3.4 | GSTIN readonly | Try to change GSTIN | GSTIN field is readonly/disabled | ⬜ | |

### 3.4 Delete Vendor

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 3.4.1 | Delete confirmation | Click Delete, see confirmation | Show "Are you sure?" dialog | ⬜ | |
| 3.4.2 | Confirm delete | Click "Yes" in confirmation | Vendor deleted, removed from list | ⬜ | |
| 3.4.3 | Cancel delete | Click "No" in confirmation | Vendor not deleted, dialog closes | ⬜ | |
| 3.4.4 | Delete with dependencies | Delete vendor with invoices | Show error or warning about dependencies | ⬜ | |

---

## 4. Customer Management (`/customers`)

### 4.1 List View

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 4.1.1 | Load customer list | Navigate to /customers | Show all customers | ⬜ | |
| 4.1.2 | Search customers | Search by name | Filter customers correctly | ⬜ | |
| 4.1.3 | Aging report | View aging column | Show days outstanding | ⬜ | |

### 4.2 Create/Edit Customer

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 4.2.1 | Create customer | Fill form, save | Customer created | ⬜ | |
| 4.2.2 | Validation | Test all validations | Proper error messages | ⬜ | |
| 4.2.3 | Edit customer | Update details | Changes saved | ⬜ | |

---

## 5. SKU Master (`/skus`)

### 5.1 List View

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 5.1.1 | Load SKU list | Navigate to /skus | Show all SKUs with pricing | ⬜ | |
| 5.1.2 | Search by code | Search "LAPTOP" | Find laptop SKUs | ⬜ | |
| 5.1.3 | Filter by HSN | Filter by HSN code | Show matching SKUs | ⬜ | |

### 5.2 Create SKU

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 5.2.1 | Valid SKU | Create with all fields | SKU created | ⬜ | |
| 5.2.2 | Price validation | Enter negative price | Show error | ⬜ | |
| 5.2.3 | GST rate | Enter GST rate (0, 5, 12, 18, 28) | Accepted | ⬜ | |
| 5.2.4 | Duplicate SKU code | Use existing code | Show error | ⬜ | |

---

## 6. File Upload System (`/uploads`)

### 6.1 Single File Upload

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 6.1.1 | Upload PDF | Select PDF file, upload | File uploaded, shows in list | ⬜ | |
| 6.1.2 | Upload Excel | Select XLSX file, upload | File uploaded successfully | ⬜ | |
| 6.1.3 | Upload CSV | Select CSV file, upload | File uploaded successfully | ⬜ | |
| 6.1.4 | Upload image | Select JPG/PNG, upload | Image uploaded successfully | ⬜ | |
| 6.1.5 | Invalid file type | Try .doc or .txt file | Show error: Unsupported type | ⬜ | |
| 6.1.6 | File too large | Upload >25MB file | Show error: File too large | ⬜ | |

### 6.2 Multi-File Upload

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 6.2.1 | Upload 5 files | Drag 5 PDFs at once | All 5 show in queue | ⬜ | |
| 6.2.2 | Progress tracking | Watch upload progress | Each file shows progress bar 0-100% | ⬜ | |
| 6.2.3 | Status indicators | Check status icons | Pending (gray), Uploading (blue), Success (green) | ⬜ | |
| 6.2.4 | Upload all | Click "Upload X files" | All files upload concurrently | ⬜ | |
| 6.2.5 | Error handling | Disconnect WiFi mid-upload | Files show error status | ⬜ | |
| 6.2.6 | Retry failed | Click Retry on failed file | File re-uploads successfully | ⬜ | |
| 6.2.7 | Remove file | Click Remove on pending file | File removed from queue | ⬜ | |
| 6.2.8 | Clear completed | Upload 3 files, click Clear Completed | Successful files removed from queue | ⬜ | |
| 6.2.9 | Document type | Select "Purchase Invoice" type | All files tagged with correct type | ⬜ | |
| 6.2.10 | Max files | Try to upload 11 files | Show error: Max 10 files | ⬜ | |

### 6.3 File Management

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 6.3.1 | View uploaded files | Check file list | Shows all uploaded files | ⬜ | |
| 6.3.2 | Search files | Search by filename | Filter files correctly | ⬜ | |
| 6.3.3 | Filter by type | Filter "Purchase Invoice" | Show only invoices | ⬜ | |
| 6.3.4 | Preview file | Click Eye icon | Show file preview | ⬜ | |
| 6.3.5 | Download file | Click download | File downloads | ⬜ | |
| 6.3.6 | Delete file | Click Delete, confirm | File deleted | ⬜ | |
| 6.3.7 | Statistics | Check stats cards | Show correct counts | ⬜ | |

---

## 7. AI Chat (`/chat`)

### 7.1 Basic Chat

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 7.1.1 | Create conversation | Click "New Chat" | New conversation created | ⬜ | |
| 7.1.2 | Send message | Type "Hello", send | AI responds | ⬜ | |
| 7.1.3 | Streaming response | Watch response | Text streams word-by-word | ⬜ | |
| 7.1.4 | Message history | Check previous messages | All messages visible | ⬜ | |
| 7.1.5 | Switch conversations | Click different conversation | Load that conversation | ⬜ | |

### 7.2 Natural Language Queries

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 7.2.1 | List vendors | "Show me all vendors" | AI lists vendors | ⬜ | |
| 7.2.2 | Search invoices | "Find unpaid invoices" | AI shows unpaid invoices | ⬜ | |
| 7.2.3 | Calculate GST | "What's my GST liability?" | AI calculates and shows amount | ⬜ | |
| 7.2.4 | Find duplicates | "Find duplicate payments" | AI detects duplicates | ⬜ | |
| 7.2.5 | Generate report | "Generate vendor ledger" | AI creates report | ⬜ | |

### 7.3 File Processing

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 7.3.1 | Upload invoice | Attach PDF, send | File uploaded | ⬜ | |
| 7.3.2 | Extract data | "Extract data from this invoice" | AI extracts invoice details | ⬜ | |
| 7.3.3 | Side panel | Check results | Data shown in side panel | ⬜ | |
| 7.3.4 | Multiple files | Attach 2 files | Both processed | ⬜ | |

---

## 8. Purchase Orders

### 8.1 Create PO

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 8.1.1 | Manual PO | Create PO with line items | PO created | ⬜ | |
| 8.1.2 | Add line items | Add 3 products | All items added | ⬜ | |
| 8.1.3 | Calculate total | Check totals | Subtotal + GST = Total | ⬜ | |
| 8.1.4 | Upload PO | Upload PO document | AI extracts data | ⬜ | |

---

## 9. Purchase Invoices

### 9.1 Create Invoice

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 9.1.1 | Manual invoice | Create invoice | Invoice created | ⬜ | |
| 9.1.2 | Upload invoice | Upload PDF | AI extracts | ⬜ | |
| 9.1.3 | Arithmetic check | Verify totals | AI verifies calculations | ⬜ | |
| 9.1.4 | Payment status | Check status | Shows UNPAID | ⬜ | |

---

## 10. PO-Invoice Matching (`/po-invoice-matches`)

### 10.1 Auto Matching

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 10.1.1 | Auto-match | Click "Auto Match" on invoice | AI finds matching PO | ⬜ | |
| 10.1.2 | Match score | Check confidence score | Shows percentage (0-100%) | ⬜ | |
| 10.1.3 | Match details | View match details | Shows line-by-line comparison | ⬜ | |
| 10.1.4 | Approve match | Click Approve | Match saved, status updated | ⬜ | |
| 10.1.5 | Reject match | Click Reject | Match deleted, invoice unmatched | ⬜ | |

### 10.2 Manual Matching

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 10.2.1 | Select PO | Choose PO from dropdown | PO selected | ⬜ | |
| 10.2.2 | Match manually | Click "Create Match" | Match created | ⬜ | |
| 10.2.3 | View discrepancies | Check differences | Shows amount/qty differences | ⬜ | |

---

## 11. Payment Matching

### 11.1 Bank Reconciliation

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 11.1.1 | Upload bank statement | Upload statement | Transactions extracted | ⬜ | |
| 11.1.2 | Auto-match payment | Click "Auto Match" | Finds matching invoice | ⬜ | |
| 11.1.3 | Manual match | Select invoice manually | Match created | ⬜ | |
| 11.1.4 | Split payment | Match 1 payment to 2 invoices | Split created correctly | ⬜ | |
| 11.1.5 | Payment status | Check invoice status | Changes to PAID | ⬜ | |

---

## 12. GST Reconciliation

### 12.1 GSTR-2A Matching

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 12.1.1 | Upload GSTR-2A | Upload GST return | Entries loaded | ⬜ | |
| 12.1.2 | Reconcile | Click "Reconcile" | Matches with invoices | ⬜ | |
| 12.1.3 | ITC validation | Check ITC status | Shows Available/Mismatch | ⬜ | |
| 12.1.4 | Exception report | View exceptions | Lists discrepancies | ⬜ | |
| 12.1.5 | GST liability | Calculate liability | Shows total amount | ⬜ | |

---

## 13. Vendor Ledger

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 13.1 | Generate ledger | Select vendor, period | Ledger generated | ⬜ | |
| 13.2 | Send confirmation | Click "Send Email" | Email sent | ⬜ | |
| 13.3 | Track status | Check confirmation status | Shows Pending/Confirmed | ⬜ | |
| 13.4 | Export PDF | Click "Export" | PDF downloaded | ⬜ | |

---

## 14. Payment Reminders

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 14.1 | View reminders | Navigate to reminders | Shows upcoming payments | ⬜ | |
| 14.2 | Filter by date | Select "Due this week" | Shows correct invoices | ⬜ | |
| 14.3 | Send reminder | Click "Send Reminder" | Email sent | ⬜ | |
| 14.4 | Mark as paid | Click "Mark Paid" | Status updated | ⬜ | |

---

## 15. Inventory Reconciliation

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 15.1 | Upload stock | Upload inventory file | Stock data loaded | ⬜ | |
| 15.2 | View movements | Check stock movements | Shows in/out transactions | ⬜ | |
| 15.3 | Reconcile | Compare with PO/Invoice | Shows discrepancies | ⬜ | |
| 15.4 | Stock report | Generate report | Report created | ⬜ | |

---

## 16. Credit/Debit Notes

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 16.1 | Create credit note | Select invoice, enter amount | Note created | ⬜ | |
| 16.2 | Create debit note | Select invoice, enter amount | Note created | ⬜ | |
| 16.3 | Link to invoice | Check linked invoice | Shows relationship | ⬜ | |
| 16.4 | Impact on ledger | View vendor ledger | Amount adjusted | ⬜ | |

---

## 17. Discount Audits

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 17.1 | Set discount terms | Create discount rule | Rule created | ⬜ | |
| 17.2 | Track compliance | View audit report | Shows compliant/non-compliant | ⬜ | |
| 17.3 | Unauthorized discount | Check flagged items | Shows warnings | ⬜ | |
| 17.4 | Discount impact | Calculate savings | Shows total discount given | ⬜ | |

---

## 18. Performance Tests

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 18.1 | Load time | Open dashboard | Loads in < 2 seconds | ⬜ | |
| 18.2 | Large list | Load 1000 vendors | Pagination works smoothly | ⬜ | |
| 18.3 | File upload | Upload 10MB file | Completes in < 30 seconds | ⬜ | |
| 18.4 | Search speed | Search in large dataset | Results in < 1 second | ⬜ | |
| 18.5 | Concurrent users | Multiple tabs open | No conflicts | ⬜ | |

---

## 19. Mobile Responsiveness

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 19.1 | Mobile dashboard | View on phone | Layout adapts correctly | ⬜ | |
| 19.2 | Touch interactions | Tap buttons | All interactions work | ⬜ | |
| 19.3 | Tablet view | View on tablet | Optimal layout | ⬜ | |
| 19.4 | Navigation | Use mobile menu | Menu accessible | ⬜ | |

---

## 20. Error Scenarios

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 20.1 | Network error | Disconnect WiFi, try action | Show error message | ⬜ | |
| 20.2 | Timeout | Slow connection | Show loading, handle timeout | ⬜ | |
| 20.3 | Server error | Force 500 error | Show friendly error message | ⬜ | |
| 20.4 | Invalid session | Expired token | Redirect to login | ⬜ | |

---

## Test Summary

**Total Tests**: 200+
**Passed**: _____
**Failed**: _____
**Skipped**: _____

**Pass Rate**: _____%

---

## Critical Issues Found

1. _____________________________________
2. _____________________________________
3. _____________________________________

---

## Recommendations

1. _____________________________________
2. _____________________________________
3. _____________________________________

---

## Sign-off

**Tester**: _____________________
**Date**: _____________________
**Status**: ⬜ PASS / ⬜ FAIL / ⬜ PASS WITH ISSUES

**Notes**:
_____________________________________________
_____________________________________________
_____________________________________________
