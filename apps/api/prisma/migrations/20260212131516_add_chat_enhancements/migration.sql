-- AlterTable
ALTER TABLE "BankStatement" ADD COLUMN     "chatSourceMessageId" TEXT,
ADD COLUMN     "transactionCount" INTEGER;

-- AlterTable
ALTER TABLE "ChatAttachment" ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "documentType" TEXT,
ADD COLUMN     "processingEvents" JSONB,
ADD COLUMN     "savedEntityId" TEXT,
ADD COLUMN     "savedEntityType" TEXT;

-- AlterTable
ALTER TABLE "PurchaseInvoice" ADD COLUMN     "chatSourceMessageId" TEXT;

-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "chatSourceMessageId" TEXT;

-- AlterTable
ALTER TABLE "SalesInvoice" ADD COLUMN     "chatSourceMessageId" TEXT,
ADD COLUMN     "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "ChatUserAction" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messageId" TEXT,
    "actionType" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "actionData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatUserAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatUserAction_conversationId_idx" ON "ChatUserAction"("conversationId");
