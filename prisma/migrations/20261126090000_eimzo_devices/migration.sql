-- AlterTable
ALTER TABLE "document_signatures" ADD COLUMN     "deviceId" TEXT,
ADD COLUMN     "deviceMessage" TEXT,
ADD COLUMN     "deviceSignature" TEXT;

-- CreateTable
CREATE TABLE "user_eimzo_devices" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "publicKeySha256" TEXT NOT NULL,
    "macs" TEXT NOT NULL,
    "primaryMac" TEXT NOT NULL,
    "diskSerial" TEXT NOT NULL,
    "diskModel" TEXT NOT NULL DEFAULT '',
    "diskSerialReliable" BOOLEAN NOT NULL DEFAULT true,
    "hardwareKey" BOOLEAN NOT NULL DEFAULT false,
    "hostname" TEXT NOT NULL DEFAULT '',
    "certificateId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,

    CONSTRAINT "user_eimzo_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_eimzo_devices_userId_status_idx" ON "user_eimzo_devices"("userId", "status");

-- CreateIndex
CREATE INDEX "user_eimzo_devices_publicKeySha256_idx" ON "user_eimzo_devices"("publicKeySha256");

-- AddForeignKey
ALTER TABLE "user_eimzo_devices" ADD CONSTRAINT "user_eimzo_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_signatures" ADD CONSTRAINT "document_signatures_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "user_eimzo_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

