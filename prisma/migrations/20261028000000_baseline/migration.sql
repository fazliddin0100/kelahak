-- CreateEnum
CREATE TYPE "DbRole" AS ENUM ('admin', 'superAdmin', 'user', 'commander', 'deputyCommander', 'departmentCommander', 'departmentDeputy');

-- CreateEnum
CREATE TYPE "NomeklaturaStatus" AS ENUM ('CREATED', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SecurityEventType" AS ENUM ('visit', 'login_failed', 'login_success', 'rate_limit', 'suspicious', 'waf_block', 'ddos');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fName" TEXT NOT NULL,
    "sName" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auths" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "role" "DbRole" NOT NULL DEFAULT 'user',
    "province" TEXT NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "organ" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "militaryRank" TEXT NOT NULL,
    "isUserTrue" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "mac" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "hostname" TEXT,
    "note" TEXT,
    "lastSeen" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_devices" (
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,

    CONSTRAINT "user_devices_pkey" PRIMARY KEY ("userId","deviceId")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT,
    "grif" TEXT,
    "position" TEXT,
    "militaryRank" TEXT,
    "fullName" TEXT,
    "copyNumber" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "copyIndex" INTEGER,
    "copyTotal" INTEGER,
    "approvers" JSONB NOT NULL DEFAULT '[]',
    "sender" JSONB,
    "receiver" JSONB NOT NULL DEFAULT '[]',
    "author" JSONB,
    "bosSigned" JSONB,
    "forwardedSigner" JSONB,
    "forwardedTo" JSONB NOT NULL DEFAULT '[]',
    "ownerAcceptedBy" JSONB,
    "ownerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'yangi',
    "sharedWithAdmin" BOOLEAN NOT NULL DEFAULT false,
    "sentToCommander" BOOLEAN NOT NULL DEFAULT false,
    "sentToCommanderAt" TIMESTAMP(3),
    "submittedToKotibiyat" BOOLEAN NOT NULL DEFAULT false,
    "submittedToKotibiyatAt" TIMESTAMP(3),
    "createdByKotibiyat" BOOLEAN NOT NULL DEFAULT false,
    "nomenclatureId" TEXT,
    "registrationIndex" INTEGER,
    "year" INTEGER,
    "ownerRegion" TEXT,
    "sourceRegion" TEXT,
    "parentId" TEXT,
    "isCopy" BOOLEAN NOT NULL DEFAULT false,
    "forwardedById" TEXT,
    "forwardedAt" TIMESTAMP(3),
    "forwardedComment" TEXT,
    "currentViewIndex" INTEGER NOT NULL DEFAULT 0,
    "replyToId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "ownerAccepted" BOOLEAN NOT NULL DEFAULT false,
    "ownerAcceptedAt" TIMESTAMP(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_contents" (
    "documentId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_contents_pkey" PRIMARY KEY ("documentId")
);

-- CreateTable
CREATE TABLE "document_allowed_users" (
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "document_allowed_users_pkey" PRIMARY KEY ("documentId","userId")
);

-- CreateTable
CREATE TABLE "document_attachments" (
    "documentId" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,

    CONSTRAINT "document_attachments_pkey" PRIMARY KEY ("documentId","attachmentId")
);

-- CreateTable
CREATE TABLE "bolims" (
    "id" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "bolim" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bolims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bolinmas" (
    "id" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "bolinma" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bolinmas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nomeklatura" (
    "id" TEXT NOT NULL,
    "registrationIndex" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "grif" TEXT NOT NULL,
    "saqlashMuddati" JSONB NOT NULL,
    "qonunTuri" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "ownerRegion" TEXT NOT NULL,
    "author" JSONB NOT NULL,
    "status" "NomeklaturaStatus" NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nomeklatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nomeklatura_bolim" (
    "nomeklaturaId" TEXT NOT NULL,
    "bolimId" TEXT NOT NULL,

    CONSTRAINT "nomeklatura_bolim_pkey" PRIMARY KEY ("nomeklaturaId","bolimId")
);

-- CreateTable
CREATE TABLE "nomeklatura_bolinma" (
    "nomeklaturaId" TEXT NOT NULL,
    "bolinmaId" TEXT NOT NULL,

    CONSTRAINT "nomeklatura_bolinma_pkey" PRIMARY KEY ("nomeklaturaId","bolinmaId")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "nomi" TEXT NOT NULL,
    "raqami" TEXT NOT NULL,
    "maxfiylik" TEXT NOT NULL,
    "sanasi" TEXT NOT NULL,
    "ownerRegion" TEXT NOT NULL,
    "userUploadId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registrations" (
    "id" TEXT NOT NULL,
    "registrationIndex" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "ownerRegion" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_counters" (
    "id" TEXT NOT NULL,
    "ownerRegion" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_logs" (
    "id" TEXT NOT NULL,
    "type" "SecurityEventType" NOT NULL,
    "ip" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'GET',
    "userAgent" TEXT,
    "loginHint" TEXT,
    "message" TEXT,
    "statusCode" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_ips" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "blockedBy" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blocked_ips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "personals_userId_key" ON "personals"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "auths_userId_key" ON "auths"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "auths_login_key" ON "auths"("login");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_userId_key" ON "jobs"("userId");

-- CreateIndex
CREATE INDEX "jobs_roleId_idx" ON "jobs"("roleId");

-- CreateIndex
CREATE INDEX "jobs_department_idx" ON "jobs"("department");

-- CreateIndex
CREATE UNIQUE INDEX "devices_mac_key" ON "devices"("mac");

-- CreateIndex
CREATE INDEX "documents_ownerId_idx" ON "documents"("ownerId");

-- CreateIndex
CREATE INDEX "documents_status_idx" ON "documents"("status");

-- CreateIndex
CREATE INDEX "documents_ownerRegion_idx" ON "documents"("ownerRegion");

-- CreateIndex
CREATE INDEX "documents_ownerRegion_year_idx" ON "documents"("ownerRegion", "year");

-- CreateIndex
CREATE INDEX "documents_nomenclatureId_idx" ON "documents"("nomenclatureId");

-- CreateIndex
CREATE INDEX "documents_createdAt_idx" ON "documents"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "documents_forwardedById_idx" ON "documents"("forwardedById");

-- CreateIndex
CREATE INDEX "documents_parentId_idx" ON "documents"("parentId");

-- CreateIndex
CREATE INDEX "documents_year_ownerRegion_status_idx" ON "documents"("year", "ownerRegion", "status");

-- CreateIndex
CREATE INDEX "document_allowed_users_userId_idx" ON "document_allowed_users"("userId");

-- CreateIndex
CREATE INDEX "bolims_province_idx" ON "bolims"("province");

-- CreateIndex
CREATE INDEX "bolinmas_province_idx" ON "bolinmas"("province");

-- CreateIndex
CREATE INDEX "nomeklatura_ownerRegion_idx" ON "nomeklatura"("ownerRegion");

-- CreateIndex
CREATE INDEX "nomeklatura_ownerId_idx" ON "nomeklatura"("ownerId");

-- CreateIndex
CREATE INDEX "nomeklatura_status_idx" ON "nomeklatura"("status");

-- CreateIndex
CREATE INDEX "files_userUploadId_idx" ON "files"("userUploadId");

-- CreateIndex
CREATE INDEX "files_ownerRegion_idx" ON "files"("ownerRegion");

-- CreateIndex
CREATE INDEX "registrations_ownerRegion_year_idx" ON "registrations"("ownerRegion", "year");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_ownerRegion_year_documentId_key" ON "registrations"("ownerRegion", "year", "documentId");

-- CreateIndex
CREATE UNIQUE INDEX "registration_counters_ownerRegion_year_key" ON "registration_counters"("ownerRegion", "year");

-- CreateIndex
CREATE INDEX "security_logs_createdAt_idx" ON "security_logs"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "security_logs_type_createdAt_idx" ON "security_logs"("type", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "security_logs_ip_createdAt_idx" ON "security_logs"("ip", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "blocked_ips_ip_key" ON "blocked_ips"("ip");

-- CreateIndex
CREATE INDEX "blocked_ips_active_idx" ON "blocked_ips"("active");

-- AddForeignKey
ALTER TABLE "personals" ADD CONSTRAINT "personals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auths" ADD CONSTRAINT "auths_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_nomenclatureId_fkey" FOREIGN KEY ("nomenclatureId") REFERENCES "nomeklatura"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_forwardedById_fkey" FOREIGN KEY ("forwardedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_contents" ADD CONSTRAINT "document_contents_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_allowed_users" ADD CONSTRAINT "document_allowed_users_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_allowed_users" ADD CONSTRAINT "document_allowed_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_attachments" ADD CONSTRAINT "document_attachments_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_attachments" ADD CONSTRAINT "document_attachments_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nomeklatura" ADD CONSTRAINT "nomeklatura_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nomeklatura" ADD CONSTRAINT "nomeklatura_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nomeklatura_bolim" ADD CONSTRAINT "nomeklatura_bolim_nomeklaturaId_fkey" FOREIGN KEY ("nomeklaturaId") REFERENCES "nomeklatura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nomeklatura_bolim" ADD CONSTRAINT "nomeklatura_bolim_bolimId_fkey" FOREIGN KEY ("bolimId") REFERENCES "bolims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nomeklatura_bolinma" ADD CONSTRAINT "nomeklatura_bolinma_nomeklaturaId_fkey" FOREIGN KEY ("nomeklaturaId") REFERENCES "nomeklatura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nomeklatura_bolinma" ADD CONSTRAINT "nomeklatura_bolinma_bolinmaId_fkey" FOREIGN KEY ("bolinmaId") REFERENCES "bolinmas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_userUploadId_fkey" FOREIGN KEY ("userUploadId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

