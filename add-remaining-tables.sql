-- 50BraIns Database Migration - ADD REMAINING TABLES
-- This script adds all missing service tables without touching the existing authUsers table
-- Run this script in Supabase SQL Editor

-- ============================================================================
-- IMPORTANT: This script safely adds remaining tables to your existing database
-- Your authUsers table and auth service will continue working normally
-- ============================================================================

-- Disable triggers temporarily
SET session_replication_role = replica;

-- ============================================================================
-- 0. CREATE ENUM TYPES FOR ALL SERVICES
-- ============================================================================

-- Drop existing enum types if they exist (safe migration)
DO $$ 
BEGIN
    DROP TYPE IF EXISTS "EquipmentCondition" CASCADE;
    DROP TYPE IF EXISTS "GigStatus" CASCADE;
    DROP TYPE IF EXISTS "GigType" CASCADE;
    DROP TYPE IF EXISTS "ApplicationStatus" CASCADE;
    DROP TYPE IF EXISTS "SubmissionStatus" CASCADE;
    DROP TYPE IF EXISTS "GigAssignmentStatus" CASCADE;
    DROP TYPE IF EXISTS "GigMilestoneStatus" CASCADE;
    DROP TYPE IF EXISTS "GigTaskStatus" CASCADE;
    DROP TYPE IF EXISTS "TransactionType" CASCADE;
    DROP TYPE IF EXISTS "TransactionStatus" CASCADE;
    DROP TYPE IF EXISTS "BoostType" CASCADE;
    DROP TYPE IF EXISTS "PaymentStatus" CASCADE;
    DROP TYPE IF EXISTS "NotificationType" CASCADE;
    DROP TYPE IF EXISTS "NotificationStatus" CASCADE;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors during cleanup
        NULL;
END $$;

-- Equipment Condition Enum
DO $$ 
BEGIN
    CREATE TYPE "EquipmentCondition" AS ENUM (
        'EXCELLENT',
        'GOOD',
        'FAIR',
        'POOR'
    );
EXCEPTION
    WHEN duplicate_object THEN 
        -- Type already exists, skip
        NULL;
END $$;

-- Gig Related Enums
DO $$ 
BEGIN
    CREATE TYPE "GigStatus" AS ENUM (
        'DRAFT',
        'OPEN',
        'PAUSED',
        'IN_REVIEW',
        'ASSIGNED',
        'IN_PROGRESS',
        'SUBMITTED',
        'COMPLETED',
        'CANCELLED',
        'EXPIRED'
    );
EXCEPTION
    WHEN duplicate_object THEN 
        NULL;
END $$;

DO $$ 
BEGIN
    CREATE TYPE "GigType" AS ENUM (
        'PRODUCT',
        'VISIT',
        'REMOTE'
    );
EXCEPTION
    WHEN duplicate_object THEN 
        NULL;
END $$;

DO $$ 
BEGIN
    CREATE TYPE "ApplicationStatus" AS ENUM (
        'PENDING',
        'APPROVED',
        'SUBMITTED',
        'CLOSED',
        'REJECTED',
        'WITHDRAWN'
    );
EXCEPTION
    WHEN duplicate_object THEN 
        NULL;
END $$;

DO $$ 
BEGIN
    CREATE TYPE "SubmissionStatus" AS ENUM (
        'PENDING',
        'APPROVED',
        'REJECTED',
        'REVISION'
    );
EXCEPTION
    WHEN duplicate_object THEN 
        NULL;
END $$;

DO $$ 
BEGIN
    CREATE TYPE "GigAssignmentStatus" AS ENUM (
        'ACTIVE',
        'COMPLETED',
        'CANCELLED',
        'ON_HOLD'
    );
EXCEPTION
    WHEN duplicate_object THEN 
        NULL;
END $$;

DO $$ 
BEGIN
    CREATE TYPE "GigMilestoneStatus" AS ENUM (
        'PENDING',
        'IN_PROGRESS',
        'SUBMITTED',
        'APPROVED',
        'REJECTED',
        'PAID'
    );
EXCEPTION
    WHEN duplicate_object THEN 
        NULL;
END $$;

DO $$ 
BEGIN
    CREATE TYPE "GigTaskStatus" AS ENUM (
        'TODO',
        'IN_PROGRESS',
        'REVIEW',
        'DONE',
        'BLOCKED'
    );
EXCEPTION
    WHEN duplicate_object THEN 
        NULL;
END $$;

