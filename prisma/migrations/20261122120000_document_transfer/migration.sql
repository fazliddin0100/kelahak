-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "pendingTransferAt" TIMESTAMP(3),
ADD COLUMN     "pendingTransferNote" TEXT,
ADD COLUMN     "pendingTransferToId" TEXT;

-- CreateIndex
CREATE INDEX "documents_pendingTransferToId_idx" ON "documents"("pendingTransferToId");

