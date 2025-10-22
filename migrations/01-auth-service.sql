-- 01-AUTH-SERVICE.sql
-- Auth Service Migration - Creates auth service tables
-- Run after: 00-create-enums.sql

-- ============================================================================
-- AUTH SERVICE TABLES
-- ============================================================================

-- Disable triggers temporarily
SET session_replication_role = replica;

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS "authAdminLogs";
DROP TABLE IF EXISTS "authRefreshTokens";
DROP TABLE IF EXISTS "authUsers";

-- Create main Users table first
CREATE TABLE "authUsers" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT,
    "roles" TEXT[] DEFAULT ARRAY['USER'],
    "status" TEXT DEFAULT 'PENDING_VERIFICATION',
    "isActive" BOOLEAN DEFAULT true,
    "emailVerified" BOOLEAN DEFAULT false,
    "emailVerifiedAt" TIMESTAMPTZ(6),
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "bio" TEXT,
    "location" TEXT,
    "profilePicture" TEXT,
    "coverImage" TEXT,
    "instagramHandle" TEXT,
    "twitterHandle" TEXT,
    "linkedinHandle" TEXT,
    "youtubeHandle" TEXT,
    "website" TEXT,
    "contentCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "primaryNiche" TEXT,
    "primaryPlatform" TEXT,
    "estimatedFollowers" INTEGER,
    "companyName" TEXT,
    "companyType" TEXT,
    "industry" TEXT,
    "gstNumber" TEXT,
    "companyWebsite" TEXT,
    "marketingBudget" TEXT,
    "targetAudience" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "campaignTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "designationTitle" TEXT,
    "crewSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "experienceLevel" TEXT,
    "equipmentOwned" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "portfolioUrl" TEXT,
    "hourlyRate" INTEGER,
    "availability" TEXT,
    "workStyle" TEXT,
    "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "twoFactorSecret" TEXT,
    "twoFactorEnabled" BOOLEAN DEFAULT false,
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMPTZ(6),
    "emailVerificationToken" TEXT,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMPTZ(6),
    "lastActiveAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "isBanned" BOOLEAN DEFAULT false,
    "banReason" TEXT,
    "banExpiresAt" TIMESTAMPTZ(6),
    "bannedAt" TIMESTAMPTZ(6),
    "bannedBy" TEXT,
    "showContact" BOOLEAN DEFAULT false,

    CONSTRAINT "authUsers_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes for Users table
CREATE UNIQUE INDEX IF NOT EXISTS "authUsers_email_key" ON "authUsers"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "authUsers_username_key" ON "authUsers"("username");
CREATE INDEX IF NOT EXISTS "idx_auth_users_email" ON "authUsers"("email");
CREATE INDEX IF NOT EXISTS "idx_auth_users_status" ON "authUsers"("status");
CREATE INDEX IF NOT EXISTS "idx_auth_users_username" ON "authUsers"("username");

CREATE TABLE "authRefreshTokens" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "authRefreshTokens_pkey" PRIMARY KEY ("id")
);

-- Create unique index for refresh tokens
CREATE UNIQUE INDEX IF NOT EXISTS "authRefreshTokens_token_key" ON "authRefreshTokens"("token");

CREATE TABLE "authAdminLogs" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "adminId" TEXT NOT NULL,
    "targetId" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "reason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authAdminLogs_pkey" PRIMARY KEY ("id")
);

-- Re-enable triggers
SET session_replication_role = DEFAULT;

SELECT 'SUCCESS: Auth service tables created!' as result;