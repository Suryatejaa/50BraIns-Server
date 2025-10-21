-- 50BraIns Database Migration to CamelCase
-- Run this script in Supabase SQL Editor to drop existing tables and recreate with camelCase columns
-- This addresses the camelCase consistency requirement across the entire platform

-- ============================================================================
-- IMPORTANT: BACKUP YOUR DATA BEFORE RUNNING THIS SCRIPT
-- This script will DROP all existing tables and recreate them with camelCase column names
-- ============================================================================

-- Disable triggers temporarily to avoid issues during cleanup
SET session_replication_role = replica;

-- ============================================================================
-- 1. DROP ALL EXISTING TABLES (in correct dependency order)
-- ============================================================================

-- Drop all existing tables in the correct order (handling foreign key dependencies)
DROP TABLE IF EXISTS social_media_snapshots CASCADE;
DROP TABLE IF EXISTS social_media_accounts CASCADE;
DROP TABLE IF EXISTS work_events CASCADE;
DROP TABLE IF EXISTS work_skill_proficiencies CASCADE;
DROP TABLE IF EXISTS work_summaries CASCADE;
DROP TABLE IF EXISTS work_achievements CASCADE;
DROP TABLE IF EXISTS work_portfolio_items CASCADE;
DROP TABLE IF EXISTS work_records CASCADE;
DROP TABLE IF EXISTS reputation_score_config CASCADE;
DROP TABLE IF EXISTS reputation_leaderboard_cache CASCADE;
DROP TABLE IF EXISTS reputation_activity_logs CASCADE;
DROP TABLE IF EXISTS reputation_score_history CASCADE;
DROP TABLE IF EXISTS reputation_clan_reputations CASCADE;
DROP TABLE IF EXISTS reputation_scores CASCADE;
DROP TABLE IF EXISTS notification_logs CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS notification_email_templates CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS credit_payment_records CASCADE;
DROP TABLE IF EXISTS credit_packages CASCADE;
DROP TABLE IF EXISTS credit_boost_records CASCADE;
DROP TABLE IF EXISTS credit_transactions CASCADE;
DROP TABLE IF EXISTS credit_wallets CASCADE;
DROP TABLE IF EXISTS clan_messages CASCADE;
DROP TABLE IF EXISTS clan_members CASCADE;
DROP TABLE IF EXISTS clans CASCADE;
DROP TABLE IF EXISTS gig_tasks CASCADE;
DROP TABLE IF EXISTS gig_milestones CASCADE;
DROP TABLE IF EXISTS gig_assignments CASCADE;
DROP TABLE IF EXISTS gig_credit_events CASCADE;
DROP TABLE IF EXISTS gig_boost_events CASCADE;
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS gigs CASCADE;
DROP TABLE IF EXISTS user_equipment CASCADE;
DROP TABLE IF EXISTS user_credit_events CASCADE;
DROP TABLE IF EXISTS user_boost_events CASCADE;
DROP TABLE IF EXISTS user_favorites CASCADE;
DROP TABLE IF EXISTS user_search_history CASCADE;
DROP TABLE IF EXISTS user_analytics CASCADE;
DROP TABLE IF EXISTS auth_admin_logs CASCADE;
DROP TABLE IF EXISTS auth_refresh_tokens CASCADE;
DROP TABLE IF EXISTS auth_users CASCADE;

-- Clean up any remaining tables and objects
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all remaining tables in public schema
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%' AND tablename NOT LIKE 'sql_%')
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
    
    -- Drop all sequences
    FOR r IN (SELECT sequencename FROM pg_sequences WHERE schemaname = 'public')
    LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequencename) || ' CASCADE';
    END LOOP;
END $$;

-- ============================================================================
-- 2. DROP AND RECREATE ENUMS (Required before creating tables)
-- ============================================================================

