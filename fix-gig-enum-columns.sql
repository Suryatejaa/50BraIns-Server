-- Fix Gig Service Column Type Conversion
-- Run this script in Supabase SQL Editor to convert TEXT columns to proper enum types

-- Step 1: Create enum types if they don't exist
DO $$ BEGIN
    CREATE TYPE GigStatus AS ENUM (
        'DRAFT', 'OPEN', 'PAUSED', 'IN_REVIEW', 'ASSIGNED', 
        'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'CANCELLED', 'EXPIRED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ApplicationStatus AS ENUM (
        'PENDING', 'APPROVED', 'SUBMITTED', 'CLOSED', 'REJECTED', 'WITHDRAWN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE SubmissionStatus AS ENUM (
        'PENDING', 'APPROVED', 'REJECTED', 'REVISION'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE GigAssignmentStatus AS ENUM (
        'ACTIVE', 'COMPLETED', 'CANCELLED', 'ON_HOLD'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE GigMilestoneStatus AS ENUM (
        'PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE GigTaskStatus AS ENUM (
        'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE GigType AS ENUM (
        'PRODUCT', 'VISIT', 'REMOTE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Convert table columns to use enum types
-- First, ensure default values for any NULL status columns
UPDATE gigs SET status = 'DRAFT' WHERE status IS NULL OR status = '';
UPDATE gigs SET gig_type = 'REMOTE' WHERE gig_type IS NULL OR gig_type = '';

-- Convert gigs table columns (drop defaults first, then convert, then re-add)
-- Handle status column
ALTER TABLE gigs ALTER COLUMN status DROP DEFAULT;
ALTER TABLE gigs 
    ALTER COLUMN status TYPE GigStatus USING status::text::GigStatus;
ALTER TABLE gigs ALTER COLUMN status SET DEFAULT 'DRAFT'::GigStatus;

-- Handle gig_type column  
ALTER TABLE gigs ALTER COLUMN gig_type DROP DEFAULT;
ALTER TABLE gigs 
    ALTER COLUMN gig_type TYPE GigType USING gig_type::text::GigType;
ALTER TABLE gigs ALTER COLUMN gig_type SET DEFAULT 'REMOTE'::GigType;

-- Convert gig_applications table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gig_applications') THEN
        -- Set default for any NULL status
        UPDATE gig_applications SET status = 'PENDING' WHERE status IS NULL OR status = '';
        -- Drop default, convert type, re-add default
        ALTER TABLE gig_applications ALTER COLUMN status DROP DEFAULT;
        ALTER TABLE gig_applications 
            ALTER COLUMN status TYPE ApplicationStatus USING status::text::ApplicationStatus;
        ALTER TABLE gig_applications ALTER COLUMN status SET DEFAULT 'PENDING'::ApplicationStatus;
    END IF;
END $$;

-- Convert gig_submissions table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gig_submissions') THEN
        -- Set default for any NULL status
        UPDATE gig_submissions SET status = 'PENDING' WHERE status IS NULL OR status = '';
        -- Drop default, convert type, re-add default
        ALTER TABLE gig_submissions ALTER COLUMN status DROP DEFAULT;
        ALTER TABLE gig_submissions 
            ALTER COLUMN status TYPE SubmissionStatus USING status::text::SubmissionStatus;
        ALTER TABLE gig_submissions ALTER COLUMN status SET DEFAULT 'PENDING'::SubmissionStatus;
    END IF;
END $$;

-- Convert gig_assignments table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gig_assignments') THEN
        -- Set default for any NULL status
        UPDATE gig_assignments SET status = 'ACTIVE' WHERE status IS NULL OR status = '';
        -- Drop default, convert type, re-add default
        ALTER TABLE gig_assignments ALTER COLUMN status DROP DEFAULT;
        ALTER TABLE gig_assignments 
            ALTER COLUMN status TYPE GigAssignmentStatus USING status::text::GigAssignmentStatus;
        ALTER TABLE gig_assignments ALTER COLUMN status SET DEFAULT 'ACTIVE'::GigAssignmentStatus;
    END IF;
END $$;

-- Convert gig_milestones table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gig_milestones') THEN
        -- Set default for any NULL status
        UPDATE gig_milestones SET status = 'PENDING' WHERE status IS NULL OR status = '';
        -- Drop default, convert type, re-add default
        ALTER TABLE gig_milestones ALTER COLUMN status DROP DEFAULT;
        ALTER TABLE gig_milestones 
            ALTER COLUMN status TYPE GigMilestoneStatus USING status::text::GigMilestoneStatus;
        ALTER TABLE gig_milestones ALTER COLUMN status SET DEFAULT 'PENDING'::GigMilestoneStatus;
    END IF;
END $$;

-- Convert gig_tasks table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gig_tasks') THEN
        -- Set default for any NULL status
        UPDATE gig_tasks SET status = 'TODO' WHERE status IS NULL OR status = '';
        -- Drop default, convert type, re-add default
        ALTER TABLE gig_tasks ALTER COLUMN status DROP DEFAULT;
        ALTER TABLE gig_tasks 
            ALTER COLUMN status TYPE GigTaskStatus USING status::text::GigTaskStatus;
        ALTER TABLE gig_tasks ALTER COLUMN status SET DEFAULT 'TODO'::GigTaskStatus;
    END IF;
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Gig Service enum column types have been fixed!';
    RAISE NOTICE '🔄 All status columns now use proper enum types';
    RAISE NOTICE '🚀 Prisma queries should work correctly now';
END $$;