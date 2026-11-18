-- Shahobchalar va xodimni shahobchaga biriktirish.
CREATE TABLE "shahobchalar" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shahobchalar_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shahobchalar_province_name_key" ON "shahobchalar"("province", "name");
CREATE INDEX "shahobchalar_province_idx" ON "shahobchalar"("province");

ALTER TABLE "jobs" ADD COLUMN "shahobchaId" TEXT;
CREATE INDEX "jobs_shahobchaId_idx" ON "jobs"("shahobchaId");

ALTER TABLE "jobs" ADD CONSTRAINT "jobs_shahobchaId_fkey" FOREIGN KEY ("shahobchaId") REFERENCES "shahobchalar"("id") ON DELETE SET NULL ON UPDATE CASCADE;
