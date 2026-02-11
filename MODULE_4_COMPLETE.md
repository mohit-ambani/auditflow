# ✅ Module 4: Document Parser & AI Extraction - COMPLETE!

## What's Been Built

Module 4 implements the **intelligent document processing pipeline** that automatically extracts structured data from uploaded documents using AI and validates the results.

---

## 🎯 Complete Document Processing Pipeline

```
Upload File → Parse → Classify → Extract → Validate → Save
     ↓          ↓         ↓          ↓          ↓        ↓
   Queue    PDF/Excel  AI Type   Claude API  Business  Database
            Parser    Detection  Extraction   Rules    + Status
```

---

## 📄 Document Parsers

### **1. PDF Parser** (`services/parsers/pdf-parser.ts`)

**Core Function:**
```typescript
parsePDF(buffer: Buffer): Promise<PDFParseResult>
```

**Features:**
- ✅ Text extraction from PDFs using `pdf-parse`
- ✅ Metadata extraction (title, author, dates)
- ✅ Page count detection
- ✅ Scanned PDF detection (low text ratio)
- ✅ Table extraction heuristics
- ✅ Key-value pair extraction
- ✅ Date extraction (multiple Indian formats)
- ✅ Amount/currency extraction (₹, Rs.)
- ✅ GSTIN extraction with regex validation
- ✅ Invoice/PO number extraction

**Pattern Matching:**
- Dates: `DD/MM/YYYY`, `DD-MM-YYYY`, `DD Month YYYY`
- Amounts: `₹1,234.56`, `Rs 1,234.56`, `1,234.56`
- GSTIN: `##XXXXX####X#Z#` (15 char format)
- Doc Numbers: `INV-2024-001`, `PO/2024/123`

### **2. Excel/CSV Parser** (`services/parsers/excel-parser.ts`)

**Core Functions:**
```typescript
parseExcel(buffer, mimeType): Promise<ExcelParseResult>
parseCSV(buffer): Promise<ExcelParseResult>
```

**Features:**
- ✅ Multi-sheet support
- ✅ Header detection (first row)
- ✅ Data conversion to JSON objects
- ✅ GST Return type detection (GSTR-1, 2A, 2B, 3B)
- ✅ GSTR-2A/2B parsing (standard columns)
- ✅ Bank statement parsing (standard columns)
- ✅ Date parsing (Excel date codes + strings)
- ✅ Number parsing (handles commas, currency symbols)

**GSTR-2 Parsing:**
Extracts:
- GSTIN
- Invoice Number/Date
- Invoice Value
- Taxable Value
- IGST, CGST, SGST, CESS
- Place of Supply

**Bank Statement Parsing:**
Extracts:
- Transaction Date
- Description/Narration
- Debit/Credit amounts
- Balance
- Reference number

### **3. Image Parser** (`services/parsers/image-parser.ts`)

**Core Function:**
```typescript
parseImage(buffer: Buffer): Promise<ImageParseResult>
```

**Features:**
- ✅ Image preprocessing with `sharp`
- ✅ Grayscale conversion
- ✅ Contrast normalization
- ✅ Resize for performance
- ✅ Scanned document detection (aspect ratio)
- ✅ OCR preprocessing (binarization, sharpening)
- ⏳ Tesseract.js OCR (placeholder, can be added)

---

## 🤖 AI Data Extraction

### **AI Extractor Service** (`services/ai-extractor.ts`)

Uses **Claude API** with structured prompts to extract data.

#### **1. Purchase Order Extraction**
```typescript
extractPurchaseOrder(text): Promise<POData>
```

Extracts:
- PO number, date, delivery date
- Vendor name, GSTIN
- Line items (description, HSN, qty, price, GST)
- Subtotal, GST totals, grand total
- Notes

#### **2. Purchase Invoice Extraction**
```typescript
extractPurchaseInvoice(text): Promise<InvoiceData>
```

Extracts:
- Invoice number, date, due date
- Vendor/buyer details
- PO reference, IRN
- Line items with full details
- Tax calculations (CGST, SGST, IGST)
- TCS, round-off
- Payment terms

**Arithmetic Verification:**
- Validates line item totals
- Verifies tax calculations
- Checks grand total
- Flags discrepancies

#### **3. Sales Invoice Extraction**
Same structure as purchase invoice

#### **4. Bank Statement Extraction**
```typescript
extractBankStatement(text): Promise<BankData>
```