-- Drop existing enums first (in case they exist)
DROP TYPE IF EXISTS "NotificationStatus" CASCADE;
DROP TYPE IF EXISTS "NotificationType" CASCADE;
DROP TYPE IF EXISTS "TransactionStatus" CASCADE;
DROP TYPE IF EXISTS "TransactionType" CASCADE;
DROP TYPE IF EXISTS "ClanStatus" CASCADE;
DROP TYPE IF EXISTS "ClanRole" CASCADE;
DROP TYPE IF EXISTS "VerificationStatus" CASCADE;
DROP TYPE IF EXISTS "UserStatus" CASCADE;
DROP TYPE IF EXISTS "UserRole" CASCADE;
DROP TYPE IF EXISTS "GigType" CASCADE;
DROP TYPE IF EXISTS "GigTaskStatus" CASCADE;
DROP TYPE IF EXISTS "GigMilestoneStatus" CASCADE;
DROP TYPE IF EXISTS "GigAssignmentStatus" CASCADE;
DROP TYPE IF EXISTS "SubmissionStatus" CASCADE;
DROP TYPE IF EXISTS "ApplicationStatus" CASCADE;
DROP TYPE IF EXISTS "GigStatus" CASCADE;

-- Recreate all enums with proper structure

-- Gig Service Enums
CREATE TYPE "GigStatus" AS ENUM ('DRAFT', 'OPEN', 'PAUSED', 'IN_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'SUBMITTED', 'CLOSED', 'REJECTED', 'WITHDRAWN');
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVISION');
CREATE TYPE "GigAssignmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'ON_HOLD');
CREATE TYPE "GigMilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID');
CREATE TYPE "GigTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED');
CREATE TYPE "GigType" AS ENUM ('PRODUCT', 'VISIT', 'REMOTE');

-- User Service Enums
CREATE TYPE "UserRole" AS ENUM ('USER', 'BRAND', 'ADMIN', 'MODERATOR');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION');
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- Clan Service Enums
CREATE TYPE "ClanRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'PENDING');
CREATE TYPE "ClanStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- Credit Service Enums
CREATE TYPE "TransactionType" AS ENUM ('CREDIT', 'DEBIT', 'BOOST', 'REFUND', 'PAYMENT', 'REWARD');
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- Notification Service Enums
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'GIG', 'CLAN', 'CREDIT', 'REPUTATION', 'MESSAGE');
CREATE TYPE "NotificationStatus" AS ENUM ('SENT', 'READ', 'FAILED');

-- ============================================================================
-- 3. CREATE TABLES WITH CAMELCASE COLUMNS
-- ============================================================================

-- ============================================================================
-- AUTH SERVICE TABLES
-- ============================================================================

CREATE TABLE "authUsers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationToken" TEXT,
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "loginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authUsers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "authRefreshTokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "authRefreshTokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "authAdminLogs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT,
    "targetType" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authAdminLogs_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- USER SERVICE TABLES
-- ============================================================================

CREATE TABLE "userAnalytics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileViews" INTEGER NOT NULL DEFAULT 0,
    "gigApplications" INTEGER NOT NULL DEFAULT 0,
    "gigsPosted" INTEGER NOT NULL DEFAULT 0,
    "gigsCompleted" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION DEFAULT 0,
    "responseTime" INTEGER DEFAULT 0,
    "completionRate" DOUBLE PRECISION DEFAULT 0,
    "lastActive" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "userAnalytics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "userSearchHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "searchTerm" TEXT NOT NULL,
    "filters" JSONB,
    "resultsCount" INTEGER DEFAULT 0,
    "clickedResults" TEXT[],
    "searchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "userSearchHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "userFavorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "userFavorites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "userBoostEvents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "eventId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "userBoostEvents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "userCreditEvents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "eventId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "userCreditEvents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "userEquipment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "specifications" JSONB,
    "condition" TEXT DEFAULT 'good',
    "purchaseDate" TIMESTAMP(3),
    "warrantyExpires" TIMESTAMP(3),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "userEquipment_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- GIG SERVICE TABLES (with camelCase columns)
-- ============================================================================

