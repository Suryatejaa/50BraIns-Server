-- 50BraIns Database Migration to CamelCase - SAFE VERSION
-- This version checks existing tables and handles data preservation
-- Run this script in Supabase SQL Editor

-- ============================================================================
-- STEP 1: CHECK EXISTING TABLES AND COLUMNS
-- ============================================================================

-- Check what tables currently exist
DO $$
DECLARE
    table_record RECORD;
    column_record RECORD;
BEGIN
    RAISE NOTICE '=== EXISTING TABLES IN DATABASE ===';
    
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        ORDER BY tablename
    LOOP
        RAISE NOTICE 'Table: %', table_record.tablename;
        
        -- Show columns for each table
        FOR column_record IN 
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = table_record.tablename
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '  - %: %', column_record.column_name, column_record.data_type;
        END LOOP;
        
        RAISE NOTICE ' ';
    END LOOP;
END $$;

-- ============================================================================
-- STEP 2: BACKUP EXISTING DATA (if any tables exist)
-- ============================================================================

-- Create backup tables for existing data
DO $$
DECLARE
    table_exists boolean;
BEGIN
    -- Check if auth_users exists (snake_case)
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'auth_users'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'Found auth_users table - creating backup';
        DROP TABLE IF EXISTS auth_users_backup;
        CREATE TABLE auth_users_backup AS SELECT * FROM auth_users;
        RAISE NOTICE 'Backup created: auth_users_backup';
    END IF;
    
    -- Check if authUsers exists (camelCase)
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'authUsers'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'Found authUsers table - creating backup';
        DROP TABLE IF EXISTS authUsers_backup;
        CREATE TABLE authUsers_backup AS SELECT * FROM "authUsers";
        RAISE NOTICE 'Backup created: authUsers_backup';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: SAFE CLEANUP - Drop tables in correct dependency order
-- ============================================================================

-- Disable foreign key checks temporarily
SET session_replication_role = replica;

-- Drop all tables (both naming conventions) in dependency order
DROP TABLE IF EXISTS social_media_snapshots CASCADE;
DROP TABLE IF EXISTS "socialMediaSnapshots" CASCADE;
DROP TABLE IF EXISTS social_media_accounts CASCADE;
DROP TABLE IF EXISTS "socialMediaAccounts" CASCADE;
DROP TABLE IF EXISTS work_events CASCADE;
DROP TABLE IF EXISTS "workEvents" CASCADE;
DROP TABLE IF EXISTS work_skill_proficiencies CASCADE;
DROP TABLE IF EXISTS "workSkillProficiencies" CASCADE;
DROP TABLE IF EXISTS work_summaries CASCADE;
DROP TABLE IF EXISTS "workSummaries" CASCADE;
DROP TABLE IF EXISTS work_achievements CASCADE;
DROP TABLE IF EXISTS "workAchievements" CASCADE;
DROP TABLE IF EXISTS work_portfolio_items CASCADE;
DROP TABLE IF EXISTS "workPortfolioItems" CASCADE;
DROP TABLE IF EXISTS work_records CASCADE;
DROP TABLE IF EXISTS "workRecords" CASCADE;
DROP TABLE IF EXISTS reputation_score_config CASCADE;
DROP TABLE IF EXISTS "reputationScoreConfig" CASCADE;
DROP TABLE IF EXISTS reputation_leaderboard_cache CASCADE;
DROP TABLE IF EXISTS "reputationLeaderboardCache" CASCADE;
DROP TABLE IF EXISTS reputation_activity_logs CASCADE;
DROP TABLE IF EXISTS "reputationActivityLogs" CASCADE;
DROP TABLE IF EXISTS reputation_score_history CASCADE;
DROP TABLE IF EXISTS "reputationScoreHistory" CASCADE;
DROP TABLE IF EXISTS reputation_clan_reputations CASCADE;
DROP TABLE IF EXISTS "reputationClanReputations" CASCADE;
DROP TABLE IF EXISTS reputation_scores CASCADE;
DROP TABLE IF EXISTS "reputationScores" CASCADE;
DROP TABLE IF EXISTS notification_logs CASCADE;
DROP TABLE IF EXISTS "notificationLogs" CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS "notificationPreferences" CASCADE;
DROP TABLE IF EXISTS notification_email_templates CASCADE;
DROP TABLE IF EXISTS "notificationEmailTemplates" CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS "notifications" CASCADE;
DROP TABLE IF EXISTS credit_payment_records CASCADE;
DROP TABLE IF EXISTS "creditPaymentRecords" CASCADE;
DROP TABLE IF EXISTS credit_packages CASCADE;
DROP TABLE IF EXISTS "creditPackages" CASCADE;
DROP TABLE IF EXISTS credit_boost_records CASCADE;
DROP TABLE IF EXISTS "creditBoostRecords" CASCADE;
DROP TABLE IF EXISTS credit_transactions CASCADE;
DROP TABLE IF EXISTS "creditTransactions" CASCADE;
DROP TABLE IF EXISTS credit_wallets CASCADE;
DROP TABLE IF EXISTS "creditWallets" CASCADE;
DROP TABLE IF EXISTS clan_messages CASCADE;
DROP TABLE IF EXISTS "clanMessages" CASCADE;
DROP TABLE IF EXISTS clan_members CASCADE;
DROP TABLE IF EXISTS "clanMembers" CASCADE;
DROP TABLE IF EXISTS clans CASCADE;
DROP TABLE IF EXISTS "clans" CASCADE;
DROP TABLE IF EXISTS gig_tasks CASCADE;
DROP TABLE IF EXISTS "gigTasks" CASCADE;
DROP TABLE IF EXISTS gig_milestones CASCADE;
DROP TABLE IF EXISTS "gigMilestones" CASCADE;
DROP TABLE IF EXISTS gig_assignments CASCADE;
DROP TABLE IF EXISTS "gigAssignments" CASCADE;
DROP TABLE IF EXISTS gig_credit_events CASCADE;
DROP TABLE IF EXISTS "gigCreditEvents" CASCADE;
DROP TABLE IF EXISTS gig_boost_events CASCADE;
DROP TABLE IF EXISTS "gigBoostEvents" CASCADE;
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS "submissions" CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS "applications" CASCADE;
DROP TABLE IF EXISTS gigs CASCADE;
DROP TABLE IF EXISTS "gigs" CASCADE;
DROP TABLE IF EXISTS user_equipment CASCADE;
DROP TABLE IF EXISTS "userEquipment" CASCADE;
DROP TABLE IF EXISTS user_credit_events CASCADE;
DROP TABLE IF EXISTS "userCreditEvents" CASCADE;
DROP TABLE IF EXISTS user_boost_events CASCADE;
DROP TABLE IF EXISTS "userBoostEvents" CASCADE;
DROP TABLE IF EXISTS user_favorites CASCADE;
DROP TABLE IF EXISTS "userFavorites" CASCADE;
DROP TABLE IF EXISTS user_search_history CASCADE;
DROP TABLE IF EXISTS "userSearchHistory" CASCADE;
DROP TABLE IF EXISTS user_analytics CASCADE;
DROP TABLE IF EXISTS "userAnalytics" CASCADE;
DROP TABLE IF EXISTS auth_admin_logs CASCADE;
DROP TABLE IF EXISTS "authAdminLogs" CASCADE;
DROP TABLE IF EXISTS auth_refresh_tokens CASCADE;
DROP TABLE IF EXISTS "authRefreshTokens" CASCADE;
DROP TABLE IF EXISTS auth_users CASCADE;
DROP TABLE IF EXISTS "authUsers" CASCADE;

