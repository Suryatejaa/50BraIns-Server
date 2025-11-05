-- Add isAgreedToTermsAndRefundPolicy column to authUsers table
-- This migration adds the terms and refund policy agreement column

ALTER TABLE "authUsers" 
ADD COLUMN "isAgreedToTermsAndRefundPolicy" BOOLEAN DEFAULT false;

-- Update existing users to have agreed to terms (for backward compatibility)
-- You may want to comment this out if you want existing users to explicitly agree
UPDATE "authUsers" 
SET "isAgreedToTermsAndRefundPolicy" = true 
WHERE "createdAt" < NOW();

-- Add comment to document the column
COMMENT ON COLUMN "authUsers"."isAgreedToTermsAndRefundPolicy" IS 'Indicates if user has agreed to Terms of Service and Refund Policy during registration';

-- Verify the column was added
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'authUsers' AND column_name = 'isAgreedToTermsAndRefundPolicy';