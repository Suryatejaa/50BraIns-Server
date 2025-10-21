-- 50BraIns Database Migration to CamelCase - COMPLETE VERSION
-- This is the corrected migration script with ALL fields from the actual schemas
-- Run this script in Supabase SQL Editor

-- ============================================================================
-- IMPORTANT: BACKUP YOUR DATA BEFORE RUNNING THIS SCRIPT
-- This script will DROP all existing tables and recreate them with ALL camelCase fields
-- ============================================================================

-- Disable triggers temporarily
SET session_replication_role = replica;

-- ============================================================================
-- 1. DROP ALL EXISTING TABLES AND ENUMS
-- ============================================================================

-- Drop all existing tables in dependency order (both snake_case and camelCase versions)

-- Drop camelCase tables first (in case they already exist)
DROP TABLE IF EXISTS "socialMediaSnapshots" CASCADE;
DROP TABLE IF EXISTS "socialMediaAccounts" CASCADE;
DROP TABLE IF EXISTS "workEvents" CASCADE;
DROP TABLE IF EXISTS "workSkillProficiencies" CASCADE;
DROP TABLE IF EXISTS "workSummaries" CASCADE;
DROP TABLE IF EXISTS "workAchievements" CASCADE;
DROP TABLE IF EXISTS "workPortfolioItems" CASCADE;
DROP TABLE IF EXISTS "workRecords" CASCADE;
DROP TABLE IF EXISTS "reputationScoreConfig" CASCADE;
DROP TABLE IF EXISTS "reputationLeaderboardCache" CASCADE;
DROP TABLE IF EXISTS "reputationActivityLogs" CASCADE;
DROP TABLE IF EXISTS "reputationScoreHistory" CASCADE;
DROP TABLE IF EXISTS "reputationClanReputations" CASCADE;
DROP TABLE IF EXISTS "reputationScores" CASCADE;
DROP TABLE IF EXISTS "notificationLogs" CASCADE;
DROP TABLE IF EXISTS "notificationPreferences" CASCADE;
DROP TABLE IF EXISTS "notificationEmailTemplates" CASCADE;
DROP TABLE IF EXISTS "notifications" CASCADE;
DROP TABLE IF EXISTS "creditPaymentRecords" CASCADE;
DROP TABLE IF EXISTS "creditPackages" CASCADE;
DROP TABLE IF EXISTS "creditBoostRecords" CASCADE;
DROP TABLE IF EXISTS "creditTransactions" CASCADE;
DROP TABLE IF EXISTS "creditWallets" CASCADE;
DROP TABLE IF EXISTS "clanMessages" CASCADE;
DROP TABLE IF EXISTS "clanMembers" CASCADE;
DROP TABLE IF EXISTS "clans" CASCADE;
DROP TABLE IF EXISTS "gigTasks" CASCADE;
DROP TABLE IF EXISTS "gigMilestones" CASCADE;
DROP TABLE IF EXISTS "gigAssignments" CASCADE;
DROP TABLE IF EXISTS "gigCreditEvents" CASCADE;
DROP TABLE IF EXISTS "gigBoostEvents" CASCADE;
DROP TABLE IF EXISTS "submissions" CASCADE;
DROP TABLE IF EXISTS "applications" CASCADE;
DROP TABLE IF EXISTS "gigs" CASCADE;
DROP TABLE IF EXISTS "userEquipment" CASCADE;
DROP TABLE IF EXISTS "userCreditEvents" CASCADE;
DROP TABLE IF EXISTS "userBoostEvents" CASCADE;
DROP TABLE IF EXISTS "userFavorites" CASCADE;
DROP TABLE IF EXISTS "userSearchHistory" CASCADE;
DROP TABLE IF EXISTS "userAnalytics" CASCADE;
DROP TABLE IF EXISTS "authAdminLogs" CASCADE;
DROP TABLE IF EXISTS "authRefreshTokens" CASCADE;
DROP TABLE IF EXISTS "authUsers" CASCADE;

