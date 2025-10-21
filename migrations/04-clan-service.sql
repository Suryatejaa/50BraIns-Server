-- 04-CLAN-SERVICE.sql
-- Clan Service Migration - Creates clan service tables
-- Run after: 00-create-enums.sql

-- ============================================================================
-- CLAN SERVICE TABLES
-- ============================================================================

-- Disable triggers temporarily
SET session_replication_role = replica;

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS "clanMessages";
DROP TABLE IF EXISTS "clanMembers";
DROP TABLE IF EXISTS "clans";

CREATE TABLE "clans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tagline" TEXT,
    "visibility" TEXT DEFAULT 'PUBLIC',
    "isVerified" BOOLEAN DEFAULT false,
    "isActive" BOOLEAN DEFAULT true,
    "email" TEXT,
    "website" TEXT,
    "instagramHandle" TEXT,
    "twitterHandle" TEXT,
    "linkedinHandle" TEXT,
    "requiresApproval" BOOLEAN DEFAULT true,
    "isPaidMembership" BOOLEAN DEFAULT false,
    "membershipFee" DOUBLE PRECISION,
    "maxMembers" INTEGER DEFAULT 255,
    "primaryCategory" TEXT DEFAULT 'General',
    "categories" TEXT[] DEFAULT ARRAY[]::"text"[],
    "skills" TEXT[] DEFAULT ARRAY[]::"text"[],
    "location" TEXT,
    "timezone" TEXT,
    "memberCount" INTEGER DEFAULT 1,
    "reputationScore" INTEGER DEFAULT 0,
    "portfolioImages" TEXT[] DEFAULT ARRAY[]::"text"[],
    "portfolioVideos" TEXT[] DEFAULT ARRAY[]::"text"[],
    "showcaseProjects" TEXT[] DEFAULT ARRAY[]::"text"[],
    "headId" TEXT NOT NULL,
    "admins" TEXT[] DEFAULT ARRAY[]::"text"[],
    "memberIds" TEXT[] DEFAULT ARRAY[]::"text"[],
    "pendingRequests" TEXT[] DEFAULT ARRAY[]::"text"[],
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clanMembers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clanId" TEXT NOT NULL,
    "role" TEXT DEFAULT 'MEMBER',
    "status" TEXT DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clanMembers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clanMessages" (
    "id" TEXT NOT NULL,
    "clanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "messageType" TEXT DEFAULT 'TEXT',
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "clientMessageId" TEXT,
    "isDelivered" BOOLEAN DEFAULT false,
    "deliveredAt" TIMESTAMPTZ(6),
    "readBy" JSONB[] DEFAULT ARRAY[]::jsonb[],
    "readAt" JSONB[] DEFAULT ARRAY[]::jsonb[],
    "isDeleted" BOOLEAN DEFAULT false,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" TEXT,

    CONSTRAINT "clanMessages_pkey" PRIMARY KEY ("id")
);

-- Re-enable triggers
SET session_replication_role = DEFAULT;

SELECT 'SUCCESS: Clan service tables created!' as result;