-- E-IMZO: hujjatlarga qo'yilgan kriptografik imzolar
-- CreateTable
CREATE TABLE "document_signatures" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "fingerprint256" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "signedMessage" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_signatures_documentId_signedAt_idx" ON "document_signatures"("documentId", "signedAt");

-- CreateIndex
CREATE INDEX "document_signatures_userId_idx" ON "document_signatures"("userId");

-- AddForeignKey
ALTER TABLE "document_signatures" ADD CONSTRAINT "document_signatures_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_signatures" ADD CONSTRAINT "document_signatures_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_signatures" ADD CONSTRAINT "document_signatures_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "user_certificates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

