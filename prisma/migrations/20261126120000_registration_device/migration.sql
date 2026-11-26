-- DropIndex
DROP INDEX "devices_mac_key";

-- AlterTable
ALTER TABLE "devices" ADD COLUMN     "agentKeySha256" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "diskModel" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "diskSerial" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "macs" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'none';

-- CreateIndex
CREATE INDEX "devices_mac_idx" ON "devices"("mac");

