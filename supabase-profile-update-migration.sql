-- =====================================================================================
-- 50BraIns Profile Update System - Production Database Migration
-- =====================================================================================
-- Date: October 31, 2025
-- Purpose: Add profile update functionality with username tracking and email update OTP
-- Services: auth-service, user-service
-- =====================================================================================

-- WARNING: Run this script during maintenance window
-- This script should be executed in the following order:
-- 1. Backup your database before running
-- 2. Run in a transaction to allow rollback if needed
-- 3. Test on staging environment first

-- Start transaction for safety
BEGIN;

-- =====================================================================================
-- STEP 1: Add EMAIL_UPDATE to OTPPurpose enum
-- =====================================================================================

-- Check if EMAIL_UPDATE already exists in the enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'EMAIL_UPDATE' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'OTPPurpose'
        )
    ) THEN
        -- Add EMAIL_UPDATE to the existing OTPPurpose enum
        ALTER TYPE "OTPPurpose" ADD VALUE 'EMAIL_UPDATE';
        
        -- Log the change
        RAISE NOTICE 'Added EMAIL_UPDATE to OTPPurpose enum';
    ELSE
        RAISE NOTICE 'EMAIL_UPDATE already exists in OTPPurpose enum';
    END IF;
END
$$;

-- =====================================================================================
-- STEP 2: Add lastUsernameUpdated column to authUsers table
-- =====================================================================================

-- Check if lastUsernameUpdated column already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'authUsers' 
        AND column_name = 'lastUsernameUpdated'
        AND table_schema = 'public'
    ) THEN
        -- Add the lastUsernameUpdated column
        ALTER TABLE "public"."authUsers" 
        ADD COLUMN "lastUsernameUpdated" TIMESTAMPTZ(6);
        
        -- Add comment to document the column purpose
        COMMENT ON COLUMN "public"."authUsers"."lastUsernameUpdated" 
        IS 'Timestamp when username was last updated. Used to enforce 15-day cooldown period.';
        
        -- Log the change
        RAISE NOTICE 'Added lastUsernameUpdated column to authUsers table';
    ELSE
        RAISE NOTICE 'lastUsernameUpdated column already exists in authUsers table';
    END IF;
END
$$;

-- =====================================================================================
-- STEP 3: Add the same column to user-service Users table (if it doesn't exist)
-- =====================================================================================

-- Note: This assumes user-service uses the same database
-- If user-service uses a different database, run this separately there

-- Check if lastUsernameUpdated column exists in Users table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'Users' 
        AND table_schema = 'public'
    ) THEN
        -- Check if column exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'Users' 
            AND column_name = 'lastUsernameUpdated'
            AND table_schema = 'public'
        ) THEN
            -- Add the lastUsernameUpdated column to user-service Users table
            ALTER TABLE "public"."Users" 
            ADD COLUMN "lastUsernameUpdated" TIMESTAMPTZ(6);
            
            -- Add comment
            COMMENT ON COLUMN "public"."Users"."lastUsernameUpdated" 
            IS 'Synced from auth-service. Timestamp when username was last updated.';
            
            RAISE NOTICE 'Added lastUsernameUpdated column to Users table';
        ELSE
            RAISE NOTICE 'lastUsernameUpdated column already exists in Users table';
        END IF;
    ELSE
        RAISE NOTICE 'Users table not found - may be in different database or schema';
    END IF;
END
$$;

-- =====================================================================================
-- STEP 4: Create index for lastUsernameUpdated column (optional but recommended)
-- =====================================================================================

-- Add index for performance if users frequently check username update eligibility
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'authUsers' 
        AND indexname = 'idx_auth_users_last_username_updated'
    ) THEN
        CREATE INDEX "idx_auth_users_last_username_updated" 
        ON "public"."authUsers" ("lastUsernameUpdated")
        WHERE "lastUsernameUpdated" IS NOT NULL;
        
        RAISE NOTICE 'Created index on lastUsernameUpdated column';
    ELSE
        RAISE NOTICE 'Index on lastUsernameUpdated already exists';
    END IF;
END
$$;

-- =====================================================================================
-- STEP 5: Update any existing users with NULL lastUsernameUpdated (optional)
-- =====================================================================================