Extracts:
- Bank name, account number
- Statement period
- Opening/closing balance
- Transaction list (date, description, amount, type)
- Transaction type detection (NEFT, RTGS, UPI, etc.)

#### **5. Generic Document Extraction**
For any document type, extracts:
- Document type
- Document number/date
- Party name/GSTIN
- Total amount
- Key fields
- Summary

---

## 🏷️ Document Classification

### **Classifier Service** (`services/document-classifier.ts`)

**AI-Powered Classification:**
```typescript
classifyDocument(text): Promise<ClassificationResult>
```

**Supported Types:**
1. PURCHASE_ORDER
2. PURCHASE_INVOICE
3. SALES_INVOICE
4. BANK_STATEMENT
5. GST_RETURN
6. CREDIT_DEBIT_NOTE
7. INVENTORY_UPLOAD
8. VENDOR_MASTER
9. CUSTOMER_MASTER
10. OTHER

**Dual Approach:**
1. **AI Classification** (Claude API)
   - Analyzes content context
   - Returns confidence score
   - Provides reasoning

2. **Keyword Fallback** (Rule-based)
   - Pattern matching
   - Keyword detection
   - Used if AI fails

---

## ✅ Validation & Quality Control

### **Validator Service** (`services/validator.ts`)

**Invoice Validation:**
- ✅ Required fields check
- ✅ Date format validation
- ✅ GSTIN format validation
- ✅ Amount validation (no negatives)
- ✅ Line item validation
- ✅ GST structure check (CGST+SGST XOR IGST)
- ✅ CGST = SGST check

**PO Validation:**
- ✅ PO number required
- ✅ Date validation
- ✅ Vendor name required
- ✅ Line items present

**Bank Statement Validation:**
- ✅ Transactions present
- ✅ Required transaction fields
- ✅ Balance consistency check
- ✅ Debit XOR Credit validation

**Confidence Scoring:**
```typescript
calculateConfidence(extractedData): number // 0-1
```

Weighted scoring based on:
- Required fields present (70%)
- GSTIN format valid (10%)
- Arithmetic verified (15%)
- Other quality checks (5%)

**Manual Review Flagging:**
- Confidence < 0.7
- Arithmetic mismatch
- Missing critical fields

---

## ⚙️ Background Processing Worker

### **Document Worker** (`workers/document-worker.ts`)

**BullMQ Worker Configuration:**
```typescript
{
  concurrency: 2,           // Process 2 docs at once
  limiter: {
    max: 10,                // Max 10 jobs
    duration: 60000,        // per minute
  },
  attempts: 3,              // Retry 3 times
  backoff: {
    type: 'exponential',    // 2s, 4s, 8s
    delay: 2000,
  },
}
```

**Processing Pipeline:**

1. **Download File**
   - Get file from S3 via presigned URL
   - Load into buffer

2. **Parse File**
   - Route to appropriate parser (PDF/Excel/Image)
   - Extract raw text

3. **Classify Document**
   - AI classification if type = OTHER
   - Use provided type otherwise

4. **Extract Structured Data**
   - Route to appropriate AI extractor
   - Use specialized parsers for Excel (GSTR, Bank)

5. **Calculate Confidence**
   - Score extracted data quality
   - Weighted scoring algorithm

6. **Validate Data**
   - Check required fields
   - Validate formats
   - Verify arithmetic

7. **Determine Review Need**
   - Flag for manual review if needed

8. **Save Results**
   - Update database with extracted data
   - Set confidence score
   - Update processing status

**Status Flow:**
```
PENDING → PROCESSING → COMPLETED
                     ↘ FAILED (on error)
```

---

## 💾 Data Storage

### **UploadedFile Model Fields:**

```typescript
{
  extractedText: string,        // Raw text from parser
  aiExtractionResult: {
    // Extracted structured data
    invoice_number: string,
    line_items: [...],
    // etc.

    _metadata: {
      classificationConfidence: number,
      extractionConfidence: number,
      overallConfidence: number,
      validation: {
        valid: boolean,
        errors: string[],
        warnings: string[],
      },
    },
  },
  aiConfidence: number,         // Overall confidence score
  manualReview: boolean,        // Manual review flag
  processingStatus: string,     // PENDING/PROCESSING/COMPLETED/FAILED
}
```

---

## 🔄 Integration Flow

### **Upload → Process Flow:**

```
1. User uploads file via /api/uploads
2. File saved to S3 + DB record created
3. queueDocumentProcessing(fileId, orgId)
4. BullMQ adds job to 'document-processing' queue
5. Worker picks up job
6. Parse → Extract → Validate → Save
7. Status updated to COMPLETED
8. Frontend can fetch results via /api/uploads/:id
```