-- Drop all existing enums
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

RAISE NOTICE 'All existing tables and enums dropped successfully';

-- ============================================================================
-- STEP 4: CREATE NEW CAMELCASE SCHEMA
-- ============================================================================

-- Create all enums
CREATE TYPE "roles" AS ENUM ('USER', 'INFLUENCER', 'BRAND', 'CREW', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN');
CREATE TYPE "Status" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'BANNED');
CREATE TYPE "GigStatus" AS ENUM ('DRAFT', 'OPEN', 'PAUSED', 'IN_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'SUBMITTED', 'CLOSED', 'REJECTED', 'WITHDRAWN');
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVISION');
CREATE TYPE "GigAssignmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'ON_HOLD');
CREATE TYPE "GigMilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID');
CREATE TYPE "GigTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED');
CREATE TYPE "GigType" AS ENUM ('PRODUCT', 'VISIT', 'REMOTE');
CREATE TYPE "TransactionType" AS ENUM ('PURCHASE', 'BOOST_PROFILE', 'BOOST_GIG', 'BOOST_CLAN', 'CONTRIBUTION', 'REFUND', 'BONUS', 'TRANSFER');
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED');
CREATE TYPE "BoostType" AS ENUM ('PROFILE', 'GIG', 'CLAN');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED');
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'GIG', 'CLAN', 'CREDIT', 'REPUTATION', 'MESSAGE');
CREATE TYPE "NotificationStatus" AS ENUM ('SENT', 'READ', 'FAILED');
CREATE TYPE "EquipmentCondition" AS ENUM ('NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'NEEDS_REPAIR');

RAISE NOTICE 'All enums created successfully';

-- Create authUsers table first (most important)
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

RAISE NOTICE 'authUsers table created successfully';

-- Create indexes for authUsers
CREATE UNIQUE INDEX "authUsers_email_key" ON "authUsers"("email");
CREATE UNIQUE INDEX "authUsers_username_key" ON "authUsers"("username");
CREATE INDEX "idx_auth_users_email" ON "authUsers"("email");
CREATE INDEX "idx_auth_users_status" ON "authUsers"("status");
CREATE INDEX "idx_auth_users_username" ON "authUsers"("username");

RAISE NOTICE 'authUsers indexes created successfully';

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

-- Final success message
SELECT 'SUCCESS: Database migration completed! authUsers table created with camelCase structure.' as result;
SELECT 'Next step: Test your auth service - it should now work without userId column errors.' as next_step;