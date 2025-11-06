-- Migration script to add DELIVERED status to application enums
-- Run this in Supabase SQL Editor

-- Step 1: Add DELIVERED to ApplicationStatus enum
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';

-- Step 2: Add DELIVERED to WorkHistoryApplicationStatus enum  
ALTER TYPE "WorkHistoryApplicationStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';

-- Commit the enum changes before using them
COMMIT;

-- Step 3: Start a new transaction for data updates
BEGIN;

-- Update any existing applications that might be in an intermediate state
-- This ensures data consistency after the schema change
UPDATE "applications" 
SET "status" = 'APPROVED' 
WHERE "status" NOT IN ('PENDING', 'APPROVED', 'DELIVERED', 'SUBMITTED', 'CLOSED', 'REJECTED', 'WITHDRAWN');

-- Update work history to match
UPDATE "application_work_history" 
SET "applicationStatus" = 'APPROVED' 
WHERE "applicationStatus" NOT IN ('PENDING', 'APPROVED', 'DELIVERED', 'SUBMITTED', 'CLOSED', 'REJECTED', 'WITHDRAWN');

-- Verify the enum changes
SELECT enum_range(NULL::public."ApplicationStatus");
SELECT enum_range(NULL::public."WorkHistoryApplicationStatus");

COMMIT;