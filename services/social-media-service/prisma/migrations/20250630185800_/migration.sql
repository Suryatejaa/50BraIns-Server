-- CreateTable
CREATE TABLE "SocialMediaAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "profileUrl" TEXT NOT NULL,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "following" INTEGER NOT NULL DEFAULT 0,
    "posts" INTEGER NOT NULL DEFAULT 0,
    "engagement" DOUBLE PRECISION,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "lastSynced" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialMediaAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialMediaSnapshot" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "followers" INTEGER NOT NULL,
    "following" INTEGER NOT NULL,
    "posts" INTEGER NOT NULL,
    "engagement" DOUBLE PRECISION,
    "platformMetrics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialMediaSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialMediaAccount_profileUrl_key" ON "SocialMediaAccount"("profileUrl");

-- CreateIndex
CREATE INDEX "SocialMediaAccount_userId_idx" ON "SocialMediaAccount"("userId");

-- CreateIndex
CREATE INDEX "SocialMediaAccount_platform_idx" ON "SocialMediaAccount"("platform");

-- CreateIndex
CREATE INDEX "SocialMediaAccount_followers_idx" ON "SocialMediaAccount"("followers");

-- CreateIndex
CREATE UNIQUE INDEX "SocialMediaAccount_userId_platform_key" ON "SocialMediaAccount"("userId", "platform");

-- CreateIndex
CREATE INDEX "SocialMediaSnapshot_accountId_idx" ON "SocialMediaSnapshot"("accountId");

-- CreateIndex
CREATE INDEX "SocialMediaSnapshot_createdAt_idx" ON "SocialMediaSnapshot"("createdAt");

-- AddForeignKey
ALTER TABLE "SocialMediaSnapshot" ADD CONSTRAINT "SocialMediaSnapshot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "SocialMediaAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
