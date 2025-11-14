-- Rollback Migration: Remove Payment model and relations
-- Date: November 7, 2025
-- Description: Rollback script to remove Payment table and all related constraints and columns

-- Remove foreign key constraints first
ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_applicationId_fkey";
ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_gigId_fkey";

-- Drop indexes
DROP INDEX IF EXISTS "payments_paidTo_idx";
DROP INDEX IF EXISTS "payments_paidBy_idx";
DROP INDEX IF EXISTS "payments_status_idx";
DROP INDEX IF EXISTS "payments_applicationId_idx";
DROP INDEX IF EXISTS "payments_gigId_idx";

-- Drop unique constraints/indexes
DROP INDEX IF EXISTS "payments_receipt_key";
DROP INDEX IF EXISTS "payments_paymentId_key";
DROP INDEX IF EXISTS "payments_orderId_key";
DROP INDEX IF EXISTS "payments_applicationId_key";

-- Drop the payments table
DROP TABLE IF EXISTS "payments";

-- Remove payment columns from existing tables
ALTER TABLE "gigs" DROP COLUMN IF EXISTS "paymentRequired";
ALTER TABLE "gigs" DROP COLUMN IF EXISTS "advancePayment";
ALTER TABLE "gigs" DROP COLUMN IF EXISTS "paymentTerms";
ALTER TABLE "gigs" DROP COLUMN IF EXISTS "paymentStatus";

ALTER TABLE "applications" DROP COLUMN IF EXISTS "paymentStatus";
ALTER TABLE "applications" DROP COLUMN IF EXISTS "quotedAmount";
ALTER TABLE "applications" DROP COLUMN IF EXISTS "advanceRequired";
ALTER TABLE "applications" DROP COLUMN IF EXISTS "paymentDueDate";

-- Verify rollback
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payments') THEN
        RAISE NOTICE 'SUCCESS: payments table removed successfully';
    ELSE
        RAISE EXCEPTION 'FAILED: payments table still exists';
    END IF;
    
    -- Check if gig columns are removed
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'gigs' AND column_name = 'paymentRequired') THEN
        RAISE NOTICE 'SUCCESS: payment columns removed from gigs table';
    ELSE
        RAISE EXCEPTION 'FAILED: payment columns still exist in gigs table';
    END IF;
    
    -- Check if application columns are removed
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'applications' AND column_name = 'paymentStatus') THEN
        RAISE NOTICE 'SUCCESS: payment columns removed from applications table';
    ELSE
        RAISE EXCEPTION 'FAILED: payment columns still exist in applications table';
    END IF;
    
    RAISE NOTICE 'ROLLBACK COMPLETED: Payment model and columns removed successfully';
END $$;