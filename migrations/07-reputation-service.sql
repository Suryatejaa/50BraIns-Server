-- 07-REPUTATION-SERVICE.sql
-- Reputation Service Migration - Creates reputation service tables
-- Run after: 00-create-enums.sql

-- ============================================================================
-- REPUTATION SERVICE TABLES
-- ============================================================================

-- Disable triggers temporarily
SET session_replication_role = replica;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS "reputationScoreConfig" CASCADE;
DROP TABLE IF EXISTS "reputationLeaderboardCache" CASCADE;
DROP TABLE IF EXISTS "reputationActivityLogs" CASCADE;
DROP TABLE IF EXISTS "reputationScoreHistory" CASCADE;
DROP TABLE IF EXISTS "reputationClanReputations" CASCADE;
DROP TABLE IF EXISTS "reputationScores" CASCADE;

CREATE TABLE "reputationScores" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalScore" INTEGER DEFAULT 0,
    "reliabilityScore" INTEGER DEFAULT 0,
    "qualityScore" INTEGER DEFAULT 0,
    "communicationScore" INTEGER DEFAULT 0,
    "timelinessScore" INTEGER DEFAULT 0,
    "overallRating" DOUBLE PRECISION DEFAULT 0,
    "totalGigs" INTEGER DEFAULT 0,
    "completedGigs" INTEGER DEFAULT 0,
    "cancelledGigs" INTEGER DEFAULT 0,
    "avgDeliveryTime" DOUBLE PRECISION DEFAULT 0,
    "onTimeDeliveryRate" DOUBLE PRECISION DEFAULT 0,
    "clientSatisfactionRate" DOUBLE PRECISION DEFAULT 0,
    "responseTime" DOUBLE PRECISION DEFAULT 0,
    "level" TEXT DEFAULT 'NEWCOMER',
    "rank" INTEGER DEFAULT 0,
    "badges" TEXT[] DEFAULT ARRAY[]::"text"[],
    "lastUpdated" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputationScores_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reputationClanReputations" (
    "id" TEXT NOT NULL,
    "clanId" TEXT NOT NULL,
    "totalScore" INTEGER DEFAULT 0,
    "avgMemberScore" DOUBLE PRECISION DEFAULT 0,
    "totalGigs" INTEGER DEFAULT 0,
    "successRate" DOUBLE PRECISION DEFAULT 0,
    "teamworkScore" INTEGER DEFAULT 0,
    "leadershipScore" INTEGER DEFAULT 0,
    "badges" TEXT[] DEFAULT ARRAY[]::"text"[],
    "level" TEXT DEFAULT 'NEWCOMER',
    "rank" INTEGER DEFAULT 0,
    "lastUpdated" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputationClanReputations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reputationScoreHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "clanId" TEXT,
    "eventType" TEXT NOT NULL,
    "scoreChange" INTEGER NOT NULL,
    "newScore" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "relatedId" TEXT,
    "relatedType" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputationScoreHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reputationActivityLogs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "clanId" TEXT,
    "action" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "pointsAwarded" INTEGER DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputationActivityLogs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reputationLeaderboardCache" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "userId" TEXT,
    "clanId" TEXT,
    "score" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "metadata" JSONB,
    "calculatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputationLeaderboardCache_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reputationScoreConfig" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "basePoints" INTEGER NOT NULL,
    "multiplier" DOUBLE PRECISION DEFAULT 1,
    "maxPoints" INTEGER,
    "minPoints" INTEGER,
    "isActive" BOOLEAN DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputationScoreConfig_pkey" PRIMARY KEY ("id")
);

-- Insert default reputation score config (only if table is empty)
INSERT INTO "reputationScoreConfig" ("id", "eventType", "basePoints", "description") 
SELECT 'config_1', 'gig_completed', 100, 'Points awarded for completing a gig'
WHERE NOT EXISTS (SELECT 1 FROM "reputationScoreConfig" WHERE "id" = 'config_1');

INSERT INTO "reputationScoreConfig" ("id", "eventType", "basePoints", "description") 
SELECT 'config_2', 'gig_rated_5_star', 50, 'Bonus points for receiving a 5-star rating'
WHERE NOT EXISTS (SELECT 1 FROM "reputationScoreConfig" WHERE "id" = 'config_2');

INSERT INTO "reputationScoreConfig" ("id", "eventType", "basePoints", "description") 
SELECT 'config_3', 'gig_on_time', 25, 'Bonus points for on-time delivery'
WHERE NOT EXISTS (SELECT 1 FROM "reputationScoreConfig" WHERE "id" = 'config_3');

INSERT INTO "reputationScoreConfig" ("id", "eventType", "basePoints", "description") 
SELECT 'config_4', 'gig_cancelled', -50, 'Points deducted for cancelling a gig'
WHERE NOT EXISTS (SELECT 1 FROM "reputationScoreConfig" WHERE "id" = 'config_4');

INSERT INTO "reputationScoreConfig" ("id", "eventType", "basePoints", "description") 
SELECT 'config_5', 'profile_verified', 200, 'Points awarded for profile verification'
WHERE NOT EXISTS (SELECT 1 FROM "reputationScoreConfig" WHERE "id" = 'config_5');

-- Re-enable triggers
SET session_replication_role = DEFAULT;

SELECT 'SUCCESS: Reputation service tables created!' as result;