-- This step is optional - it sets lastUsernameUpdated to a past date for existing users
-- so they can immediately update their username if needed

-- Uncomment the following if you want to allow existing users to update usernames immediately:
/*
UPDATE "public"."authUsers" 
SET "lastUsernameUpdated" = '2023-01-01 00:00:00'::timestamptz
WHERE "lastUsernameUpdated" IS NULL 
AND "username" IS NOT NULL;

RAISE NOTICE 'Updated existing users lastUsernameUpdated timestamp';
*/

-- =====================================================================================
-- STEP 6: Verification Queries
-- =====================================================================================

-- Verify the enum was updated
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'OTPPurpose')
ORDER BY enumlabel;

-- Verify the column was added to authUsers
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'authUsers' 
AND table_schema = 'public'
AND column_name = 'lastUsernameUpdated';

-- Verify the column was added to Users (if table exists)
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'Users' 
AND table_schema = 'public'
AND column_name = 'lastUsernameUpdated';

-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('authUsers', 'Users') 
AND indexname LIKE '%username%';

-- =====================================================================================
-- STEP 7: Final Status Report
-- =====================================================================================

DO $$
DECLARE
    enum_exists BOOLEAN;
    auth_column_exists BOOLEAN;
    user_column_exists BOOLEAN;
    index_exists BOOLEAN;
BEGIN
    -- Check enum
    SELECT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'EMAIL_UPDATE' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'OTPPurpose')
    ) INTO enum_exists;
    
    -- Check auth column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'authUsers' 
        AND column_name = 'lastUsernameUpdated'
    ) INTO auth_column_exists;
    
    -- Check user column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Users' 
        AND column_name = 'lastUsernameUpdated'
    ) INTO user_column_exists;
    
    -- Check index
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_auth_users_last_username_updated'
    ) INTO index_exists;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION COMPLETION REPORT';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'EMAIL_UPDATE enum: %', CASE WHEN enum_exists THEN '✅ SUCCESS' ELSE '❌ FAILED' END;
    RAISE NOTICE 'authUsers.lastUsernameUpdated: %', CASE WHEN auth_column_exists THEN '✅ SUCCESS' ELSE '❌ FAILED' END;
    RAISE NOTICE 'Users.lastUsernameUpdated: %', CASE WHEN user_column_exists THEN '✅ SUCCESS' ELSE '⚠️ NOT FOUND' END;
    RAISE NOTICE 'Performance index: %', CASE WHEN index_exists THEN '✅ SUCCESS' ELSE '❌ FAILED' END;
    RAISE NOTICE '========================================';
    
    -- If everything is successful, we can commit
    IF enum_exists AND auth_column_exists AND index_exists THEN
        RAISE NOTICE 'Migration completed successfully! ✅';
        RAISE NOTICE 'You can now COMMIT this transaction.';
    ELSE
        RAISE NOTICE 'Some items failed. Review the errors above.';
        RAISE NOTICE 'Consider ROLLBACK if critical items failed.';
    END IF;
END
$$;

-- =====================================================================================
-- COMMIT OR ROLLBACK INSTRUCTIONS
-- =====================================================================================

-- If everything looks good, commit the transaction:
-- COMMIT;

-- If there were errors, rollback:
-- ROLLBACK;

-- ⚠️  IMPORTANT: Review the output above before committing!

-- =====================================================================================
-- POST-MIGRATION STEPS
-- =====================================================================================

/*
After successful migration:

1. 🔄 Restart your services:
   - auth-service (to recognize new enum value)
   - user-service (to handle new events)

2. 🧪 Test the new functionality:
   - Username updates with 15-day restriction
   - Email updates with OTP verification
   - Event publishing and sync between services

3. 📊 Monitor:
   - Check application logs for any errors
   - Verify OTP rate limiting is working
   - Confirm event-driven sync is functioning

4. 🚀 Deploy application code:
   - Ensure the new profile update endpoints are deployed
   - Verify API Gateway routing includes new endpoints
   - Test end-to-end functionality

5. 📋 Update documentation:
   - API documentation with new endpoints
   - Rate limiting information for users
   - Username update policy (15-day restriction)
*/