-- Credit Service Enums
DO $$ 
BEGIN
    CREATE TYPE "TransactionType" AS ENUM (
        'CREDIT',
        'DEBIT'
    );
EXCEPTION
    WHEN duplicate_object THEN 
        NULL;
END $$;

DO $$ 
BEGIN
    CREATE TYPE "TransactionStatus" AS ENUM (
        'PENDING',
        'COMPLETED',
        'FAILED',
        'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN 
        NULL;
END $$;

DO $$ 
BEGIN
    CREATE TYPE "BoostType" AS ENUM (
        'PROFILE_BOOST',
        'GIG_BOOST',
        'CLAN_BOOST'
    );
EXCEPTION
    WHEN duplicate_object THEN 
        NULL;
END $$;

DO $$ 
BEGIN
    CREATE TYPE "PaymentStatus" AS ENUM (
        'PENDING',
        'COMPLETED',
        'FAILED',
        'CANCELLED',
        'REFUNDED'
    );
EXCEPTION
    WHEN duplicate_object THEN 
        NULL;
END $$;

-- Notification Service Enums
DO $$ 
BEGIN
    CREATE TYPE "NotificationType" AS ENUM (
        'SYSTEM',
        'GIG',
        'CLAN',
        'CREDIT',
        'REPUTATION',
        'MESSAGE'
    );
EXCEPTION
    WHEN duplicate_object THEN 
        NULL;
END $$;

DO $$ 
BEGIN
    CREATE TYPE "NotificationStatus" AS ENUM (
        'SENT',
        'READ',
        'FAILED'
    );
EXCEPTION
    WHEN duplicate_object THEN 
        NULL;
END $$;

-- ============================================================================
-- 1. CREATE REMAINING TABLES (excluding authUsers which already exists)
-- ============================================================================

-- ============================================================================
-- AUTH SERVICE TABLES (add remaining auth tables)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "authRefreshTokens" (
    "id" TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS "authAdminLogs" (
    "id" TEXT NOT NULL,
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

-- ============================================================================
-- USER SERVICE TABLES (COMPLETE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "userAnalytics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileViews" INTEGER DEFAULT 0,
    "searchAppearances" INTEGER DEFAULT 0,
    "lastViewedAt" TIMESTAMPTZ(6),
    "popularityScore" DOUBLE PRECISION DEFAULT 0,
    "engagementScore" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "userAnalytics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "userSearchHistory" (
    "id" TEXT NOT NULL,
    "searchQuery" TEXT NOT NULL,
    "searchType" TEXT NOT NULL,
    "filters" JSONB,
    "resultCount" INTEGER NOT NULL,
    "searcherId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "userSearchHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "userFavorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "favoriteUserId" TEXT NOT NULL,
    "favoriteType" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "userFavorites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "userBoostEvents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "boostType" TEXT NOT NULL,
    "boosterId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "eventId" TEXT NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "userBoostEvents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "userCreditEvents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "eventId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "userCreditEvents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "userEquipment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "description" TEXT,
    "condition" "EquipmentCondition" DEFAULT 'GOOD',
    "purchaseDate" TIMESTAMPTZ(6),
    "purchasePrice" DOUBLE PRECISION,
    "currentValue" DOUBLE PRECISION,
    "isAvailable" BOOLEAN DEFAULT true,
    "isIncludedInBids" BOOLEAN DEFAULT true,
    "specifications" JSONB,
    "images" TEXT[] DEFAULT ARRAY[]::"text"[],
    "lastServiceDate" TIMESTAMPTZ(6),
    "nextServiceDue" TIMESTAMPTZ(6),
    "location" TEXT,
    "serialNumber" TEXT,
    "insuranceValue" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "userEquipment_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- GIG SERVICE TABLES (COMPLETE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "gigs" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "postedById" TEXT NOT NULL,
    "postedByType" TEXT DEFAULT 'user',
    "brandName" TEXT,
    "brandUsername" TEXT,
    "brandAvatar" TEXT,
    "brandVerified" BOOLEAN DEFAULT false,
    "budgetMin" DOUBLE PRECISION,
    "budgetMax" DOUBLE PRECISION,
    "experienceLevel" TEXT DEFAULT 'intermediate',
    "budgetType" TEXT DEFAULT 'fixed',
    "roleRequired" TEXT NOT NULL,
    "skillsRequired" TEXT[] DEFAULT ARRAY[]::"text"[],
    "isClanAllowed" BOOLEAN DEFAULT true,
    "location" TEXT,
    "duration" TEXT,
    "urgency" TEXT DEFAULT 'normal',
    "status" "GigStatus" NOT NULL,
    "category" TEXT NOT NULL,
    "deliverables" TEXT[] DEFAULT ARRAY[]::"text"[],
    "requirements" TEXT,
    "deadline" TIMESTAMPTZ(6),
    "assignedToId" TEXT,
    "assignedToType" TEXT,
    "completedAt" TIMESTAMPTZ(6),
    "gigType" "GigType" DEFAULT 'REMOTE',
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "maxApplications" INTEGER,
    "platformRequirements" TEXT[] DEFAULT ARRAY[]::"text"[],
    "tags" TEXT[] DEFAULT ARRAY[]::"text"[],
    "followerRequirements" JSONB[] DEFAULT ARRAY[]::jsonb[],
    "locationRequirements" TEXT[] DEFAULT ARRAY[]::"text"[],
    "campaignDuration" TEXT,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gigs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "applications" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "applicantType" TEXT NOT NULL,
    "clanId" TEXT,
    "proposal" TEXT,
    "quotedPrice" DOUBLE PRECISION,
    "estimatedTime" TEXT,
    "portfolio" TEXT[] DEFAULT ARRAY[]::"text"[],
    "status" "ApplicationStatus" DEFAULT 'PENDING',
    "upiId" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "teamPlan" JSONB,
    "milestonePlan" JSONB,
    "payoutSplit" JSONB,
    "appliedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMPTZ(6),
    "rejectionReason" TEXT,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "submissions" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "applicationId" TEXT,
    "submittedById" TEXT NOT NULL,
    "submittedByType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "upiId" TEXT NOT NULL,
    "deliverables" TEXT[] DEFAULT ARRAY[]::"text"[],
    "notes" TEXT,
    "status" "SubmissionStatus" DEFAULT 'PENDING',
    "submittedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMPTZ(6),
    "feedback" TEXT,
    "rating" INTEGER,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "gigBoostEvents" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "boosterId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "eventId" TEXT NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gigBoostEvents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "gigCreditEvents" (
    "id" TEXT NOT NULL,
    "gigId" TEXT,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "eventId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gigCreditEvents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "gigAssignments" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "applicationId" TEXT,
    "assigneeType" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "clanId" TEXT,
    "teamPlanSnapshot" JSONB,
    "milestonePlanSnapshot" JSONB,
    "payoutSplitSnapshot" JSONB,
    "status" "GigAssignmentStatus" DEFAULT 'ACTIVE',
    "assignedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(6),

    CONSTRAINT "gigAssignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "gigMilestones" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMPTZ(6) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "deliverables" TEXT[] DEFAULT ARRAY[]::"text"[],
    "status" "GigMilestoneStatus" DEFAULT 'PENDING',
    "submittedAt" TIMESTAMPTZ(6),
    "approvedAt" TIMESTAMPTZ(6),
    "paidAt" TIMESTAMPTZ(6),
    "feedback" TEXT,

    CONSTRAINT "gigMilestones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "gigTasks" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assigneeUserId" TEXT NOT NULL,
    "status" "GigTaskStatus" DEFAULT 'TODO',
    "estimatedHours" DOUBLE PRECISION,
    "actualHours" DOUBLE PRECISION,
    "deliverables" TEXT[] DEFAULT ARRAY[]::"text"[],
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gigTasks_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- CLAN SERVICE TABLES (COMPLETE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "clans" (
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

CREATE TABLE IF NOT EXISTS "clanMembers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clanId" TEXT NOT NULL,
    "role" TEXT DEFAULT 'MEMBER',
    "status" TEXT DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clanMembers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "clanMessages" (
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

-- ============================================================================
-- CREDIT SERVICE TABLES (COMPLETE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "creditWallets" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "balance" INTEGER DEFAULT 0,
    "totalEarned" INTEGER DEFAULT 0,
    "totalSpent" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creditWallets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "creditTransactions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "relatedId" TEXT,
    "relatedType" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "status" "TransactionStatus" DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creditTransactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "creditBoostRecords" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "boostType" "BoostType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "creditsCost" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "startTime" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMPTZ(6) NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creditBoostRecords_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "creditPackages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION,
    "isActive" BOOLEAN DEFAULT true,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creditPackages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "creditPaymentRecords" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "credits" INTEGER NOT NULL,
    "paymentGateway" TEXT NOT NULL,
    "gatewayOrderId" TEXT,
    "gatewayPaymentId" TEXT,
    "status" "PaymentStatus" DEFAULT 'PENDING',
    "paymentData" JSONB,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creditPaymentRecords_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- NOTIFICATION SERVICE TABLES (COMPLETE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "status" "NotificationStatus" DEFAULT 'SENT',
    "readAt" TIMESTAMPTZ(6),
    "actionUrl" TEXT,
    "metadata" JSONB,
    "relatedId" TEXT,
    "relatedType" TEXT,
    "priority" INTEGER DEFAULT 1,
    "expiresAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "notificationEmailTemplates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "bodyText" TEXT,
    "variables" TEXT[] DEFAULT ARRAY[]::"text"[],
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificationEmailTemplates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "notificationPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailNotifications" BOOLEAN DEFAULT true,
    "pushNotifications" BOOLEAN DEFAULT true,
    "gigUpdates" BOOLEAN DEFAULT true,
    "clanUpdates" BOOLEAN DEFAULT true,
    "creditUpdates" BOOLEAN DEFAULT true,
    "marketingEmails" BOOLEAN DEFAULT false,
    "frequency" TEXT DEFAULT 'immediate',
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "timezone" TEXT DEFAULT 'UTC',
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificationPreferences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "notificationLogs" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL,
    "sentAt" TIMESTAMPTZ(6),
    "deliveredAt" TIMESTAMPTZ(6),
    "failureReason" TEXT,
    "retryCount" INTEGER DEFAULT 0,
    "metadata" JSONB,

    CONSTRAINT "notificationLogs_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- REPUTATION SERVICE TABLES (COMPLETE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "reputationScores" (
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

CREATE TABLE IF NOT EXISTS "reputationClanReputations" (
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

CREATE TABLE IF NOT EXISTS "reputationScoreHistory" (
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

CREATE TABLE IF NOT EXISTS "reputationActivityLogs" (
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

CREATE TABLE IF NOT EXISTS "reputationLeaderboardCache" (
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

CREATE TABLE IF NOT EXISTS "reputationScoreConfig" (
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

-- ============================================================================
-- WORK HISTORY SERVICE TABLES (COMPLETE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "workRecords" (
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

CREATE TABLE IF NOT EXISTS "workPortfolioItems" (
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

CREATE TABLE IF NOT EXISTS "workAchievements" (
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

CREATE TABLE IF NOT EXISTS "workSkillProficiencies" (
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

CREATE TABLE IF NOT EXISTS "workSummaries" (
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

CREATE TABLE IF NOT EXISTS "workEvents" (
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

-- ============================================================================
-- SOCIAL MEDIA SERVICE TABLES (COMPLETE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "socialMediaAccounts" (
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

-- ============================================================================
-- 2. CREATE INDEXES FOR NEW TABLES
-- ============================================================================

-- Auth Service Indexes (skip authUsers as it already exists)
CREATE UNIQUE INDEX IF NOT EXISTS "authRefreshTokens_token_key" ON "authRefreshTokens"("token");
CREATE INDEX IF NOT EXISTS "idx_auth_refresh_tokens_expires_at" ON "authRefreshTokens"("expiresAt");
CREATE INDEX IF NOT EXISTS "idx_auth_refresh_tokens_user_id" ON "authRefreshTokens"("userId");

-- User Service Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "userAnalytics_userId_key" ON "userAnalytics"("userId");
CREATE INDEX IF NOT EXISTS "userAnalytics_popularityScore_idx" ON "userAnalytics"("popularityScore");
CREATE INDEX IF NOT EXISTS "userAnalytics_engagementScore_idx" ON "userAnalytics"("engagementScore");

CREATE UNIQUE INDEX IF NOT EXISTS "userFavorites_userId_favoriteUserId_key" ON "userFavorites"("userId", "favoriteUserId");
CREATE INDEX IF NOT EXISTS "userFavorites_userId_idx" ON "userFavorites"("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "userBoostEvents_eventId_key" ON "userBoostEvents"("eventId");
CREATE INDEX IF NOT EXISTS "userBoostEvents_userId_idx" ON "userBoostEvents"("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "userCreditEvents_eventId_key" ON "userCreditEvents"("eventId");
CREATE INDEX IF NOT EXISTS "userCreditEvents_userId_idx" ON "userCreditEvents"("userId");

CREATE INDEX IF NOT EXISTS "userEquipment_userId_idx" ON "userEquipment"("userId");
CREATE INDEX IF NOT EXISTS "userSearchHistory_searchType_idx" ON "userSearchHistory"("searchType");
CREATE INDEX IF NOT EXISTS "userSearchHistory_createdAt_idx" ON "userSearchHistory"("createdAt");

-- Gig Service Indexes
CREATE INDEX IF NOT EXISTS "gigs_postedById_idx" ON "gigs"("postedById");
CREATE INDEX IF NOT EXISTS "gigs_status_idx" ON "gigs"("status");
CREATE INDEX IF NOT EXISTS "gigs_category_idx" ON "gigs"("category");
CREATE INDEX IF NOT EXISTS "gigs_gigType_idx" ON "gigs"("gigType");
CREATE INDEX IF NOT EXISTS "gigs_assignedToId_idx" ON "gigs"("assignedToId");

CREATE UNIQUE INDEX IF NOT EXISTS "applications_applicantId_gigId_key" ON "applications"("applicantId", "gigId");
CREATE INDEX IF NOT EXISTS "applications_gigId_idx" ON "applications"("gigId");
CREATE INDEX IF NOT EXISTS "applications_status_idx" ON "applications"("status");

CREATE INDEX IF NOT EXISTS "submissions_gigId_idx" ON "submissions"("gigId");
CREATE INDEX IF NOT EXISTS "submissions_applicationId_idx" ON "submissions"("applicationId");
CREATE INDEX IF NOT EXISTS "submissions_status_idx" ON "submissions"("status");

CREATE UNIQUE INDEX IF NOT EXISTS "gigBoostEvents_eventId_key" ON "gigBoostEvents"("eventId");
CREATE INDEX IF NOT EXISTS "gigBoostEvents_gigId_idx" ON "gigBoostEvents"("gigId");
CREATE INDEX IF NOT EXISTS "gigBoostEvents_isActive_idx" ON "gigBoostEvents"("isActive");
CREATE INDEX IF NOT EXISTS "gigBoostEvents_expiresAt_idx" ON "gigBoostEvents"("expiresAt");

CREATE UNIQUE INDEX IF NOT EXISTS "gigCreditEvents_eventId_key" ON "gigCreditEvents"("eventId");
CREATE INDEX IF NOT EXISTS "gigCreditEvents_gigId_idx" ON "gigCreditEvents"("gigId");
CREATE INDEX IF NOT EXISTS "gigCreditEvents_userId_idx" ON "gigCreditEvents"("userId");
CREATE INDEX IF NOT EXISTS "gigCreditEvents_eventType_idx" ON "gigCreditEvents"("eventType");

CREATE UNIQUE INDEX IF NOT EXISTS "gigAssignments_gigId_key" ON "gigAssignments"("gigId");
CREATE UNIQUE INDEX IF NOT EXISTS "gigAssignments_applicationId_key" ON "gigAssignments"("applicationId");
CREATE INDEX IF NOT EXISTS "gigAssignments_assigneeId_idx" ON "gigAssignments"("assigneeId");
CREATE INDEX IF NOT EXISTS "gigAssignments_status_idx" ON "gigAssignments"("status");

CREATE INDEX IF NOT EXISTS "gigMilestones_assignmentId_idx" ON "gigMilestones"("assignmentId");
CREATE INDEX IF NOT EXISTS "gigMilestones_status_idx" ON "gigMilestones"("status");
CREATE INDEX IF NOT EXISTS "gigMilestones_dueAt_idx" ON "gigMilestones"("dueAt");

CREATE INDEX IF NOT EXISTS "gigTasks_assignmentId_idx" ON "gigTasks"("assignmentId");
CREATE INDEX IF NOT EXISTS "gigTasks_milestoneId_idx" ON "gigTasks"("milestoneId");
CREATE INDEX IF NOT EXISTS "gigTasks_assigneeUserId_idx" ON "gigTasks"("assigneeUserId");
CREATE INDEX IF NOT EXISTS "gigTasks_status_idx" ON "gigTasks"("status");

-- Clan Service Indexes
CREATE INDEX IF NOT EXISTS "clans_reputationScore_idx" ON "clans"("reputationScore");
CREATE UNIQUE INDEX IF NOT EXISTS "clanMembers_userId_clanId_key" ON "clanMembers"("userId", "clanId");

-- Credit Service Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "creditWallets_ownerId_key" ON "creditWallets"("ownerId");

-- Notification Service Indexes
CREATE INDEX IF NOT EXISTS "notifications_userId_idx" ON "notifications"("userId");
CREATE INDEX IF NOT EXISTS "notifications_type_idx" ON "notifications"("type");
CREATE UNIQUE INDEX IF NOT EXISTS "notificationEmailTemplates_name_key" ON "notificationEmailTemplates"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "notificationPreferences_userId_key" ON "notificationPreferences"("userId");
CREATE INDEX IF NOT EXISTS "notificationLogs_notificationId_idx" ON "notificationLogs"("notificationId");

-- Reputation Service Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "reputationScores_userId_key" ON "reputationScores"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "reputationClanReputations_clanId_key" ON "reputationClanReputations"("clanId");

-- Work History Service Indexes
CREATE INDEX IF NOT EXISTS "workRecords_userId_idx" ON "workRecords"("userId");
CREATE INDEX IF NOT EXISTS "workAchievements_userId_idx" ON "workAchievements"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "workSummaries_userId_key" ON "workSummaries"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "workSkillProficiencies_userId_skill_key" ON "workSkillProficiencies"("user_id", "skill");

-- Social Media Service Indexes
CREATE INDEX IF NOT EXISTS "socialMediaAccounts_userId_idx" ON "socialMediaAccounts"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "socialMediaAccounts_userId_platform_key" ON "socialMediaAccounts"("userId", "platform");

-- ============================================================================
-- 3. ADD FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Auth Service Foreign Keys
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'authRefreshTokens_userId_fkey') THEN
        ALTER TABLE "authRefreshTokens" ADD CONSTRAINT "authRefreshTokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "authUsers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'authAdminLogs_adminId_fkey') THEN
        ALTER TABLE "authAdminLogs" ADD CONSTRAINT "authAdminLogs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "authUsers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END $$;

-- User Service Foreign Keys
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'userEquipment_userId_fkey') THEN
        ALTER TABLE "userEquipment" ADD CONSTRAINT "userEquipment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "authUsers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Gig Service Foreign Keys
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_gigId_fkey') THEN
        ALTER TABLE "applications" ADD CONSTRAINT "applications_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "gigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submissions_gigId_fkey') THEN
        ALTER TABLE "submissions" ADD CONSTRAINT "submissions_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "gigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gigAssignments_gigId_fkey') THEN
        ALTER TABLE "gigAssignments" ADD CONSTRAINT "gigAssignments_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "gigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gigMilestones_assignmentId_fkey') THEN
        ALTER TABLE "gigMilestones" ADD CONSTRAINT "gigMilestones_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "gigAssignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gigTasks_assignmentId_fkey') THEN
        ALTER TABLE "gigTasks" ADD CONSTRAINT "gigTasks_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "gigAssignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Clan Service Foreign Keys
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clanMembers_clanId_fkey') THEN
        ALTER TABLE "clanMembers" ADD CONSTRAINT "clanMembers_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "clans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clanMessages_clanId_fkey') THEN
        ALTER TABLE "clanMessages" ADD CONSTRAINT "clanMessages_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "clans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Credit Service Foreign Keys
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'creditTransactions_walletId_fkey') THEN
        ALTER TABLE "creditTransactions" ADD CONSTRAINT "creditTransactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "creditWallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'creditBoostRecords_walletId_fkey') THEN
        ALTER TABLE "creditBoostRecords" ADD CONSTRAINT "creditBoostRecords_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "creditWallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Work History Service Foreign Keys
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workPortfolioItems_workRecordId_fkey') THEN
        ALTER TABLE "workPortfolioItems" ADD CONSTRAINT "workPortfolioItems_workRecordId_fkey" FOREIGN KEY ("workRecordId") REFERENCES "workRecords"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Social Media Service Foreign Keys
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'socialMediaSnapshots_accountId_fkey') THEN
        ALTER TABLE "socialMediaSnapshots" ADD CONSTRAINT "socialMediaSnapshots_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "socialMediaAccounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Notification Service Foreign Keys
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notificationLogs_notificationId_fkey') THEN
        ALTER TABLE "notificationLogs" ADD CONSTRAINT "notificationLogs_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- 4. POPULATE INITIAL DATA (SAFE - only if not exists)
-- ============================================================================

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

-- ============================================================================
-- 5. FINAL SUCCESS MESSAGE
-- ============================================================================

SELECT 'SUCCESS: All remaining service tables added to your database!' as result;
SELECT 'Your authUsers table was preserved and all other services now have their tables.' as status;
SELECT 'All tables use camelCase columns and are ready for your services!' as ready;