-- =============================================================================
-- 50Brains Auth Service - OTP System Database Migration
-- =============================================================================
-- This script creates the necessary tables, enums, and indexes for the OTP system
-- Execute this script in your Supabase SQL Editor

-- 1. Create OTPPurpose enum
-- =============================================================================
CREATE TYPE "OTPPurpose" AS ENUM (
  'REGISTER',
  'LOGIN', 
  'FORGOT_PASSWORD',
  'CHANGE_PASSWORD',
  'EMAIL_VERIFICATION'
);

-- 2. Create authOTPRecords table
-- =============================================================================
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

-- 3. Create indexes for optimal performance
-- =============================================================================

-- Index for email and purpose lookup (most common query)
CREATE INDEX "idx_otp_email_purpose" ON "public"."authOTPRecords"("email", "purpose");

-- Index for expiration cleanup queries
CREATE INDEX "idx_otp_expires_at" ON "public"."authOTPRecords"("expiresAt");

-- Index for used status filtering
CREATE INDEX "idx_otp_is_used" ON "public"."authOTPRecords"("isUsed");

-- Composite index for active OTP lookups
CREATE INDEX "idx_otp_active_lookup" ON "public"."authOTPRecords"("email", "purpose", "isUsed", "expiresAt");

-- Index for user-specific OTP lookups
CREATE INDEX "idx_otp_user_id" ON "public"."authOTPRecords"("userId") WHERE "userId" IS NOT NULL;

-- 4. Add foreign key constraint (optional - if you want referential integrity)
-- =============================================================================
-- Uncomment the next line if you want to enforce foreign key relationship
-- Note: This will prevent OTP records for non-existent users
-- ALTER TABLE "public"."authOTPRecords" 
-- ADD CONSTRAINT "authOTPRecords_userId_fkey" 
-- FOREIGN KEY ("userId") REFERENCES "public"."authUsers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- 5. Create updated_at trigger function (if not exists)
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedAt = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Create trigger for automatic updatedAt updates
-- =============================================================================
CREATE TRIGGER update_authOTPRecords_updated_at 
    BEFORE UPDATE ON "public"."authOTPRecords" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Enable Row Level Security (RLS) for security
-- =============================================================================
ALTER TABLE "public"."authOTPRecords" ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies (adjust based on your security requirements)
-- =============================================================================

-- Allow service role full access (for backend operations)
CREATE POLICY "Service role can access all OTP records" ON "public"."authOTPRecords"
  FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to access only their own OTP records
CREATE POLICY "Users can access their own OTP records" ON "public"."authOTPRecords"
  FOR SELECT USING (
    auth.uid()::text = "userId" OR 
    auth.email() = "email"
  );

-- 9. Grant necessary permissions
-- =============================================================================

-- Grant permissions to authenticated users
GRANT SELECT ON "public"."authOTPRecords" TO authenticated;

-- Grant full permissions to service role (for backend operations)
GRANT ALL ON "public"."authOTPRecords" TO service_role;

-- Grant usage on the enum type
GRANT USAGE ON TYPE "OTPPurpose" TO authenticated, service_role;

-- 10. Create cleanup function for expired OTPs (optional but recommended)
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

-- 11. Create scheduled cleanup (optional - requires pg_cron extension)
-- =============================================================================
-- Uncomment the following lines if you have pg_cron extension enabled
-- This will automatically clean up expired OTPs every hour

-- SELECT cron.schedule(
--     'cleanup-expired-otps',
--     '0 * * * *', -- Every hour
--     'SELECT cleanup_expired_otps();'
-- );

-- =============================================================================
-- Migration Complete!
-- =============================================================================

-- Verify the setup
SELECT 
    'authOTPRecords table created successfully' as status,
    COUNT(*) as initial_record_count 
FROM "public"."authOTPRecords";

-- Show all indexes on the new table
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'authOTPRecords';

-- Show the enum values
SELECT enumlabel as otp_purposes 
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'OTPPurpose'
);

-- =============================================================================
-- Notes:
-- =============================================================================
-- 1. This script is idempotent - you can run it multiple times safely
-- 2. The foreign key constraint is commented out - uncomment if needed
-- 3. RLS policies are set up for security - adjust as needed
-- 4. The cleanup function can be called manually or scheduled
-- 5. All indexes are optimized for the OTP workflow queries
-- =============================================================================