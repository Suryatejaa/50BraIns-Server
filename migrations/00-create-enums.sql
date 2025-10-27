-- 00-CREATE-ENUMS.sql
-- This script creates all enum types needed across all services
-- Run this script FIRST before any service migrations

-- ============================================================================
-- CREATE ALL ENUM TYPES FOR SERVICES
-- ============================================================================

-- Disable triggers temporarily
SET session_replication_role = 'replica';

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
    DROP TYPE IF EXISTS "WorkHistoryApplicationStatus" CASCADE;
    DROP TYPE IF EXISTS "WorkHistorySubmissionStatus" CASCADE;
    DROP TYPE IF EXISTS "WorkHistoryPaymentStatus" CASCADE;
    DROP TYPE IF EXISTS "CampaignStatus" CASCADE;
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

-- Re-enable triggers
SET session_replication_role = 'origin';

SELECT 'SUCCESS: All enum types created!' as result;