-- CreateTable
CREATE TABLE "eimzo_key_packages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "shahobcha" TEXT NOT NULL,
    "keyFile" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eimzo_key_packages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "eimzo_key_packages_userId_key" ON "eimzo_key_packages"("userId");

-- AddForeignKey
ALTER TABLE "eimzo_key_packages" ADD CONSTRAINT "eimzo_key_packages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
