-- 03-GIG-SERVICE-UPDATE.sql
-- Safe migration to add missing gig service tables and columns
-- This script is designed for production - only adds what's missing

-- ============================================================================
-- SAFE GIG SERVICE MIGRATION - ADD MISSING COMPONENTS
-- ============================================================================

-- Disable triggers temporarily
SET session_replication_role = replica;

-- ============================================================================
-- 0. CREATE MISSING ENUM TYPES (ONLY IF THEY DON'T EXIST)
-- ============================================================================

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

-- Work History Enums for ApplicationWorkHistory
DO $$ 
BEGIN
    CREATE TYPE "WorkHistoryApplicationStatus" AS ENUM (
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
    CREATE TYPE "WorkHistorySubmissionStatus" AS ENUM (
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
    CREATE TYPE "WorkHistoryPaymentStatus" AS ENUM (
        'PENDING',
        'PROCESSING',
        'PAID',
        'FAILED'
    );
EXCEPTION
    WHEN duplicate_object THEN 
        NULL;
END $$;

-- Campaign History Enums
DO $$ 
BEGIN
    CREATE TYPE "CampaignStatus" AS ENUM (
        'DRAFT',
        'PUBLISHED',
        'ACTIVE',
        'PAUSED',
        'COMPLETED',
        'CANCELLED'
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
        'MESSAGE',
        'ENGAGEMENT'
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
-- 1. ADD MISSING COLUMN TO EXISTING GIGS TABLE
-- ============================================================================

-- Add isPublic column to gigs table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'gigs' AND column_name = 'isPublic'
    ) THEN
        ALTER TABLE "gigs" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT true;
        RAISE NOTICE 'Added isPublic column to gigs table';
    ELSE
        RAISE NOTICE 'isPublic column already exists in gigs table';
    END IF;
END $$;

-- ============================================================================
-- 2. CREATE MISSING TABLES (ONLY IF THEY DON'T EXIST)
-- ============================================================================

-- Create application_work_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS "application_work_history" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "gigOwnerId" TEXT NOT NULL,
    "gigPrice" DECIMAL(10,2),
    "quotedPrice" DECIMAL(10,2),
    "appliedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMPTZ(6),
    "rejectedAt" TIMESTAMPTZ(6),
    "applicationStatus" "WorkHistoryApplicationStatus" NOT NULL,
    "workSubmittedAt" TIMESTAMPTZ(6),
    "workReviewedAt" TIMESTAMPTZ(6),
    "submissionStatus" "WorkHistorySubmissionStatus",
    "completedAt" TIMESTAMPTZ(6),
    "paidAt" TIMESTAMPTZ(6),
    "paymentAmount" DECIMAL(10,2),
    "paymentStatus" "WorkHistoryPaymentStatus",
    "withdrawnAt" TIMESTAMPTZ(6),
    "withdrawalReason" TEXT,
    "revisionCount" INTEGER DEFAULT 0,
    "lastActivityAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_work_history_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "application_work_history_applicationId_key" UNIQUE ("applicationId")
);

-- Create campaign_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS "campaign_history" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "campaignTitle" TEXT NOT NULL,
    "campaignDescription" TEXT,
    "campaignType" TEXT NOT NULL,
    "budget" DECIMAL(10,2) NOT NULL,
    "gigPrice" DECIMAL(10,2),
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMPTZ(6),
    "startDate" TIMESTAMPTZ(6),
    "endDate" TIMESTAMPTZ(6),
    "closedAt" TIMESTAMPTZ(6),
    "status" "CampaignStatus" NOT NULL,
    "totalApplications" INTEGER DEFAULT 0,
    "acceptedApplications" INTEGER DEFAULT 0,
    "rejectedApplications" INTEGER DEFAULT 0,
    "completedWorks" INTEGER DEFAULT 0,
    "totalSpent" DECIMAL(10,2) DEFAULT 0,
    "avgCompletionTime" INTEGER,
    "totalReach" BIGINT,
    "totalEngagement" BIGINT,
    "conversionRate" DECIMAL(5,2),
    "roi" DECIMAL(5,2),
    "avgInfluencerRating" DECIMAL(3,2),
    "avgBrandRating" DECIMAL(3,2),
    "tags" TEXT[] DEFAULT ARRAY[]::"text"[],
    "notes" TEXT,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_history_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "campaign_history_gigId_key" UNIQUE ("gigId")
);

-- ============================================================================
-- 3. CREATE MISSING INDEXES (ONLY IF THEY DON'T EXIST)
-- ============================================================================

-- Gigs table indexes
CREATE INDEX IF NOT EXISTS "gigs_postedById_idx" ON "gigs"("postedById");
CREATE INDEX IF NOT EXISTS "gigs_status_idx" ON "gigs"("status");
CREATE INDEX IF NOT EXISTS "gigs_category_idx" ON "gigs"("category");
CREATE INDEX IF NOT EXISTS "gigs_gigType_idx" ON "gigs"("gigType");
CREATE INDEX IF NOT EXISTS "gigs_assignedToId_idx" ON "gigs"("assignedToId");
CREATE INDEX IF NOT EXISTS "gigs_isPublic_idx" ON "gigs"("isPublic");

-- Applications table indexes
CREATE INDEX IF NOT EXISTS "applications_gigId_idx" ON "applications"("gigId");
CREATE INDEX IF NOT EXISTS "applications_applicantId_idx" ON "applications"("applicantId");
CREATE INDEX IF NOT EXISTS "applications_status_idx" ON "applications"("status");

-- Submissions table indexes
CREATE INDEX IF NOT EXISTS "submissions_gigId_idx" ON "submissions"("gigId");
CREATE INDEX IF NOT EXISTS "submissions_submittedById_idx" ON "submissions"("submittedById");
CREATE INDEX IF NOT EXISTS "submissions_status_idx" ON "submissions"("status");

-- Application Work History indexes
CREATE INDEX IF NOT EXISTS "application_work_history_applicantId_idx" ON "application_work_history"("applicantId");
CREATE INDEX IF NOT EXISTS "application_work_history_gigOwnerId_idx" ON "application_work_history"("gigOwnerId");
CREATE INDEX IF NOT EXISTS "application_work_history_gigId_idx" ON "application_work_history"("gigId");
CREATE INDEX IF NOT EXISTS "application_work_history_applicationStatus_idx" ON "application_work_history"("applicationStatus");
CREATE INDEX IF NOT EXISTS "application_work_history_paymentStatus_idx" ON "application_work_history"("paymentStatus");

-- Campaign History indexes
CREATE INDEX IF NOT EXISTS "campaign_history_brandId_idx" ON "campaign_history"("brandId");
CREATE INDEX IF NOT EXISTS "campaign_history_status_idx" ON "campaign_history"("status");
CREATE INDEX IF NOT EXISTS "campaign_history_createdAt_idx" ON "campaign_history"("createdAt");

-- ============================================================================
-- 4. CREATE MISSING FOREIGN KEY CONSTRAINTS (ONLY IF THEY DON'T EXIST)
-- ============================================================================

-- Add foreign key constraints only if they don't exist
DO $$
BEGIN
    -- applications to gigs foreign key
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_gigId_fkey') THEN
        ALTER TABLE "applications" ADD CONSTRAINT "applications_gigId_fkey" 
        FOREIGN KEY ("gigId") REFERENCES "gigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Added applications_gigId_fkey constraint';
    END IF;
    
    -- submissions to gigs foreign key
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submissions_gigId_fkey') THEN
        ALTER TABLE "submissions" ADD CONSTRAINT "submissions_gigId_fkey" 
        FOREIGN KEY ("gigId") REFERENCES "gigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Added submissions_gigId_fkey constraint';
    END IF;
    
    -- submissions to applications foreign key
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submissions_applicationId_fkey') THEN
        ALTER TABLE "submissions" ADD CONSTRAINT "submissions_applicationId_fkey" 
        FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        RAISE NOTICE 'Added submissions_applicationId_fkey constraint';
    END IF;
    
    -- gigAssignments to gigs foreign key
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gigAssignments_gigId_fkey') THEN
        ALTER TABLE "gigAssignments" ADD CONSTRAINT "gigAssignments_gigId_fkey" 
        FOREIGN KEY ("gigId") REFERENCES "gigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Added gigAssignments_gigId_fkey constraint';
    END IF;
    
    -- gigAssignments to applications foreign key
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gigAssignments_applicationId_fkey') THEN
        ALTER TABLE "gigAssignments" ADD CONSTRAINT "gigAssignments_applicationId_fkey" 
        FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        RAISE NOTICE 'Added gigAssignments_applicationId_fkey constraint';
    END IF;
    
    -- gigMilestones to gigAssignments foreign key
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gigMilestones_assignmentId_fkey') THEN
        ALTER TABLE "gigMilestones" ADD CONSTRAINT "gigMilestones_assignmentId_fkey" 
        FOREIGN KEY ("assignmentId") REFERENCES "gigAssignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Added gigMilestones_assignmentId_fkey constraint';
    END IF;
    
    -- gigTasks to gigAssignments foreign key
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gigTasks_assignmentId_fkey') THEN
        ALTER TABLE "gigTasks" ADD CONSTRAINT "gigTasks_assignmentId_fkey" 
        FOREIGN KEY ("assignmentId") REFERENCES "gigAssignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Added gigTasks_assignmentId_fkey constraint';
    END IF;
    
    -- gigTasks to gigMilestones foreign key (optional)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gigTasks_milestoneId_fkey') THEN
        ALTER TABLE "gigTasks" ADD CONSTRAINT "gigTasks_milestoneId_fkey" 
        FOREIGN KEY ("milestoneId") REFERENCES "gigMilestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        RAISE NOTICE 'Added gigTasks_milestoneId_fkey constraint';
    END IF;
    
    -- application_work_history to applications foreign key
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'application_work_history_applicationId_fkey') THEN
        ALTER TABLE "application_work_history" ADD CONSTRAINT "application_work_history_applicationId_fkey" 
        FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Added application_work_history_applicationId_fkey constraint';
    END IF;
    
    -- application_work_history to gigs foreign key
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'application_work_history_gigId_fkey') THEN
        ALTER TABLE "application_work_history" ADD CONSTRAINT "application_work_history_gigId_fkey" 
        FOREIGN KEY ("gigId") REFERENCES "gigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Added application_work_history_gigId_fkey constraint';
    END IF;
    
    -- campaign_history to gigs foreign key
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'campaign_history_gigId_fkey') THEN
        ALTER TABLE "campaign_history" ADD CONSTRAINT "campaign_history_gigId_fkey" 
        FOREIGN KEY ("gigId") REFERENCES "gigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Added campaign_history_gigId_fkey constraint';
    END IF;
END $$;

-- ============================================================================
-- 5. VERIFY MIGRATION SUCCESS
-- ============================================================================

-- Check if all tables exist
DO $$
DECLARE
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    tbl_name TEXT;
    tables_to_check TEXT[] := ARRAY['gigs', 'applications', 'submissions', 'gigBoostEvents', 'gigCreditEvents', 'gigAssignments', 'gigMilestones', 'gigTasks', 'application_work_history', 'campaign_history'];
BEGIN
    FOREACH tbl_name IN ARRAY tables_to_check
    LOOP
        IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = tbl_name) THEN
            missing_tables := array_append(missing_tables, tbl_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'Missing tables: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE 'All required tables exist';
    END IF;
END $$;

-- Check if isPublic column exists in gigs table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'gigs' AND column_name = 'isPublic'
    ) THEN
        RAISE EXCEPTION 'isPublic column missing from gigs table';
    ELSE
        RAISE NOTICE 'isPublic column exists in gigs table';
    END IF;
END $$;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

SELECT 'SUCCESS: Gig service migration completed safely!' as result;