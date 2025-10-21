-- 08-WORK-HISTORY-SERVICE.sql
-- Work History Service Migration - Creates work history service tables
-- Run after: 00-create-enums.sql

-- ============================================================================
-- WORK HISTORY SERVICE TABLES
-- ============================================================================

-- Disable triggers temporarily
SET session_replication_role = replica;

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS "workEvents";
DROP TABLE IF EXISTS "workSummaries";
DROP TABLE IF EXISTS "workSkillProficiencies";
DROP TABLE IF EXISTS "workAchievements";
DROP TABLE IF EXISTS "workPortfolioItems";
DROP TABLE IF EXISTS "workRecords";

CREATE TABLE "workRecords" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "skills" TEXT[] NOT NULL,
    "completedAt" TIMESTAMPTZ(6) NOT NULL,
    "deliveryTime" INTEGER NOT NULL,
    "budgetRange" TEXT NOT NULL,
    "actualBudget" DOUBLE PRECISION,
    "clientRating" DOUBLE PRECISION,
    "clientFeedback" TEXT,
    "onTimeDelivery" BOOLEAN DEFAULT false,
    "withinBudget" BOOLEAN DEFAULT true,
    "verified" BOOLEAN DEFAULT false,
    "verifiedBy" TEXT,
    "verificationDate" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workRecords_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workPortfolioItems" (
    "id" TEXT NOT NULL,
    "workRecordId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "fileSize" INTEGER,
    "format" TEXT,
    "isPublic" BOOLEAN DEFAULT true,
    "displayOrder" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workPortfolioItems_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workAchievements" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "metric" TEXT,
    "value" DOUBLE PRECISION,
    "threshold" DOUBLE PRECISION,
    "iconUrl" TEXT,
    "badgeUrl" TEXT,
    "color" TEXT,
    "verified" BOOLEAN DEFAULT false,
    "verifiedBy" TEXT,
    "achievedAt" TIMESTAMPTZ(6) NOT NULL,
    "expiresAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workAchievements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workSkillProficiencies" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "projectCount" INTEGER DEFAULT 0,
    "totalRating" DOUBLE PRECISION DEFAULT 0,
    "averageRating" DOUBLE PRECISION DEFAULT 0,
    "lastUsed" TIMESTAMPTZ(6),
    "recentProjects" TEXT[] DEFAULT ARRAY[]::"text"[],
    "improvementRate" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workSkillProficiencies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workSummaries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalProjects" INTEGER DEFAULT 0,
    "activeProjects" INTEGER DEFAULT 0,
    "completedProjects" INTEGER DEFAULT 0,
    "averageRating" DOUBLE PRECISION DEFAULT 0,
    "totalRatings" INTEGER DEFAULT 0,
    "fiveStarCount" INTEGER DEFAULT 0,
    "fourStarCount" INTEGER DEFAULT 0,
    "onTimeDeliveryRate" DOUBLE PRECISION DEFAULT 0,
    "averageDeliveryTime" DOUBLE PRECISION DEFAULT 0,
    "fastestDelivery" INTEGER,
    "totalEarnings" DOUBLE PRECISION DEFAULT 0,
    "averageProjectValue" DOUBLE PRECISION DEFAULT 0,
    "highestProjectValue" DOUBLE PRECISION DEFAULT 0,
    "currentStreak" INTEGER DEFAULT 0,
    "longestStreak" INTEGER DEFAULT 0,
    "lastCompletionDate" TIMESTAMPTZ(6),
    "topSkills" TEXT[] DEFAULT ARRAY[]::"text"[],
    "topCategories" TEXT[] DEFAULT ARRAY[]::"text"[],
    "lastActiveDate" TIMESTAMPTZ(6),
    "projectsThisMonth" INTEGER DEFAULT 0,
    "projectsThisYear" INTEGER DEFAULT 0,
    "verificationLevel" TEXT DEFAULT 'unverified',
    "verifiedProjectCount" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workSummaries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workEvents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workRecordId" TEXT,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "reputationImpact" DOUBLE PRECISION,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workEvents_pkey" PRIMARY KEY ("id")
);

-- Re-enable triggers
SET session_replication_role = DEFAULT;

SELECT 'SUCCESS: Work history service tables created!' as result;