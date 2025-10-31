-- =============================================================================
-- 50Brains Auth Service - Safe OTP Migration (Handles Existing Objects)
-- =============================================================================

-- 1. Create OTPPurpose enum only if it doesn't exist
-- =============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OTPPurpose') THEN
        CREATE TYPE "OTPPurpose" AS ENUM (
            'REGISTER',
            'LOGIN', 
            'FORGOT_PASSWORD',
            'CHANGE_PASSWORD',
            'EMAIL_VERIFICATION'
        );
    END IF;
END $$;

-- 2. Create authOTPRecords table only if it doesn't exist
-- =============================================================================
CREATE TABLE IF NOT EXISTS "public"."authOTPRecords" (
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

-- 3. Create indexes only if they don't exist
-- =============================================================================

-- Check and create indexes safely
DO $$ 
BEGIN
    -- Index for email and purpose lookup
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_otp_email_purpose') THEN
        CREATE INDEX "idx_otp_email_purpose" ON "public"."authOTPRecords"("email", "purpose");
    END IF;

    -- Index for expiration cleanup queries
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_otp_expires_at') THEN
        CREATE INDEX "idx_otp_expires_at" ON "public"."authOTPRecords"("expiresAt");
    END IF;

    -- Index for used status filtering
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_otp_is_used') THEN
        CREATE INDEX "idx_otp_is_used" ON "public"."authOTPRecords"("isUsed");
    END IF;

    -- Composite index for active OTP lookups
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_otp_active_lookup') THEN
        CREATE INDEX "idx_otp_active_lookup" ON "public"."authOTPRecords"("email", "purpose", "isUsed", "expiresAt");
    END IF;

    -- Index for user-specific OTP lookups
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_otp_user_id') THEN
        CREATE INDEX "idx_otp_user_id" ON "public"."authOTPRecords"("userId") WHERE "userId" IS NOT NULL;
    END IF;
END $$;

-- 4. Create updated_at trigger function if not exists
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedAt = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. Create trigger for automatic updatedAt updates (drop if exists first)
-- =============================================================================
DROP TRIGGER IF EXISTS update_authOTPRecords_updated_at ON "public"."authOTPRecords";

CREATE TRIGGER update_authOTPRecords_updated_at 
    BEFORE UPDATE ON "public"."authOTPRecords" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Enable Row Level Security
-- =============================================================================
ALTER TABLE "public"."authOTPRecords" ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies safely (drop existing first)
-- =============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role can access all OTP records" ON "public"."authOTPRecords";
DROP POLICY IF EXISTS "Users can access their own OTP records" ON "public"."authOTPRecords";

-- Create policies
CREATE POLICY "Service role can access all OTP records" ON "public"."authOTPRecords"
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can access their own OTP records" ON "public"."authOTPRecords"
    FOR SELECT USING (
        auth.uid()::text = "userId" OR 
        auth.email() = "email"
    );

-- 8. Grant permissions safely
-- =============================================================================
DO $$ 
BEGIN
    -- Grant permissions to authenticated users
    BEGIN
        GRANT SELECT ON "public"."authOTPRecords" TO authenticated;
    EXCEPTION WHEN duplicate_object THEN
        NULL; -- Ignore if already granted
    END;

    -- Grant full permissions to service role
    BEGIN
        GRANT ALL ON "public"."authOTPRecords" TO service_role;
    EXCEPTION WHEN duplicate_object THEN
        NULL; -- Ignore if already granted
    END;

    -- Grant usage on the enum type
    BEGIN
        GRANT USAGE ON TYPE "OTPPurpose" TO authenticated, service_role;
    EXCEPTION WHEN duplicate_object THEN
        NULL; -- Ignore if already granted
    END;
END $$;

-- 9. Create cleanup function
-- =============================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM "public"."authOTPRecords" 
    WHERE "expiresAt" < NOW() OR "isUsed" = true;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Verify the setup
-- =============================================================================

SELECT 'Migration completed successfully!' as status;

-- Check if table exists and show structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'authOTPRecords' 
ORDER BY ordinal_position;

-- Show all indexes on the table
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'authOTPRecords';