-- Drop snake_case tables (legacy)
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

-- Drop existing enums
DROP TYPE IF EXISTS "EquipmentCondition" CASCADE;
DROP TYPE IF EXISTS "NotificationStatus" CASCADE;
DROP TYPE IF EXISTS "NotificationType" CASCADE;
DROP TYPE IF EXISTS "PaymentStatus" CASCADE;
DROP TYPE IF EXISTS "BoostType" CASCADE;
DROP TYPE IF EXISTS "TransactionStatus" CASCADE;
DROP TYPE IF EXISTS "TransactionType" CASCADE;
DROP TYPE IF EXISTS "Status" CASCADE;
DROP TYPE IF EXISTS "roles" CASCADE;
DROP TYPE IF EXISTS "GigType" CASCADE;
DROP TYPE IF EXISTS "GigTaskStatus" CASCADE;
DROP TYPE IF EXISTS "GigMilestoneStatus" CASCADE;
DROP TYPE IF EXISTS "GigAssignmentStatus" CASCADE;
DROP TYPE IF EXISTS "SubmissionStatus" CASCADE;
DROP TYPE IF EXISTS "ApplicationStatus" CASCADE;
DROP TYPE IF EXISTS "GigStatus" CASCADE;

-- ============================================================================
-- 2. RECREATE ALL ENUMS
-- ============================================================================

-- Auth Service Enums
CREATE TYPE "roles" AS ENUM ('USER', 'INFLUENCER', 'BRAND', 'CREW', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN');
CREATE TYPE "Status" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'BANNED');

-- Gig Service Enums
CREATE TYPE "GigStatus" AS ENUM ('DRAFT', 'OPEN', 'PAUSED', 'IN_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'SUBMITTED', 'CLOSED', 'REJECTED', 'WITHDRAWN');
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVISION');
CREATE TYPE "GigAssignmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'ON_HOLD');
CREATE TYPE "GigMilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID');
CREATE TYPE "GigTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED');
CREATE TYPE "GigType" AS ENUM ('PRODUCT', 'VISIT', 'REMOTE');

-- Credit Service Enums
CREATE TYPE "TransactionType" AS ENUM ('PURCHASE', 'BOOST_PROFILE', 'BOOST_GIG', 'BOOST_CLAN', 'CONTRIBUTION', 'REFUND', 'BONUS', 'TRANSFER');
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED');
CREATE TYPE "BoostType" AS ENUM ('PROFILE', 'GIG', 'CLAN');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- Notification Service Enums
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'GIG', 'CLAN', 'CREDIT', 'REPUTATION', 'MESSAGE');
CREATE TYPE "NotificationStatus" AS ENUM ('SENT', 'READ', 'FAILED');

