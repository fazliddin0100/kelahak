-- CreateTable
CREATE TABLE "document_templates" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleKey" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "sourceDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_templates_sourceDocumentId_idx" ON "document_templates"("sourceDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "document_templates_ownerId_titleKey_key" ON "document_templates"("ownerId", "titleKey");

-- AddForeignKey
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

