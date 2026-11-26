-- E-IMZO kaliti turgan fleshka (seriya) va kalit fayli SHA-256
ALTER TABLE "user_eimzo_devices" ADD COLUMN "usbSerial" TEXT NOT NULL DEFAULT '';
ALTER TABLE "user_eimzo_devices" ADD COLUMN "usbSerialReliable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_eimzo_devices" ADD COLUMN "usbModel" TEXT NOT NULL DEFAULT '';
ALTER TABLE "user_eimzo_devices" ADD COLUMN "keySha256" TEXT NOT NULL DEFAULT '';
