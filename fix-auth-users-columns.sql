-- Fix auth_users table missing columns
-- Run this in Supabase SQL Editor

-- Add missing columns to auth_users table if they don't exist
DO $$ 
BEGIN
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'auth_users' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE auth_users ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_active column to auth_users table';
    ELSE
        RAISE NOTICE 'is_active column already exists in auth_users table';
    END IF;
    
    -- Add email_verified column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'auth_users' 
        AND column_name = 'email_verified'
    ) THEN
        ALTER TABLE auth_users ADD COLUMN email_verified BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added email_verified column to auth_users table';
    ELSE
        RAISE NOTICE 'email_verified column already exists in auth_users table';
    END IF;
    
    -- Add email_verified_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'auth_users' 
        AND column_name = 'email_verified_at'
    ) THEN
        ALTER TABLE auth_users ADD COLUMN email_verified_at TIMESTAMPTZ;
        RAISE NOTICE 'Added email_verified_at column to auth_users table';
    ELSE
        RAISE NOTICE 'email_verified_at column already exists in auth_users table';
    END IF;
    
    -- Add other commonly needed columns that might be missing
    -- first_name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'auth_users' 
        AND column_name = 'first_name'
    ) THEN
        ALTER TABLE auth_users ADD COLUMN first_name TEXT;
        RAISE NOTICE 'Added first_name column to auth_users table';
    END IF;
    
    -- last_name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'auth_users' 
        AND column_name = 'last_name'
    ) THEN
        ALTER TABLE auth_users ADD COLUMN last_name TEXT;
        RAISE NOTICE 'Added last_name column to auth_users table';
    END IF;
    
    -- created_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'auth_users' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE auth_users ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added created_at column to auth_users table';
    END IF;
    
    -- updated_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'auth_users' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE auth_users ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to auth_users table';
    END IF;
    
    -- last_login_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'auth_users' 
        AND column_name = 'last_login_at'
    ) THEN
        ALTER TABLE auth_users ADD COLUMN last_login_at TIMESTAMPTZ;
        RAISE NOTICE 'Added last_login_at column to auth_users table';
    END IF;
    
    -- last_active_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'auth_users' 
        AND column_name = 'last_active_at'
    ) THEN
        ALTER TABLE auth_users ADD COLUMN last_active_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added last_active_at column to auth_users table';
    END IF;
    
    -- is_banned
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'auth_users' 
        AND column_name = 'is_banned'
    ) THEN
        ALTER TABLE auth_users ADD COLUMN is_banned BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_banned column to auth_users table';
    END IF;
    
    -- ban_reason
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'auth_users' 
        AND column_name = 'ban_reason'
    ) THEN
        ALTER TABLE auth_users ADD COLUMN ban_reason TEXT;
        RAISE NOTICE 'Added ban_reason column to auth_users table';
    END IF;
    
    -- ban_expires_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'auth_users' 
        AND column_name = 'ban_expires_at'
    ) THEN
        ALTER TABLE auth_users ADD COLUMN ban_expires_at TIMESTAMPTZ;
        RAISE NOTICE 'Added ban_expires_at column to auth_users table';
    END IF;
    
    -- banned_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'auth_users' 
        AND column_name = 'banned_at'
    ) THEN
        ALTER TABLE auth_users ADD COLUMN banned_at TIMESTAMPTZ;
        RAISE NOTICE 'Added banned_at column to auth_users table';
    END IF;
    
    -- banned_by
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'auth_users' 
        AND column_name = 'banned_by'
    ) THEN
        ALTER TABLE auth_users ADD COLUMN banned_by TEXT;
        RAISE NOTICE 'Added banned_by column to auth_users table';
    END IF;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error occurred: %', SQLERRM;
END $$;

-- Verify the changes
DO $$
DECLARE
    column_count INT;
BEGIN
    SELECT COUNT(*) INTO column_count 
    FROM information_schema.columns 
    WHERE table_name = 'auth_users';
    
    RAISE NOTICE '✅ auth_users table now has % columns', column_count;
    RAISE NOTICE '🔧 All required auth columns should now be available!';
END $$;