-- User Service Enums
CREATE TYPE "EquipmentCondition" AS ENUM ('NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'NEEDS_REPAIR');

-- ============================================================================
-- 3. CREATE COMPLETE TABLES WITH ALL FIELDS
-- ============================================================================

-- ============================================================================
-- AUTH SERVICE TABLES (COMPLETE)
-- ============================================================================

CREATE TABLE "authUsers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT,
    "roles" TEXT[] DEFAULT ARRAY['USER']::"text"[],
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
    "contentCategories" TEXT[] DEFAULT ARRAY[]::"text"[],
    "primaryNiche" TEXT,
    "primaryPlatform" TEXT,
    "estimatedFollowers" INTEGER,
    "companyName" TEXT,
    "companyType" TEXT,
    "industry" TEXT,
    "gstNumber" TEXT,
    "companyWebsite" TEXT,
    "marketingBudget" TEXT,
    "targetAudience" TEXT[] DEFAULT ARRAY[]::"text"[],
    "campaignTypes" TEXT[] DEFAULT ARRAY[]::"text"[],
    "designationTitle" TEXT,
    "crewSkills" TEXT[] DEFAULT ARRAY[]::"text"[],
    "experienceLevel" TEXT,
    "equipmentOwned" TEXT[] DEFAULT ARRAY[]::"text"[],
    "portfolioUrl" TEXT,
    "hourlyRate" INTEGER,
    "availability" TEXT,
    "workStyle" TEXT,
    "specializations" TEXT[] DEFAULT ARRAY[]::"text"[],
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

CREATE TABLE "authRefreshTokens" (
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

CREATE TABLE "authAdminLogs" (
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

CREATE TABLE "userAnalytics" (
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

CREATE TABLE "userSearchHistory" (
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

CREATE TABLE "userFavorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "favoriteUserId" TEXT NOT NULL,
    "favoriteType" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "userFavorites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "userBoostEvents" (
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

CREATE TABLE "userCreditEvents" (
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

CREATE TABLE "userEquipment" (
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

CREATE TABLE "gigs" (
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

CREATE TABLE "applications" (
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

CREATE TABLE "submissions" (
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

CREATE TABLE "gigBoostEvents" (
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

CREATE TABLE "gigCreditEvents" (
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
    "status" "GigAssignmentStatus" DEFAULT 'ACTIVE',
    "assignedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(6),

    CONSTRAINT "gigAssignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "gigMilestones" (
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

CREATE TABLE "gigTasks" (
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

-- ============================================================================
-- CREDIT SERVICE TABLES (COMPLETE)
-- ============================================================================

CREATE TABLE "creditWallets" (
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

CREATE TABLE "creditTransactions" (
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

CREATE TABLE "creditBoostRecords" (
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

CREATE TABLE "creditPackages" (
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

CREATE TABLE "creditPaymentRecords" (
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

CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "readAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(6),
    "priority" TEXT DEFAULT 'normal',
    "channel" TEXT DEFAULT 'in_app',

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notificationEmailTemplates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "textBody" TEXT,
    "variables" JSONB DEFAULT '{}',
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificationEmailTemplates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notificationPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailNotifications" BOOLEAN DEFAULT true,
    "pushNotifications" BOOLEAN DEFAULT true,
    "smsNotifications" BOOLEAN DEFAULT false,
    "gigNotifications" BOOLEAN DEFAULT true,
    "clanNotifications" BOOLEAN DEFAULT true,
    "creditNotifications" BOOLEAN DEFAULT true,
    "reputationNotifications" BOOLEAN DEFAULT true,
    "marketingEmails" BOOLEAN DEFAULT false,
    "weeklyDigest" BOOLEAN DEFAULT true,
    "instantNotifications" BOOLEAN DEFAULT true,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "timezone" TEXT DEFAULT 'UTC',
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificationPreferences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notificationLogs" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL,
    "sentAt" TIMESTAMPTZ(6),
    "deliveredAt" TIMESTAMPTZ(6),
    "failedAt" TIMESTAMPTZ(6),
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificationLogs_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- REPUTATION SERVICE TABLES (COMPLETE)
-- ============================================================================

CREATE TABLE "reputationScores" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalScore" INTEGER DEFAULT 0,
    "reliabilityScore" INTEGER DEFAULT 0,
    "qualityScore" INTEGER DEFAULT 0,
    "communicationScore" INTEGER DEFAULT 0,
    "timelinessScore" INTEGER DEFAULT 0,
    "professionalismScore" INTEGER DEFAULT 0,
    "completedProjects" INTEGER DEFAULT 0,
    "successRate" DOUBLE PRECISION DEFAULT 0,
    "averageRating" DOUBLE PRECISION DEFAULT 0,
    "totalRatings" INTEGER DEFAULT 0,
    "streak" INTEGER DEFAULT 0,
    "longestStreak" INTEGER DEFAULT 0,
    "lastActivityAt" TIMESTAMPTZ(6),
    "rank" INTEGER,
    "level" TEXT DEFAULT 'BEGINNER',
    "badges" TEXT[] DEFAULT ARRAY[]::"text"[],
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputationScores_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reputationClanReputations" (
    "id" TEXT NOT NULL,
    "clanId" TEXT NOT NULL,
    "totalScore" INTEGER DEFAULT 0,
    "averageScore" DOUBLE PRECISION DEFAULT 0,
    "completedProjects" INTEGER DEFAULT 0,
    "memberCount" INTEGER DEFAULT 0,
    "successRate" DOUBLE PRECISION DEFAULT 0,
    "averageRating" DOUBLE PRECISION DEFAULT 0,
    "totalRatings" INTEGER DEFAULT 0,
    "specializations" TEXT[] DEFAULT ARRAY[]::"text"[],
    "topPerformers" TEXT[] DEFAULT ARRAY[]::"text"[],
    "rank" INTEGER,
    "level" TEXT DEFAULT 'EMERGING',
    "achievements" TEXT[] DEFAULT ARRAY[]::"text"[],
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputationClanReputations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reputationScoreHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scoreType" TEXT NOT NULL,
    "oldScore" INTEGER NOT NULL,
    "newScore" INTEGER NOT NULL,
    "change" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "relatedId" TEXT,
    "relatedType" TEXT,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputationScoreHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reputationActivityLogs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "points" INTEGER DEFAULT 0,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputationActivityLogs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reputationLeaderboardCache" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "leaderboardData" JSONB NOT NULL,
    "lastUpdated" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reputationLeaderboardCache_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reputationScoreConfig" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "basePoints" INTEGER NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputationScoreConfig_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- WORK HISTORY SERVICE TABLES (COMPLETE)
-- ============================================================================

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
    "userId" TEXT NOT NULL,
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
    "userId" TEXT NOT NULL,
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

-- ============================================================================
-- SOCIAL MEDIA SERVICE TABLES (COMPLETE)
-- ============================================================================

CREATE TABLE "socialMediaAccounts" (
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

CREATE TABLE "socialMediaSnapshots" (
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
-- 4. CREATE ALL UNIQUE CONSTRAINTS AND INDEXES
-- ============================================================================

-- Auth Service Indexes
CREATE UNIQUE INDEX "authUsers_email_key" ON "authUsers"("email");
CREATE UNIQUE INDEX "authUsers_username_key" ON "authUsers"("username");
CREATE INDEX "idx_auth_users_email" ON "authUsers"("email");
CREATE INDEX "idx_auth_users_status" ON "authUsers"("status");
CREATE INDEX "idx_auth_users_username" ON "authUsers"("username");

CREATE UNIQUE INDEX "authRefreshTokens_token_key" ON "authRefreshTokens"("token");
CREATE INDEX "idx_auth_refresh_tokens_expires_at" ON "authRefreshTokens"("expiresAt");
CREATE INDEX "idx_auth_refresh_tokens_user_id" ON "authRefreshTokens"("userId");

-- User Service Indexes
CREATE UNIQUE INDEX "userAnalytics_userId_key" ON "userAnalytics"("userId");
CREATE INDEX "userAnalytics_popularityScore_idx" ON "userAnalytics"("popularityScore");
CREATE INDEX "userAnalytics_engagementScore_idx" ON "userAnalytics"("engagementScore");

CREATE INDEX "userSearchHistory_searchType_idx" ON "userSearchHistory"("searchType");
CREATE INDEX "userSearchHistory_createdAt_idx" ON "userSearchHistory"("createdAt");

CREATE UNIQUE INDEX "userFavorites_userId_favoriteUserId_key" ON "userFavorites"("userId", "favoriteUserId");
CREATE INDEX "userFavorites_userId_idx" ON "userFavorites"("userId");
CREATE INDEX "userFavorites_favoriteUserId_idx" ON "userFavorites"("favoriteUserId");

CREATE UNIQUE INDEX "userBoostEvents_eventId_key" ON "userBoostEvents"("eventId");
CREATE INDEX "userBoostEvents_userId_idx" ON "userBoostEvents"("userId");
CREATE INDEX "userBoostEvents_isActive_idx" ON "userBoostEvents"("isActive");
CREATE INDEX "userBoostEvents_expiresAt_idx" ON "userBoostEvents"("expiresAt");

CREATE UNIQUE INDEX "userCreditEvents_eventId_key" ON "userCreditEvents"("eventId");
CREATE INDEX "userCreditEvents_userId_idx" ON "userCreditEvents"("userId");
CREATE INDEX "userCreditEvents_eventType_idx" ON "userCreditEvents"("eventType");

CREATE INDEX "userEquipment_userId_idx" ON "userEquipment"("userId");
CREATE INDEX "userEquipment_category_idx" ON "userEquipment"("category");
CREATE INDEX "userEquipment_isAvailable_idx" ON "userEquipment"("isAvailable");
CREATE INDEX "userEquipment_condition_idx" ON "userEquipment"("condition");

-- Gig Service Indexes
CREATE INDEX "gigs_postedById_idx" ON "gigs"("postedById");
CREATE INDEX "gigs_status_idx" ON "gigs"("status");
CREATE INDEX "gigs_category_idx" ON "gigs"("category");
CREATE INDEX "gigs_createdAt_idx" ON "gigs"("createdAt");

CREATE UNIQUE INDEX "applications_applicantId_gigId_key" ON "applications"("applicantId", "gigId");
CREATE INDEX "applications_gigId_idx" ON "applications"("gigId");

CREATE INDEX "submissions_gigId_idx" ON "submissions"("gigId");

CREATE UNIQUE INDEX "gigBoostEvents_eventId_key" ON "gigBoostEvents"("eventId");
CREATE INDEX "gigBoostEvents_gigId_idx" ON "gigBoostEvents"("gigId");
CREATE INDEX "gigBoostEvents_isActive_idx" ON "gigBoostEvents"("isActive");
CREATE INDEX "gigBoostEvents_expiresAt_idx" ON "gigBoostEvents"("expiresAt");

CREATE UNIQUE INDEX "gigCreditEvents_eventId_key" ON "gigCreditEvents"("eventId");
CREATE INDEX "gigCreditEvents_gigId_idx" ON "gigCreditEvents"("gigId");
CREATE INDEX "gigCreditEvents_userId_idx" ON "gigCreditEvents"("userId");
CREATE INDEX "gigCreditEvents_eventType_idx" ON "gigCreditEvents"("eventType");

CREATE UNIQUE INDEX "gigAssignments_gigId_key" ON "gigAssignments"("gigId");
CREATE UNIQUE INDEX "gigAssignments_applicationId_key" ON "gigAssignments"("applicationId");

-- Clan Service Indexes
CREATE INDEX "clans_reputationScore_idx" ON "clans"("reputationScore");
CREATE INDEX "clans_primaryCategory_idx" ON "clans"("primaryCategory");
CREATE INDEX "clans_isActive_idx" ON "clans"("isActive");
CREATE INDEX "clans_visibility_idx" ON "clans"("visibility");
CREATE INDEX "clans_location_idx" ON "clans"("location");

CREATE UNIQUE INDEX "clanMembers_userId_clanId_key" ON "clanMembers"("userId", "clanId");
CREATE INDEX "clanMembers_userId_idx" ON "clanMembers"("userId");
CREATE INDEX "clanMembers_clanId_idx" ON "clanMembers"("clanId");
CREATE INDEX "clanMembers_status_idx" ON "clanMembers"("status");

CREATE INDEX "clanMessages_clanId_idx" ON "clanMessages"("clanId");
CREATE INDEX "clanMessages_userId_idx" ON "clanMessages"("userId");
CREATE INDEX "clanMessages_createdAt_idx" ON "clanMessages"("createdAt");
CREATE INDEX "clanMessages_isDeleted_idx" ON "clanMessages"("isDeleted");
CREATE UNIQUE INDEX "clanMessages_clientMessageId_key" ON "clanMessages"("clientMessageId");

-- Credit Service Indexes
CREATE UNIQUE INDEX "creditWallets_ownerId_key" ON "creditWallets"("ownerId");

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
CREATE UNIQUE INDEX "workSkillProficiencies_userId_skill_key" ON "workSkillProficiencies"("userId", "skill");

CREATE INDEX "workEvents_userId_idx" ON "workEvents"("userId");

-- Social Media Service Indexes
CREATE INDEX "socialMediaAccounts_userId_idx" ON "socialMediaAccounts"("userId");
CREATE INDEX "socialMediaAccounts_platform_idx" ON "socialMediaAccounts"("platform");
CREATE INDEX "socialMediaAccounts_followers_idx" ON "socialMediaAccounts"("followers");
CREATE UNIQUE INDEX "socialMediaAccounts_userId_platform_key" ON "socialMediaAccounts"("userId", "platform");
CREATE UNIQUE INDEX "socialMediaAccounts_profileUrl_key" ON "socialMediaAccounts"("profileUrl");

CREATE INDEX "socialMediaSnapshots_accountId_idx" ON "socialMediaSnapshots"("accountId");
CREATE INDEX "socialMediaSnapshots_createdAt_idx" ON "socialMediaSnapshots"("createdAt");

-- ============================================================================
-- 5. ADD FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Auth Service Foreign Keys
ALTER TABLE "authRefreshTokens" ADD CONSTRAINT "authRefreshTokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "authUsers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "authAdminLogs" ADD CONSTRAINT "authAdminLogs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "authUsers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "authAdminLogs" ADD CONSTRAINT "authAdminLogs_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "authUsers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- User Service Foreign Keys
ALTER TABLE "userEquipment" ADD CONSTRAINT "userEquipment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "authUsers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

-- Credit Service Foreign Keys
ALTER TABLE "creditTransactions" ADD CONSTRAINT "creditTransactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "creditWallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "creditBoostRecords" ADD CONSTRAINT "creditBoostRecords_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "creditWallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Work History Service Foreign Keys
ALTER TABLE "workPortfolioItems" ADD CONSTRAINT "workPortfolioItems_workRecordId_fkey" FOREIGN KEY ("workRecordId") REFERENCES "workRecords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Social Media Service Foreign Keys
ALTER TABLE "socialMediaSnapshots" ADD CONSTRAINT "socialMediaSnapshots_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "socialMediaAccounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Notification Service Foreign Keys
ALTER TABLE "notificationLogs" ADD CONSTRAINT "notificationLogs_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- ============================================================================
-- 6. POPULATE INITIAL DATA
-- ============================================================================

-- Insert default reputation score config
INSERT INTO "reputationScoreConfig" ("id", "eventType", "basePoints", "description") VALUES
('config_1', 'gig_completed', 100, 'Points awarded for completing a gig'),
('config_2', 'gig_rated_5_star', 50, 'Bonus points for receiving a 5-star rating'),
('config_3', 'gig_on_time', 25, 'Bonus points for on-time delivery'),
('config_4', 'gig_cancelled', -50, 'Points deducted for cancelling a gig'),
('config_5', 'profile_verified', 200, 'Points awarded for profile verification'),
('config_6', 'first_gig', 150, 'Bonus points for completing first gig'),
('config_7', 'milestone_achieved', 75, 'Points for achieving project milestones'),
('config_8', 'clan_contribution', 30, 'Points for active clan participation'),
('config_9', 'quality_bonus', 40, 'Bonus for exceptional work quality'),
('config_10', 'communication_bonus', 20, 'Bonus for excellent communication');

-- Success message
SELECT 'COMPLETE Migration to camelCase finished successfully! All tables recreated with ALL fields in camelCase format.' as message;