### **Viewing Results:**

```typescript
GET /api/uploads/:id

Response:
{
  id: string,
  fileName: string,
  documentType: "PURCHASE_INVOICE",
  processingStatus: "COMPLETED",
  aiConfidence: 0.92,
  manualReview: false,
  aiExtractionResult: {
    invoice_number: "INV-2024-001",
    invoice_date: "2024-02-11",
    vendor_name: "Acme Suppliers",
    grand_total: 125000,
    line_items: [...],
    _metadata: { ... },
  },
  extractedText: "...",
}
```

---

## 📁 Files Created

### Backend (9 files)
```
apps/api/src/
├── services/
│   ├── parsers/
│   │   ├── pdf-parser.ts          # PDF text extraction
│   │   ├── excel-parser.ts        # Excel/CSV parsing
│   │   └── image-parser.ts        # Image preprocessing
│   ├── ai-extractor.ts            # Claude API extraction
│   ├── document-classifier.ts     # AI classification
│   └── validator.ts               # Data validation
├── workers/
│   └── document-worker.ts         # BullMQ worker
└── routes/
    └── uploads.ts                 # ✏️ Added queue trigger
```

### Modified (2 files)
```
apps/api/src/
├── routes/uploads.ts              # Queue processing after upload
└── index.ts                       # Start worker on server start
```

---

## 🧪 Testing Checklist

### PDF Parsing
- [ ] Upload text-based PDF invoice
- [ ] Verify text extraction
- [ ] Check pattern matching (dates, amounts, GSTIN)
- [ ] Verify key-value pairs extracted

### Excel Parsing
- [ ] Upload GSTR-2A Excel file
- [ ] Verify sheet parsing
- [ ] Check column mapping
- [ ] Validate extracted entries

### AI Extraction
- [ ] Upload purchase invoice
- [ ] Check invoice number, date extracted
- [ ] Verify line items parsed
- [ ] Validate GST calculations
- [ ] Check confidence score

### Classification
- [ ] Upload document with type=OTHER
- [ ] Verify auto-classification works
- [ ] Check confidence score
- [ ] Validate document type assigned

### Validation
- [ ] Upload invoice with errors
- [ ] Check validation errors flagged
- [ ] Verify manual review flag set
- [ ] Test GSTIN validation

### Background Processing
- [ ] Upload file
- [ ] Check status changes: PENDING → PROCESSING → COMPLETED
- [ ] Verify retry on failure
- [ ] Check concurrency limits

---

## 📊 Extraction Examples

### Purchase Invoice Example:
```json
{
  "invoice_number": "INV/2024/001",
  "invoice_date": "2024-02-11",
  "vendor_name": "ABC Suppliers Pvt Ltd",
  "vendor_gstin": "27AABCU9603R1ZM",
  "line_items": [
    {
      "line_number": 1,
      "description": "Widget A",
      "hsn_code": "8483",
      "quantity": 100,
      "unit": "PCS",
      "unit_price": 500,
      "taxable_amount": 50000,
      "gst_rate": 18,
      "cgst": 4500,
      "sgst": 4500,
      "total": 59000
    }
  ],
  "subtotal": 50000,
  "cgst_total": 4500,
  "sgst_total": 4500,
  "grand_total": 59000,
  "arithmetic_verified": true
}
```

---

## 🎉 Achievement Unlocked!

You now have:
- ✅ **Intelligent document parsing** (PDF, Excel, Images)
- ✅ **AI-powered data extraction** with Claude API
- ✅ **Automatic document classification**
- ✅ **Comprehensive validation** and quality checks
- ✅ **Background processing** with BullMQ
- ✅ **Confidence scoring** and manual review flagging
- ✅ **Structured data storage** in database
- ✅ **Automatic processing** on upload

**Your documents are now intelligent! 🧠**

---

## 🚀 Next: Module 5 - Master Data Management

Module 5 will implement:
1. **Vendor Management** (CRUD, bulk import, GSTIN validation)
2. **Customer Management** (credit limits, bulk import)
3. **SKU Master** (HSN codes, aliases, categories)
4. **SKU Auto-Mapping** (fuzzy matching, AI matching)
5. **Discount Terms Management** (slabs, validity periods)

This will enable **automatic matching** of extracted invoice items to your master data!

**Ready to manage your master data? 🎯**
