-- Fix Gig Service Database Enums
-- Run this script in Supabase SQL Editor to create all missing enum types for gig-service

-- Drop existing enums if they exist to avoid conflicts
DROP TYPE IF EXISTS GigStatus CASCADE;
DROP TYPE IF EXISTS ApplicationStatus CASCADE;
DROP TYPE IF EXISTS SubmissionStatus CASCADE;
DROP TYPE IF EXISTS GigAssignmentStatus CASCADE;
DROP TYPE IF EXISTS GigMilestoneStatus CASCADE;
DROP TYPE IF EXISTS GigTaskStatus CASCADE;
DROP TYPE IF EXISTS GigType CASCADE;

-- Create GigStatus enum
CREATE TYPE GigStatus AS ENUM (
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

-- Create ApplicationStatus enum
CREATE TYPE ApplicationStatus AS ENUM (
    'PENDING',
    'APPROVED',
    'SUBMITTED',
    'CLOSED',
    'REJECTED',
    'WITHDRAWN'
);

-- Create SubmissionStatus enum
CREATE TYPE SubmissionStatus AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'REVISION'
);

-- Create GigAssignmentStatus enum
CREATE TYPE GigAssignmentStatus AS ENUM (
    'ACTIVE',
    'COMPLETED',
    'CANCELLED',
    'ON_HOLD'
);

-- Create GigMilestoneStatus enum
CREATE TYPE GigMilestoneStatus AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
    'PAID'
);

-- Create GigTaskStatus enum
CREATE TYPE GigTaskStatus AS ENUM (
    'TODO',
    'IN_PROGRESS',
    'REVIEW',
    'DONE',
    'BLOCKED'
);

-- Create GigType enum
CREATE TYPE GigType AS ENUM (
    'PRODUCT',
    'VISIT',
    'REMOTE'
);

-- Update existing tables to use the new enum types
-- Note: If there are existing records, you might need to update them first

-- Update gigs table status column to use GigStatus enum
ALTER TABLE gigs 
    ALTER COLUMN status TYPE GigStatus USING status::text::GigStatus;

-- Update gigs table gig_type column to use GigType enum  
ALTER TABLE gigs 
    ALTER COLUMN gig_type TYPE GigType USING gig_type::text::GigType;

-- Update gig_applications table status column to use ApplicationStatus enum
ALTER TABLE gig_applications 
    ALTER COLUMN status TYPE ApplicationStatus USING status::text::ApplicationStatus;

-- Update gig_submissions table status column to use SubmissionStatus enum
ALTER TABLE gig_submissions 
    ALTER COLUMN status TYPE SubmissionStatus USING status::text::SubmissionStatus;

-- Update gig_assignments table status column to use GigAssignmentStatus enum
ALTER TABLE gig_assignments 
    ALTER COLUMN status TYPE GigAssignmentStatus USING status::text::GigAssignmentStatus;

-- Update gig_milestones table status column to use GigMilestoneStatus enum
ALTER TABLE gig_milestones 
    ALTER COLUMN status TYPE GigMilestoneStatus USING status::text::GigMilestoneStatus;

-- Update gig_tasks table status column to use GigTaskStatus enum
ALTER TABLE gig_tasks 
    ALTER COLUMN status TYPE GigTaskStatus USING status::text::GigTaskStatus;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ All Gig Service enum types have been created successfully!';
    RAISE NOTICE '📋 Created enums: GigStatus, ApplicationStatus, SubmissionStatus, GigAssignmentStatus, GigMilestoneStatus, GigTaskStatus, GigType';
    RAISE NOTICE '🔄 Updated all existing table columns to use the new enum types';
    RAISE NOTICE '🚀 Gig service is now ready for Prisma operations!';
END $$;