-- =============================================================================
-- 50Brains Production Database - OTP System Migration
-- =============================================================================
-- This script safely adds OTP functionality to production without affecting existing data
-- Execute this script in your production database SQL editor

-- =============================================================================
-- SAFETY CHECKS AND BACKUP RECOMMENDATIONS
-- =============================================================================
-- IMPORTANT: Before running this script in production:
-- 1. Create a database backup
-- 2. Test this script in a staging environment first
-- 3. Run during low-traffic hours
-- 4. Monitor the execution and be ready to rollback if needed
-- =============================================================================

-- Step 1: Create OTPPurpose enum (safe if already exists)
-- =============================================================================
DO $$ 
BEGIN
    -- Check if enum already exists
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OTPPurpose') THEN
        CREATE TYPE "OTPPurpose" AS ENUM (
            'REGISTER',
            'LOGIN', 
            'FORGOT_PASSWORD',
            'CHANGE_PASSWORD',
            'EMAIL_VERIFICATION'
        );
        RAISE NOTICE 'Created OTPPurpose enum';
    ELSE
        RAISE NOTICE 'OTPPurpose enum already exists - skipping';
    END IF;
END $$;

-- Step 2: Create authOTPRecords table (safe if already exists)
-- =============================================================================
DO $$
BEGIN
    -- Check if table already exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'authOTPRecords') THEN
        CREATE TABLE "public"."authOTPRecords" (
            "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
            "email" TEXT NOT NULL,
            "otpHash" TEXT NOT NULL,
            "purpose" "OTPPurpose" NOT NULL,
            "userId" TEXT,
            "expiresAt" TIMESTAMPTZ NOT NULL,
            "isUsed" BOOLEAN NOT NULL DEFAULT false,
            "usedAt" TIMESTAMPTZ,
            "attempts" INTEGER NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            
            CONSTRAINT "authOTPRecords_pkey" PRIMARY KEY ("id")
        );
        RAISE NOTICE 'Created authOTPRecords table';
    ELSE
        RAISE NOTICE 'authOTPRecords table already exists - skipping';
    END IF;
END $$;

-- Step 3: Create indexes for optimal performance (safe if already exist)
-- =============================================================================
DO $$ 
BEGIN
    -- Index for email and purpose lookup (most common query)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_otp_email_purpose') THEN
        CREATE INDEX "idx_otp_email_purpose" ON "public"."authOTPRecords"("email", "purpose");
        RAISE NOTICE 'Created index: idx_otp_email_purpose';
    END IF;

    -- Index for expiration cleanup queries
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_otp_expires_at') THEN
        CREATE INDEX "idx_otp_expires_at" ON "public"."authOTPRecords"("expiresAt");
        RAISE NOTICE 'Created index: idx_otp_expires_at';
    END IF;

    -- Index for used status filtering
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_otp_is_used') THEN
        CREATE INDEX "idx_otp_is_used" ON "public"."authOTPRecords"("isUsed");
        RAISE NOTICE 'Created index: idx_otp_is_used';
    END IF;

    -- Composite index for active OTP lookups
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_otp_active_lookup') THEN
        CREATE INDEX "idx_otp_active_lookup" ON "public"."authOTPRecords"("email", "purpose", "isUsed", "expiresAt");
        RAISE NOTICE 'Created index: idx_otp_active_lookup';
    END IF;

    -- Index for user-specific OTP lookups
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_otp_user_id') THEN
        CREATE INDEX "idx_otp_user_id" ON "public"."authOTPRecords"("userId") WHERE "userId" IS NOT NULL;
        RAISE NOTICE 'Created index: idx_otp_user_id';
    END IF;
END $$;

-- Step 4: Create or update trigger function with proper column quoting
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    -- Use proper column quoting for camelCase columns
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger for automatic updatedAt updates
-- =============================================================================
DO $$
BEGIN
    -- Drop existing trigger if it exists (to ensure clean recreation)
    DROP TRIGGER IF EXISTS update_authOTPRecords_updated_at ON "public"."authOTPRecords";
    DROP TRIGGER IF EXISTS update_authotprecords_updated_at ON "public"."authOTPRecords";
    
    -- Create the trigger
    CREATE TRIGGER update_authOTPRecords_updated_at 
        BEFORE UPDATE ON "public"."authOTPRecords" 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
    
    RAISE NOTICE 'Created trigger: update_authOTPRecords_updated_at';
END $$;

-- Step 6: Enable Row Level Security (RLS) for the OTP table
-- =============================================================================
DO $$
BEGIN
    -- Enable RLS on the table
    ALTER TABLE "public"."authOTPRecords" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on authOTPRecords table';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'RLS already enabled or error: %', SQLERRM;
END $$;

-- Step 7: Create RLS policies for security
-- =============================================================================
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Service role can access all OTP records" ON "public"."authOTPRecords";
    DROP POLICY IF EXISTS "Users can access their own OTP records" ON "public"."authOTPRecords";
    
    -- Allow service role full access (for backend operations)
    CREATE POLICY "Service role can access all OTP records" ON "public"."authOTPRecords"
        FOR ALL USING (auth.role() = 'service_role');
    
    -- Allow authenticated users to access only their own OTP records
    CREATE POLICY "Users can access their own OTP records" ON "public"."authOTPRecords"
        FOR SELECT USING (
            auth.uid()::text = "userId" OR 
            auth.email() = "email"
        );
    
    RAISE NOTICE 'Created RLS policies for authOTPRecords';
