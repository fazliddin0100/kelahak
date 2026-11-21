-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "registeredAt" TIMESTAMP(3),
ADD COLUMN     "registeredById" TEXT;

-- CreateTable
CREATE TABLE "print_requests" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "region" TEXT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "decisionNote" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "lastDownloadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "print_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "print_requests_assigneeId_status_idx" ON "print_requests"("assigneeId", "status");

-- CreateIndex
CREATE INDEX "print_requests_region_status_idx" ON "print_requests"("region", "status");

-- CreateIndex
CREATE INDEX "print_requests_documentId_idx" ON "print_requests"("documentId");

-- CreateIndex
CREATE INDEX "print_requests_requesterId_idx" ON "print_requests"("requesterId");

-- AddForeignKey
ALTER TABLE "print_requests" ADD CONSTRAINT "print_requests_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_requests" ADD CONSTRAINT "print_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_requests" ADD CONSTRAINT "print_requests_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

