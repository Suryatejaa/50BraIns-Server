-- =====================================================================================
-- FIXED: Direct Migration for Profile Update System
-- =====================================================================================
-- This is a simplified version that directly adds the missing components

-- =====================================================================================
-- STEP 1: Add EMAIL_UPDATE to OTPPurpose enum (if not exists)
-- =====================================================================================

-- Add EMAIL_UPDATE to the existing OTPPurpose enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'EMAIL_UPDATE' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'OTPPurpose'
        )
    ) THEN
        ALTER TYPE "OTPPurpose" ADD VALUE 'EMAIL_UPDATE';
        RAISE NOTICE '✅ Added EMAIL_UPDATE to OTPPurpose enum';
    ELSE
        RAISE NOTICE '✅ EMAIL_UPDATE already exists in OTPPurpose enum';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error adding EMAIL_UPDATE enum: %', SQLERRM;
END
$$;

-- =====================================================================================
-- STEP 2: Add lastUsernameUpdated column to authUsers table (FORCE)
-- =====================================================================================

-- Direct approach - add the column
DO $$
BEGIN
    -- Try to add the column directly
    BEGIN
        ALTER TABLE "public"."authUsers" 
        ADD COLUMN "lastUsernameUpdated" TIMESTAMPTZ(6);
        
        RAISE NOTICE '✅ Added lastUsernameUpdated column to authUsers table';
        
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE '✅ lastUsernameUpdated column already exists in authUsers table';
        WHEN OTHERS THEN
            RAISE NOTICE '❌ Error adding lastUsernameUpdated column: %', SQLERRM;
    END;
    
    -- Add comment to document the column purpose
    BEGIN
        COMMENT ON COLUMN "public"."authUsers"."lastUsernameUpdated" 
        IS 'Timestamp when username was last updated. Used to enforce 15-day cooldown period.';
        RAISE NOTICE '✅ Added comment to lastUsernameUpdated column';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Could not add comment: %', SQLERRM;
    END;
    
END
$$;

-- =====================================================================================
-- STEP 3: Add to Users table (if exists)
-- =====================================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'Users' 
        AND table_schema = 'public'
    ) THEN
        BEGIN
            ALTER TABLE "public"."Users" 
            ADD COLUMN "lastUsernameUpdated" TIMESTAMPTZ(6);
            
            RAISE NOTICE '✅ Added lastUsernameUpdated column to Users table';
            
        EXCEPTION
            WHEN duplicate_column THEN
                RAISE NOTICE '✅ lastUsernameUpdated column already exists in Users table';
            WHEN OTHERS THEN
                RAISE NOTICE '❌ Error adding lastUsernameUpdated to Users table: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'ℹ️ Users table not found (may be in different schema/database)';
    END IF;
END
$$;

-- =====================================================================================
-- STEP 4: Create index
-- =====================================================================================

DO $$
BEGIN
    CREATE INDEX IF NOT EXISTS "idx_auth_users_last_username_updated" 
    ON "public"."authUsers" ("lastUsernameUpdated")
    WHERE "lastUsernameUpdated" IS NOT NULL;
    
    RAISE NOTICE '✅ Created/verified index on lastUsernameUpdated column';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error creating index: %', SQLERRM;
END
$$;

-- =====================================================================================
-- VERIFICATION
-- =====================================================================================

-- Final verification
DO $$
DECLARE
    enum_count INTEGER;
    auth_column_exists BOOLEAN;
    users_column_exists BOOLEAN;
BEGIN
    -- Check enum
    SELECT COUNT(*) INTO enum_count
    FROM pg_enum 
    WHERE enumlabel = 'EMAIL_UPDATE' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'OTPPurpose');
    
    -- Check authUsers column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'authUsers' 
        AND column_name = 'lastUsernameUpdated'
        AND table_schema = 'public'
    ) INTO auth_column_exists;
    
    -- Check Users column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Users' 
        AND column_name = 'lastUsernameUpdated'
        AND table_schema = 'public'
    ) INTO users_column_exists;
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'FINAL VERIFICATION REPORT';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'EMAIL_UPDATE enum: %', CASE WHEN enum_count > 0 THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE 'authUsers.lastUsernameUpdated: %', CASE WHEN auth_column_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE 'Users.lastUsernameUpdated: %', CASE WHEN users_column_exists THEN '✅ EXISTS' ELSE 'ℹ️ NOT FOUND' END;
    RAISE NOTICE '==========================================';
    
    IF auth_column_exists AND enum_count > 0 THEN
        RAISE NOTICE '🎉 Migration successful! Please regenerate Prisma client.';
    ELSE
        RAISE NOTICE '⚠️ Some items are missing. Check the errors above.';
    END IF;
END
$$;