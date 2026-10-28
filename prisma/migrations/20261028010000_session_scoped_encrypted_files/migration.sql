-- Session tracking for logout and inactivity-based upload finalization.
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pending_uploads" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_uploads_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "files" ALTER COLUMN "filePath" DROP NOT NULL;
ALTER TABLE "files" ADD COLUMN "mimeType" TEXT;
ALTER TABLE "files" ADD COLUMN "encryptedContent" BYTEA;

CREATE UNIQUE INDEX "pending_uploads_fileId_key" ON "pending_uploads"("fileId");
CREATE INDEX "user_sessions_userId_revokedAt_idx" ON "user_sessions"("userId", "revokedAt");
CREATE INDEX "user_sessions_revokedAt_lastActivityAt_idx" ON "user_sessions"("revokedAt", "lastActivityAt");
CREATE INDEX "pending_uploads_sessionId_createdAt_idx" ON "pending_uploads"("sessionId", "createdAt");
CREATE INDEX "pending_uploads_userId_idx" ON "pending_uploads"("userId");

ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pending_uploads" ADD CONSTRAINT "pending_uploads_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "user_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pending_uploads" ADD CONSTRAINT "pending_uploads_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pending_uploads" ADD CONSTRAINT "pending_uploads_fileId_fkey"
  FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
