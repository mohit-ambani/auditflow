-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'ACCOUNTANT', 'VIEWER');

-- CreateEnum
CREATE TYPE "ReconcFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY');

-- CreateEnum
CREATE TYPE "POStatus" AS ENUM ('OPEN', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PROCESSING', 'EXTRACTED', 'VERIFIED', 'MATCHED', 'DISPUTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERPAID');

-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('EXACT', 'PARTIAL_QTY', 'PARTIAL_VALUE', 'PARTIAL_BOTH', 'NO_MATCH', 'MANUAL');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "BankTxnType" AS ENUM ('NEFT', 'RTGS', 'IMPS', 'UPI', 'CHEQUE', 'CASH_DEPOSIT', 'CASH_WITHDRAWAL', 'BANK_CHARGES', 'INTEREST', 'OTHER');

-- CreateEnum
CREATE TYPE "BankMatchStatus" AS ENUM ('UNMATCHED', 'AUTO_MATCHED', 'MANUALLY_MATCHED', 'IGNORED');

-- CreateEnum
CREATE TYPE "GSTReturnType" AS ENUM ('GSTR1', 'GSTR2A', 'GSTR2B', 'GSTR3B');

-- CreateEnum
CREATE TYPE "ITCStatus" AS ENUM ('AVAILABLE', 'NOT_FILED', 'MISMATCH', 'REVERSED', 'INELIGIBLE');

-- CreateEnum
CREATE TYPE "NoteType" AS ENUM ('CREDIT_NOTE_RECEIVED', 'DEBIT_NOTE_ISSUED', 'CREDIT_NOTE_ISSUED', 'DEBIT_NOTE_RECEIVED');

-- CreateEnum
CREATE TYPE "NoteStatus" AS ENUM ('PENDING', 'ADJUSTED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "DiscountTermType" AS ENUM ('TRADE_DISCOUNT', 'CASH_DISCOUNT', 'VOLUME_REBATE', 'LATE_PAYMENT_PENALTY', 'LATE_DELIVERY_PENALTY', 'SPECIAL_SCHEME');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('CORRECT', 'UNDER_DISCOUNTED', 'OVER_DISCOUNTED', 'PENALTY_MISSING', 'PENALTY_INCORRECT', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "ConfirmationStatus" AS ENUM ('PENDING', 'SENT', 'CONFIRMED', 'DISPUTED', 'NO_RESPONSE', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT', 'PAYMENT_RECEIVED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PURCHASE_ORDER', 'PURCHASE_INVOICE', 'SALES_INVOICE', 'BANK_STATEMENT', 'GST_RETURN', 'CREDIT_DEBIT_NOTE', 'INVENTORY_UPLOAD', 'VENDOR_MASTER', 'CUSTOMER_MASTER', 'OTHER');

-- CreateEnum
CREATE TYPE "ReconcRunType" AS ENUM ('PO_INVOICE', 'INVOICE_PAYMENT', 'GST_RECONCILIATION', 'VENDOR_LEDGER', 'CUSTOMER_LEDGER', 'INVENTORY', 'FULL');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gstin" TEXT,
    "pan" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "financialYearStart" INTEGER NOT NULL DEFAULT 4,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationSettings" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "vendorReconcFrequency" "ReconcFrequency" NOT NULL DEFAULT 'MONTHLY',
    "customerReminderDays" INTEGER[] DEFAULT ARRAY[7, 15, 30]::INTEGER[],
    "autoSendReminders" BOOLEAN NOT NULL DEFAULT false,
    "autoSendLedgerConfirm" BOOLEAN NOT NULL DEFAULT false,
    "gstMatchTolerance" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "paymentMatchTolerance" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "inventoryTrackingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gstin" TEXT,
    "pan" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "contactPerson" TEXT,
    "paymentTermsDays" INTEGER DEFAULT 30,
    "erpVendorCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gstin" TEXT,
    "pan" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "contactPerson" TEXT,
    "creditLimitDays" INTEGER DEFAULT 30,
    "creditLimitAmount" DOUBLE PRECISION,
    "erpCustomerCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SKU" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "skuCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "hsnCode" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'PCS',
    "gstRate" DOUBLE PRECISION,
    "aliases" TEXT[],
    "category" TEXT,
    "subCategory" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SKU_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "poDate" TIMESTAMP(3) NOT NULL,
    "expectedDeliveryDate" TIMESTAMP(3),
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "cgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "igst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalWithGst" DOUBLE PRECISION NOT NULL,
    "status" "POStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "sourceFileId" TEXT,
    "extractedData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "POLineItem" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "skuId" TEXT,
    "lineNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'PCS',
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "discountPercent" DOUBLE PRECISION DEFAULT 0,
    "discountAmount" DOUBLE PRECISION DEFAULT 0,
    "taxableAmount" DOUBLE PRECISION NOT NULL,
    "gstRate" DOUBLE PRECISION,
    "cgst" DOUBLE PRECISION DEFAULT 0,
    "sgst" DOUBLE PRECISION DEFAULT 0,
    "igst" DOUBLE PRECISION DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "quantityReceived" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "POLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseInvoice" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "cgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "igst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tcs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "roundOff" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalWithGst" DOUBLE PRECISION NOT NULL,
    "vendorGstin" TEXT,
    "irn" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sourceFileId" TEXT,
    "extractedData" JSONB,
    "aiConfidence" DOUBLE PRECISION,
    "manualReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseInvoiceLineItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "skuId" TEXT,
    "lineNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "hsnCode" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'PCS',
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "discountPercent" DOUBLE PRECISION DEFAULT 0,
    "discountAmount" DOUBLE PRECISION DEFAULT 0,
    "taxableAmount" DOUBLE PRECISION NOT NULL,
    "gstRate" DOUBLE PRECISION,
    "cgst" DOUBLE PRECISION DEFAULT 0,
    "sgst" DOUBLE PRECISION DEFAULT 0,
    "igst" DOUBLE PRECISION DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseInvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseInvoiceMatch" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "matchType" "MatchType" NOT NULL,
    "matchScore" DOUBLE PRECISION NOT NULL,
    "qtyMatch" BOOLEAN NOT NULL DEFAULT false,
    "valueMatch" BOOLEAN NOT NULL DEFAULT false,
    "gstMatch" BOOLEAN NOT NULL DEFAULT false,
    "discrepancies" JSONB,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseInvoiceMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesInvoice" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "cgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "igst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tcs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "roundOff" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalWithGst" DOUBLE PRECISION NOT NULL,
    "customerGstin" TEXT,
    "irn" TEXT,
    "eWayBillNo" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "amountReceived" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sourceFileId" TEXT,
    "extractedData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesInvoiceLineItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "skuId" TEXT,
    "lineNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "hsnCode" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'PCS',
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "discountPercent" DOUBLE PRECISION DEFAULT 0,
    "discountAmount" DOUBLE PRECISION DEFAULT 0,
    "taxableAmount" DOUBLE PRECISION NOT NULL,
    "gstRate" DOUBLE PRECISION,
    "cgst" DOUBLE PRECISION DEFAULT 0,
    "sgst" DOUBLE PRECISION DEFAULT 0,
    "igst" DOUBLE PRECISION DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesInvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankStatement" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "statementDate" TIMESTAMP(3),
    "fromDate" TIMESTAMP(3),
    "toDate" TIMESTAMP(3),
    "openingBalance" DOUBLE PRECISION,
    "closingBalance" DOUBLE PRECISION,
    "sourceFileId" TEXT,
    "status" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransaction" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "statementId" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "valueDate" TIMESTAMP(3),
    "description" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "debit" DOUBLE PRECISION,
    "credit" DOUBLE PRECISION,
    "balance" DOUBLE PRECISION,
    "transactionType" "BankTxnType",
    "matchStatus" "BankMatchStatus" NOT NULL DEFAULT 'UNMATCHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMatch" (
    "id" TEXT NOT NULL,
    "bankTxnId" TEXT NOT NULL,
    "purchaseInvoiceId" TEXT,
    "salesInvoiceId" TEXT,
    "matchedAmount" DOUBLE PRECISION NOT NULL,
    "matchType" "MatchType" NOT NULL,
    "matchScore" DOUBLE PRECISION NOT NULL,
    "discrepancy" DOUBLE PRECISION DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GSTReturn" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "returnType" "GSTReturnType" NOT NULL,
    "period" TEXT NOT NULL,
    "filingDate" TIMESTAMP(3),
    "sourceFileId" TEXT,
    "status" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GSTReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GSTReturnEntry" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "counterpartyGstin" TEXT NOT NULL,
    "counterpartyName" TEXT,
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "invoiceValue" DOUBLE PRECISION,
    "taxableValue" DOUBLE PRECISION,
    "cgst" DOUBLE PRECISION DEFAULT 0,
    "sgst" DOUBLE PRECISION DEFAULT 0,
    "igst" DOUBLE PRECISION DEFAULT 0,
    "cess" DOUBLE PRECISION DEFAULT 0,
    "placeOfSupply" TEXT,
    "reverseCharge" BOOLEAN NOT NULL DEFAULT false,
    "itcAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GSTReturnEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GSTMatch" (
    "id" TEXT NOT NULL,
    "gstEntryId" TEXT NOT NULL,
    "purchaseInvoiceId" TEXT,
    "salesInvoiceId" TEXT,
    "matchType" "MatchType" NOT NULL,
    "matchScore" DOUBLE PRECISION NOT NULL,
    "valueDiff" DOUBLE PRECISION DEFAULT 0,
    "gstDiff" DOUBLE PRECISION DEFAULT 0,
    "itcStatus" "ITCStatus",
    "discrepancies" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GSTMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditDebitNote" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "noteType" "NoteType" NOT NULL,
    "noteNumber" TEXT NOT NULL,
    "noteDate" TIMESTAMP(3) NOT NULL,
    "vendorId" TEXT,
    "customerId" TEXT,
    "reason" TEXT,
    "originalInvoiceRef" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "cgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "igst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalWithGst" DOUBLE PRECISION NOT NULL,
    "status" "NoteStatus" NOT NULL DEFAULT 'PENDING',
    "sourceFileId" TEXT,
    "extractedData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditDebitNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountTerm" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "termType" "DiscountTermType" NOT NULL,
    "description" TEXT NOT NULL,
    "slabs" JSONB,
    "flatPercent" DOUBLE PRECISION,
    "flatAmount" DOUBLE PRECISION,
    "applicableSkus" TEXT[],
    "minOrderValue" DOUBLE PRECISION,
    "paymentWithinDays" INTEGER,
    "latePaymentPenaltyPercent" DOUBLE PRECISION,
    "lateDeliveryPenaltyPerDay" DOUBLE PRECISION,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountAudit" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "termId" TEXT,
    "expectedDiscount" DOUBLE PRECISION NOT NULL,
    "actualDiscount" DOUBLE PRECISION NOT NULL,
    "difference" DOUBLE PRECISION NOT NULL,
    "status" "AuditStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscountAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventorySnapshot" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "openingQty" DOUBLE PRECISION NOT NULL,
    "purchasedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "soldQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adjustmentQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "closingQty" DOUBLE PRECISION NOT NULL,
    "expectedClosing" DOUBLE PRECISION NOT NULL,
    "discrepancy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventorySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorLedgerConfirmation" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "ourBalance" DOUBLE PRECISION NOT NULL,
    "vendorBalance" DOUBLE PRECISION,
    "difference" DOUBLE PRECISION,
    "status" "ConfirmationStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "emailMessageId" TEXT,
    "respondedAt" TIMESTAMP(3),
    "responseNotes" TEXT,
    "ledgerPdfPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorLedgerConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerLedgerConfirmation" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "ourBalance" DOUBLE PRECISION NOT NULL,
    "customerBalance" DOUBLE PRECISION,
    "difference" DOUBLE PRECISION,
    "status" "ConfirmationStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "emailMessageId" TEXT,
    "respondedAt" TIMESTAMP(3),
    "responseNotes" TEXT,
    "ledgerPdfPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerLedgerConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReminder" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "salesInvoiceId" TEXT,
    "reminderNumber" INTEGER NOT NULL,
    "dueAmount" DOUBLE PRECISION NOT NULL,
    "daysOverdue" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3),
    "emailMessageId" TEXT,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadedFile" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "extractedText" TEXT,
    "aiExtractionResult" JSONB,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadedFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "bodyText" TEXT,
    "variables" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationRun" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "runType" "ReconcRunType" NOT NULL,
    "status" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "summary" JSONB,
    "triggeredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReconciliationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_gstin_key" ON "Organization"("gstin");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSettings_orgId_key" ON "OrganizationSettings"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_orgId_erpVendorCode_key" ON "Vendor"("orgId", "erpVendorCode");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_orgId_gstin_key" ON "Vendor"("orgId", "gstin");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_orgId_erpCustomerCode_key" ON "Customer"("orgId", "erpCustomerCode");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_orgId_gstin_key" ON "Customer"("orgId", "gstin");

-- CreateIndex
CREATE UNIQUE INDEX "SKU_orgId_skuCode_key" ON "SKU"("orgId", "skuCode");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_orgId_poNumber_key" ON "PurchaseOrder"("orgId", "poNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseInvoice_orgId_vendorId_invoiceNumber_key" ON "PurchaseInvoice"("orgId", "vendorId", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SalesInvoice_orgId_invoiceNumber_key" ON "SalesInvoice"("orgId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "BankTransaction_orgId_transactionDate_idx" ON "BankTransaction"("orgId", "transactionDate");

-- CreateIndex
CREATE INDEX "BankTransaction_orgId_referenceNumber_idx" ON "BankTransaction"("orgId", "referenceNumber");

-- CreateIndex
CREATE INDEX "PaymentMatch_purchaseInvoiceId_idx" ON "PaymentMatch"("purchaseInvoiceId");

-- CreateIndex
CREATE INDEX "PaymentMatch_salesInvoiceId_idx" ON "PaymentMatch"("salesInvoiceId");

-- CreateIndex
CREATE INDEX "GSTReturnEntry_counterpartyGstin_invoiceNumber_idx" ON "GSTReturnEntry"("counterpartyGstin", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CreditDebitNote_orgId_noteType_noteNumber_key" ON "CreditDebitNote"("orgId", "noteType", "noteNumber");

-- CreateIndex
CREATE INDEX "InventorySnapshot_orgId_snapshotDate_idx" ON "InventorySnapshot"("orgId", "snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "InventorySnapshot_orgId_skuId_snapshotDate_key" ON "InventorySnapshot"("orgId", "skuId", "snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_orgId_templateKey_key" ON "EmailTemplate"("orgId", "templateKey");

-- CreateIndex
CREATE INDEX "AuditLog_orgId_entityType_entityId_idx" ON "AuditLog"("orgId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_orgId_createdAt_idx" ON "AuditLog"("orgId", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationSettings" ADD CONSTRAINT "OrganizationSettings_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SKU" ADD CONSTRAINT "SKU_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POLineItem" ADD CONSTRAINT "POLineItem_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POLineItem" ADD CONSTRAINT "POLineItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "SKU"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoiceLineItem" ADD CONSTRAINT "PurchaseInvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PurchaseInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoiceLineItem" ADD CONSTRAINT "PurchaseInvoiceLineItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "SKU"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoiceMatch" ADD CONSTRAINT "PurchaseInvoiceMatch_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PurchaseInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoiceMatch" ADD CONSTRAINT "PurchaseInvoiceMatch_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoiceLineItem" ADD CONSTRAINT "SalesInvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "SalesInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoiceLineItem" ADD CONSTRAINT "SalesInvoiceLineItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "SKU"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatement" ADD CONSTRAINT "BankStatement_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatement" ADD CONSTRAINT "BankStatement_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "BankStatement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMatch" ADD CONSTRAINT "PaymentMatch_bankTxnId_fkey" FOREIGN KEY ("bankTxnId") REFERENCES "BankTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMatch" ADD CONSTRAINT "PaymentMatch_purchaseInvoiceId_fkey" FOREIGN KEY ("purchaseInvoiceId") REFERENCES "PurchaseInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMatch" ADD CONSTRAINT "PaymentMatch_salesInvoiceId_fkey" FOREIGN KEY ("salesInvoiceId") REFERENCES "SalesInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GSTReturn" ADD CONSTRAINT "GSTReturn_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GSTReturn" ADD CONSTRAINT "GSTReturn_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GSTReturnEntry" ADD CONSTRAINT "GSTReturnEntry_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "GSTReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GSTMatch" ADD CONSTRAINT "GSTMatch_gstEntryId_fkey" FOREIGN KEY ("gstEntryId") REFERENCES "GSTReturnEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GSTMatch" ADD CONSTRAINT "GSTMatch_purchaseInvoiceId_fkey" FOREIGN KEY ("purchaseInvoiceId") REFERENCES "PurchaseInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GSTMatch" ADD CONSTRAINT "GSTMatch_salesInvoiceId_fkey" FOREIGN KEY ("salesInvoiceId") REFERENCES "SalesInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditDebitNote" ADD CONSTRAINT "CreditDebitNote_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditDebitNote" ADD CONSTRAINT "CreditDebitNote_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditDebitNote" ADD CONSTRAINT "CreditDebitNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditDebitNote" ADD CONSTRAINT "CreditDebitNote_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountTerm" ADD CONSTRAINT "DiscountTerm_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountTerm" ADD CONSTRAINT "DiscountTerm_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountAudit" ADD CONSTRAINT "DiscountAudit_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PurchaseInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySnapshot" ADD CONSTRAINT "InventorySnapshot_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySnapshot" ADD CONSTRAINT "InventorySnapshot_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "SKU"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorLedgerConfirmation" ADD CONSTRAINT "VendorLedgerConfirmation_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLedgerConfirmation" ADD CONSTRAINT "CustomerLedgerConfirmation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReminder" ADD CONSTRAINT "PaymentReminder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReminder" ADD CONSTRAINT "PaymentReminder_salesInvoiceId_fkey" FOREIGN KEY ("salesInvoiceId") REFERENCES "SalesInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationRun" ADD CONSTRAINT "ReconciliationRun_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
