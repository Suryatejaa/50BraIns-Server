-- 09-SOCIAL-MEDIA-SERVICE.sql
-- Social Media Service Migration - Creates social media service tables
-- Run after: 00-create-enums.sql

-- ============================================================================
-- SOCIAL MEDIA SERVICE TABLES
-- ============================================================================

-- Disable triggers temporarily
SET session_replication_role = replica;

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS "socialMediaProfiles";

CREATE TABLE "socialMediaProfiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "profileUrl" TEXT NOT NULL,
    "followers" INTEGER DEFAULT 0,
    "following" INTEGER DEFAULT 0,
    "posts" INTEGER DEFAULT 0,
    "engagement" DOUBLE PRECISION,
    "verified" BOOLEAN DEFAULT false,
    "lastSynced" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "socialMediaAccounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "socialMediaSnapshots" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "followers" INTEGER NOT NULL,
    "following" INTEGER NOT NULL,
    "posts" INTEGER NOT NULL,
    "engagement" DOUBLE PRECISION,
    "platformMetrics" JSONB,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "socialMediaSnapshots_pkey" PRIMARY KEY ("id")
);

-- Re-enable triggers
SET session_replication_role = DEFAULT;

SELECT 'SUCCESS: Social media service tables created!' as result;