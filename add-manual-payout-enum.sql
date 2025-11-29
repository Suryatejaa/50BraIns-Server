-- Add READY_FOR_MANUAL_PAYOUT to PaymentStatus enum in Supabase
-- This query adds the new enum value for manual payout processing

ALTER TYPE "PaymentStatus" ADD VALUE 'READY_FOR_MANUAL_PAYOUT';

-- Optional: Add a comment to document the new enum value
COMMENT ON TYPE "PaymentStatus" IS 'Payment status tracking including manual payout processing';

-- Verify the enum values (optional query to check)
-- SELECT unnest(enum_range(NULL::"PaymentStatus")) AS payment_status;