CREATE TABLE "gigs" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "postedById" TEXT NOT NULL,
    "postedByType" TEXT NOT NULL DEFAULT 'user',
    "brandName" TEXT,
    "brandUsername" TEXT,
    "brandAvatar" TEXT,
    "brandVerified" BOOLEAN NOT NULL DEFAULT false,
    "budgetMin" DOUBLE PRECISION,
    "budgetMax" DOUBLE PRECISION,
    "experienceLevel" TEXT NOT NULL DEFAULT 'intermediate',
    "budgetType" TEXT NOT NULL DEFAULT 'fixed',
    "roleRequired" TEXT NOT NULL,
    "skillsRequired" TEXT[],
    "isClanAllowed" BOOLEAN NOT NULL DEFAULT true,
    "location" TEXT,
    "duration" TEXT,
    "urgency" TEXT NOT NULL DEFAULT 'normal',
    "status" "GigStatus" NOT NULL,
    "category" TEXT NOT NULL,
    "deliverables" TEXT[],
    "requirements" TEXT,
    "deadline" TIMESTAMP(3),
    "assignedToId" TEXT,
    "assignedToType" TEXT,
    "completedAt" TIMESTAMP(3),
    "gigType" "GigType" NOT NULL DEFAULT 'REMOTE',
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "maxApplications" INTEGER,
    "platformRequirements" TEXT[],
    "tags" TEXT[],
    "followerRequirements" JSONB[],
    "locationRequirements" TEXT[],
    "campaignDuration" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gigs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "applicantType" TEXT NOT NULL,
    "clanId" TEXT,
    "proposal" TEXT,
    "quotedPrice" DOUBLE PRECISION,
    "estimatedTime" TEXT,
    "portfolio" TEXT[],
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "upiId" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "teamPlan" JSONB,
    "milestonePlan" JSONB,
    "payoutSplit" JSONB,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "applicationId" TEXT,
    "submittedById" TEXT NOT NULL,
    "submittedByType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "upiId" TEXT NOT NULL,
    "deliverables" TEXT[],
    "notes" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "feedback" TEXT,
    "rating" INTEGER,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "gigBoostEvents" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "boosterId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "eventId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gigBoostEvents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "gigCreditEvents" (
    "id" TEXT NOT NULL,
    "gigId" TEXT,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "eventId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gigCreditEvents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "gigAssignments" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "applicationId" TEXT,
    "assigneeType" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "clanId" TEXT,
    "teamPlanSnapshot" JSONB,
    "milestonePlanSnapshot" JSONB,
    "payoutSplitSnapshot" JSONB,
    "status" "GigAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "gigAssignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "gigMilestones" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "deliverables" TEXT[],
    "status" "GigMilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "feedback" TEXT,

    CONSTRAINT "gigMilestones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "gigTasks" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assigneeUserId" TEXT NOT NULL,
    "status" "GigTaskStatus" NOT NULL DEFAULT 'TODO',
    "estimatedHours" DOUBLE PRECISION,
    "actualHours" DOUBLE PRECISION,
    "deliverables" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gigTasks_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- CLAN SERVICE TABLES
-- ============================================================================

CREATE TABLE "clans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "avatar" TEXT,
    "banner" TEXT,
    "website" TEXT,
    "location" TEXT,
    "skills" TEXT[],
    "specializations" TEXT[],
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "maxMembers" INTEGER DEFAULT 50,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completedGigs" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION DEFAULT 0,
    "status" "ClanStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clanMembers" (
    "id" TEXT NOT NULL,
    "clanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ClanRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "invitedBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "contributionScore" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gigsCompleted" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "clanMembers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clanMessages" (
    "id" TEXT NOT NULL,
    "clanId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'text',
    "attachments" TEXT[],
    "replyToId" TEXT,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clanMessages_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- CREDIT SERVICE TABLES
-- ============================================================================

CREATE TABLE "creditWallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lockedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creditWallets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "creditTransactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "metadata" JSONB,
    "balanceBefore" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "creditTransactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "creditBoostRecords" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creditBoostRecords_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "creditPackages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "credits" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "bonusCredits" DOUBLE PRECISION DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "features" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creditPackages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "creditPaymentRecords" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "paymentMethod" TEXT NOT NULL,
    "paymentId" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "creditPaymentRecords_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- NOTIFICATION SERVICE TABLES
-- ============================================================================

CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'SENT',
    "readAt" TIMESTAMP(3),
    "actionUrl" TEXT,
    "metadata" JSONB,
    "relatedId" TEXT,
    "relatedType" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notificationEmailTemplates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "bodyText" TEXT,
    "variables" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificationEmailTemplates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notificationPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
    "gigUpdates" BOOLEAN NOT NULL DEFAULT true,
    "clanUpdates" BOOLEAN NOT NULL DEFAULT true,
    "creditUpdates" BOOLEAN NOT NULL DEFAULT true,
    "marketingEmails" BOOLEAN NOT NULL DEFAULT false,
    "frequency" TEXT NOT NULL DEFAULT 'immediate',
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "timezone" TEXT DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificationPreferences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notificationLogs" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,

    CONSTRAINT "notificationLogs_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- REPUTATION SERVICE TABLES
-- ============================================================================

CREATE TABLE "reputationScores" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "reliabilityScore" INTEGER NOT NULL DEFAULT 0,
    "qualityScore" INTEGER NOT NULL DEFAULT 0,
    "communicationScore" INTEGER NOT NULL DEFAULT 0,
    "timelinessScore" INTEGER NOT NULL DEFAULT 0,
    "overallRating" DOUBLE PRECISION DEFAULT 0,
    "totalGigs" INTEGER NOT NULL DEFAULT 0,
    "completedGigs" INTEGER NOT NULL DEFAULT 0,
    "cancelledGigs" INTEGER NOT NULL DEFAULT 0,
    "avgDeliveryTime" DOUBLE PRECISION DEFAULT 0,
    "onTimeDeliveryRate" DOUBLE PRECISION DEFAULT 0,
    "clientSatisfactionRate" DOUBLE PRECISION DEFAULT 0,
    "responseTime" DOUBLE PRECISION DEFAULT 0,
    "level" TEXT NOT NULL DEFAULT 'NEWCOMER',
    "rank" INTEGER DEFAULT 0,
    "badges" TEXT[],
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputationScores_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reputationClanReputations" (
    "id" TEXT NOT NULL,
    "clanId" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "avgMemberScore" DOUBLE PRECISION DEFAULT 0,
    "totalGigs" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION DEFAULT 0,
    "teamworkScore" INTEGER NOT NULL DEFAULT 0,
    "leadershipScore" INTEGER NOT NULL DEFAULT 0,
    "badges" TEXT[],
    "level" TEXT NOT NULL DEFAULT 'NEWCOMER',
    "rank" INTEGER DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputationScoreHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reputationActivityLogs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "clanId" TEXT,
    "action" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputationLeaderboardCache_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reputationScoreConfig" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "basePoints" INTEGER NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "maxPoints" INTEGER,
    "minPoints" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputationScoreConfig_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- WORK HISTORY SERVICE TABLES
-- ============================================================================

CREATE TABLE "workRecords" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gigId" TEXT,
    "projectTitle" TEXT NOT NULL,
    "description" TEXT,
    "role" TEXT NOT NULL,
    "skills" TEXT[],
    "deliverables" TEXT[],
    "clientFeedback" TEXT,
    "rating" INTEGER,
    "earnings" DOUBLE PRECISION DEFAULT 0,
    "duration" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workRecords_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workPortfolioItems" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workRecordId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "tags" TEXT[],
    "mediaUrls" TEXT[],
    "thumbnailUrl" TEXT,
    "externalLinks" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workPortfolioItems_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workAchievements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "badgeUrl" TEXT,
    "issuedBy" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationUrl" TEXT,
    "metadata" JSONB,

    CONSTRAINT "workAchievements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workSummaries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalProjects" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION DEFAULT 0,
    "totalHours" INTEGER NOT NULL DEFAULT 0,
    "topSkills" TEXT[],
    "topCategories" TEXT[],
    "clientRetentionRate" DOUBLE PRECISION DEFAULT 0,
    "onTimeDeliveryRate" DOUBLE PRECISION DEFAULT 0,
    "responseTime" DOUBLE PRECISION DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workSummaries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workSkillProficiencies" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillName" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "yearsExperience" INTEGER DEFAULT 0,
    "projectCount" INTEGER NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationSource" TEXT,
    "endorsements" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workSkillProficiencies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workEvents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "workRecordId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workEvents_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- SOCIAL MEDIA SERVICE TABLES
-- ============================================================================

CREATE TABLE "socialMediaAccounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "profileUrl" TEXT,
    "avatarUrl" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "socialMediaAccounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "socialMediaSnapshots" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "followersCount" INTEGER NOT NULL DEFAULT 0,
    "followingCount" INTEGER NOT NULL DEFAULT 0,
    "postsCount" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION DEFAULT 0,
    "avgLikes" DOUBLE PRECISION DEFAULT 0,
    "avgComments" DOUBLE PRECISION DEFAULT 0,
    "avgShares" DOUBLE PRECISION DEFAULT 0,
    "reachMetrics" JSONB,
    "audienceMetrics" JSONB,
    "contentMetrics" JSONB,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "socialMediaSnapshots_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Auth Service Indexes
CREATE UNIQUE INDEX "authUsers_email_key" ON "authUsers"("email");
CREATE INDEX "authRefreshTokens_userId_idx" ON "authRefreshTokens"("userId");
CREATE INDEX "authRefreshTokens_token_idx" ON "authRefreshTokens"("token");
CREATE INDEX "authAdminLogs_adminId_idx" ON "authAdminLogs"("adminId");

-- User Service Indexes
CREATE UNIQUE INDEX "userAnalytics_userId_key" ON "userAnalytics"("userId");
CREATE INDEX "userSearchHistory_userId_idx" ON "userSearchHistory"("userId");
CREATE INDEX "userFavorites_userId_idx" ON "userFavorites"("userId");
CREATE UNIQUE INDEX "userBoostEvents_eventId_key" ON "userBoostEvents"("eventId");
CREATE UNIQUE INDEX "userCreditEvents_eventId_key" ON "userCreditEvents"("eventId");

-- Gig Service Indexes
CREATE INDEX "gigs_postedById_idx" ON "gigs"("postedById");
CREATE INDEX "gigs_status_idx" ON "gigs"("status");
CREATE INDEX "gigs_category_idx" ON "gigs"("category");
CREATE INDEX "gigs_createdAt_idx" ON "gigs"("createdAt");
CREATE UNIQUE INDEX "applications_applicantId_gigId_key" ON "applications"("applicantId", "gigId");
CREATE INDEX "applications_gigId_idx" ON "applications"("gigId");
CREATE INDEX "submissions_gigId_idx" ON "submissions"("gigId");
CREATE UNIQUE INDEX "gigBoostEvents_eventId_key" ON "gigBoostEvents"("eventId");
CREATE UNIQUE INDEX "gigCreditEvents_eventId_key" ON "gigCreditEvents"("eventId");
CREATE UNIQUE INDEX "gigAssignments_gigId_key" ON "gigAssignments"("gigId");
CREATE UNIQUE INDEX "gigAssignments_applicationId_key" ON "gigAssignments"("applicationId");

-- Clan Service Indexes
CREATE UNIQUE INDEX "clans_slug_key" ON "clans"("slug");
CREATE INDEX "clanMembers_clanId_idx" ON "clanMembers"("clanId");
CREATE INDEX "clanMembers_userId_idx" ON "clanMembers"("userId");
CREATE UNIQUE INDEX "clanMembers_clanId_userId_key" ON "clanMembers"("clanId", "userId");
CREATE INDEX "clanMessages_clanId_idx" ON "clanMessages"("clanId");

-- Credit Service Indexes
CREATE UNIQUE INDEX "creditWallets_userId_key" ON "creditWallets"("userId");
CREATE INDEX "creditTransactions_userId_idx" ON "creditTransactions"("userId");
CREATE INDEX "creditBoostRecords_userId_idx" ON "creditBoostRecords"("userId");
CREATE INDEX "creditPaymentRecords_userId_idx" ON "creditPaymentRecords"("userId");

-- Notification Service Indexes
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");
CREATE INDEX "notifications_type_idx" ON "notifications"("type");
CREATE UNIQUE INDEX "notificationPreferences_userId_key" ON "notificationPreferences"("userId");
CREATE INDEX "notificationLogs_notificationId_idx" ON "notificationLogs"("notificationId");

-- Reputation Service Indexes
CREATE UNIQUE INDEX "reputationScores_userId_key" ON "reputationScores"("userId");
CREATE UNIQUE INDEX "reputationClanReputations_clanId_key" ON "reputationClanReputations"("clanId");
CREATE INDEX "reputationScoreHistory_userId_idx" ON "reputationScoreHistory"("userId");
CREATE INDEX "reputationActivityLogs_userId_idx" ON "reputationActivityLogs"("userId");

-- Work History Service Indexes
CREATE INDEX "workRecords_userId_idx" ON "workRecords"("userId");
CREATE INDEX "workPortfolioItems_userId_idx" ON "workPortfolioItems"("userId");
CREATE INDEX "workAchievements_userId_idx" ON "workAchievements"("userId");
CREATE UNIQUE INDEX "workSummaries_userId_key" ON "workSummaries"("userId");
CREATE INDEX "workSkillProficiencies_userId_idx" ON "workSkillProficiencies"("userId");
CREATE INDEX "workEvents_userId_idx" ON "workEvents"("userId");

-- Social Media Service Indexes
CREATE INDEX "socialMediaAccounts_userId_idx" ON "socialMediaAccounts"("userId");
CREATE UNIQUE INDEX "socialMediaAccounts_userId_platform_key" ON "socialMediaAccounts"("userId", "platform");
CREATE INDEX "socialMediaSnapshots_accountId_idx" ON "socialMediaSnapshots"("accountId");

-- ============================================================================
-- 5. ADD FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Auth Service Foreign Keys
ALTER TABLE "authRefreshTokens" ADD CONSTRAINT "authRefreshTokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "authUsers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Gig Service Foreign Keys
ALTER TABLE "applications" ADD CONSTRAINT "applications_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "gigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "gigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "gigAssignments" ADD CONSTRAINT "gigAssignments_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "gigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gigAssignments" ADD CONSTRAINT "gigAssignments_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "gigMilestones" ADD CONSTRAINT "gigMilestones_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "gigAssignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gigTasks" ADD CONSTRAINT "gigTasks_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "gigAssignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gigTasks" ADD CONSTRAINT "gigTasks_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "gigMilestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Clan Service Foreign Keys
ALTER TABLE "clanMembers" ADD CONSTRAINT "clanMembers_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "clans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clanMessages" ADD CONSTRAINT "clanMessages_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "clans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Work History Service Foreign Keys
ALTER TABLE "workPortfolioItems" ADD CONSTRAINT "workPortfolioItems_workRecordId_fkey" FOREIGN KEY ("workRecordId") REFERENCES "workRecords"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Social Media Service Foreign Keys
ALTER TABLE "socialMediaSnapshots" ADD CONSTRAINT "socialMediaSnapshots_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "socialMediaAccounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Notification Service Foreign Keys
ALTER TABLE "notificationLogs" ADD CONSTRAINT "notificationLogs_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- ============================================================================
-- 6. POPULATE INITIAL DATA (Optional - Add as needed)
-- ============================================================================

-- Insert default reputation score config
INSERT INTO "reputationScoreConfig" ("id", "eventType", "basePoints", "description") VALUES
('cfg_gig_complete', 'gig_completed', 50, 'Points for completing a gig successfully'),
('cfg_gig_cancel', 'gig_cancelled', -20, 'Penalty for cancelling a gig'),
('cfg_high_rating', 'high_rating_received', 10, 'Bonus for receiving 5-star rating'),
('cfg_on_time', 'on_time_delivery', 5, 'Bonus for on-time delivery'),
('cfg_late_delivery', 'late_delivery', -10, 'Penalty for late delivery');

-- Insert default credit packages
INSERT INTO "creditPackages" ("id", "name", "credits", "price", "description", "features") VALUES
('pkg_starter', 'Starter Pack', 100, 99.00, 'Perfect for getting started', ARRAY['100 Credits', 'Basic Support']),
('pkg_professional', 'Professional Pack', 500, 399.00, 'For serious creators', ARRAY['500 Credits', '50 Bonus Credits', 'Priority Support']),
('pkg_enterprise', 'Enterprise Pack', 1000, 699.00, 'For agencies and teams', ARRAY['1000 Credits', '150 Bonus Credits', 'Dedicated Support', 'Analytics Dashboard']);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Migration to camelCase completed successfully! All tables recreated with camelCase column names.' as message;