END $$;

-- Step 8: Grant necessary permissions
-- =============================================================================
DO $$ 
BEGIN
    -- Grant permissions to authenticated users
    BEGIN
        GRANT SELECT ON "public"."authOTPRecords" TO authenticated;
        RAISE NOTICE 'Granted SELECT permission to authenticated users';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'SELECT permission already granted to authenticated users';
    END;

    -- Grant full permissions to service role (for backend operations)
    BEGIN
        GRANT ALL ON "public"."authOTPRecords" TO service_role;
        RAISE NOTICE 'Granted ALL permissions to service_role';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'ALL permissions already granted to service_role';
    END;

    -- Grant usage on the enum type
    BEGIN
        GRANT USAGE ON TYPE "OTPPurpose" TO authenticated, service_role;
        RAISE NOTICE 'Granted USAGE on OTPPurpose enum';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'USAGE permission already granted on OTPPurpose enum';
    END;
END $$;

-- Step 9: Create cleanup function for expired OTPs
-- =============================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete expired or used OTP records
    DELETE FROM "public"."authOTPRecords" 
    WHERE "expiresAt" < NOW() OR "isUsed" = true;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Optional foreign key constraint (commented out for safety)
-- =============================================================================
-- Uncomment the following block if you want to enforce referential integrity
-- WARNING: This will fail if there are OTP records with invalid userId references
/*
DO $$
BEGIN
    -- Add foreign key constraint to link OTP records to users
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'authOTPRecords_userId_fkey'
    ) THEN
        ALTER TABLE "public"."authOTPRecords" 
        ADD CONSTRAINT "authOTPRecords_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "public"."authUsers"("id") 
        ON DELETE CASCADE ON UPDATE NO ACTION;
        
        RAISE NOTICE 'Added foreign key constraint: authOTPRecords_userId_fkey';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END $$;
*/

-- =============================================================================
-- MIGRATION VERIFICATION
-- =============================================================================

-- Verify the OTP table structure
DO $$
DECLARE
    table_exists BOOLEAN;
    enum_exists BOOLEAN;
    trigger_exists BOOLEAN;
    index_count INTEGER;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'authOTPRecords'
    ) INTO table_exists;
    
    -- Check if enum exists
    SELECT EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'OTPPurpose'
    ) INTO enum_exists;
    
    -- Check if trigger exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_authOTPRecords_updated_at'
    ) INTO trigger_exists;
    
    -- Count indexes
    SELECT COUNT(*) FROM pg_indexes 
    WHERE tablename = 'authOTPRecords' 
    INTO index_count;
    
    -- Report verification results
    RAISE NOTICE '=== MIGRATION VERIFICATION RESULTS ===';
    RAISE NOTICE 'OTP Table exists: %', table_exists;
    RAISE NOTICE 'OTPPurpose enum exists: %', enum_exists;
    RAISE NOTICE 'Update trigger exists: %', trigger_exists;
    RAISE NOTICE 'Number of indexes created: %', index_count;
    
    IF table_exists AND enum_exists AND trigger_exists AND index_count >= 5 THEN
        RAISE NOTICE '✅ OTP MIGRATION COMPLETED SUCCESSFULLY!';
    ELSE
        RAISE NOTICE '⚠️  MIGRATION MAY BE INCOMPLETE - Please check the logs above';
    END IF;
END $$;

-- Show final table structure
SELECT 
    'OTP Table Structure' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'authOTPRecords' 
ORDER BY ordinal_position;

-- Show created indexes
SELECT 
    'OTP Table Indexes' as info,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'authOTPRecords'
ORDER BY indexname;

-- Show enum values
SELECT 
    'OTP Purpose Values' as info,
    enumlabel as purpose_values
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'OTPPurpose')
ORDER BY enumsortorder;

-- =============================================================================
-- POST-MIGRATION RECOMMENDATIONS
-- =============================================================================
/*
IMPORTANT POST-MIGRATION STEPS:

1. 🔄 Update your application code:
   - Deploy the updated auth service with OTP functionality
   - Ensure Prisma client is regenerated: npx prisma generate

2. 🧪 Test OTP functionality:
   - Test user registration with OTP
   - Test login with OTP
   - Test password reset flow
   - Test email verification

3. 📧 Configure email service:
   - Ensure SMTP settings are correct in production
   - Test email delivery
   - Set up proper email templates

4. 🔍 Monitor the system:
   - Watch for any errors in application logs
   - Monitor database performance
   - Set up alerting for OTP failures

5. 🧹 Schedule cleanup:
   - Set up a cron job to run cleanup_expired_otps() periodically
   - Example: SELECT cleanup_expired_otps(); (run hourly)

6. 🔐 Security considerations:
   - Review RLS policies for your use case
   - Consider rate limiting on OTP requests
   - Monitor for abuse patterns

7. 📊 Analytics:
   - Track OTP success/failure rates
   - Monitor email delivery rates
   - Set up user flow analytics
*/

-- =============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- =============================================================================
/*
If you need to rollback this migration, run the following commands:

-- Remove the table and related objects
DROP TABLE IF EXISTS "public"."authOTPRecords" CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_otps() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP TYPE IF EXISTS "OTPPurpose" CASCADE;

-- Note: This will permanently delete all OTP data!
*/

SELECT '🎉 OTP PRODUCTION MIGRATION COMPLETED! 🎉' as final_message;