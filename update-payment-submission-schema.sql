-- Update payment and submission tables for escrow workflow
-- Run this CAREFULLY after testing in development

-- 1. First check if payment table exists and add missing columns
DO $$
BEGIN
    -- Add missing columns to payments table if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'payments' AND column_name = 'release_scheduled_at') THEN
        ALTER TABLE payments ADD COLUMN release_scheduled_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'payments' AND column_name = 'release_deadline_at') THEN
        ALTER TABLE payments ADD COLUMN release_deadline_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 2. Update submission table to add missing fields for new workflow
DO $$
BEGIN
    -- Add content fields if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'submissions' AND column_name = 'content_url') THEN
        ALTER TABLE submissions ADD COLUMN content_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'submissions' AND column_name = 'content_type') THEN
        ALTER TABLE submissions ADD COLUMN content_type TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'submissions' AND column_name = 'caption') THEN
        ALTER TABLE submissions ADD COLUMN caption TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'submissions' AND column_name = 'instagram_post_url') THEN
        ALTER TABLE submissions ADD COLUMN instagram_post_url TEXT;
    END IF;

    -- Add timeline fields if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'submissions' AND column_name = 'review_deadline_at') THEN
        ALTER TABLE submissions ADD COLUMN review_deadline_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'submissions' AND column_name = 'approved_at') THEN
        ALTER TABLE submissions ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'submissions' AND column_name = 'rejected_at') THEN
        ALTER TABLE submissions ADD COLUMN rejected_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add review tracking if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'submissions' AND column_name = 'reviewed_by') THEN
        ALTER TABLE submissions ADD COLUMN reviewed_by TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'submissions' AND column_name = 'created_by') THEN
        ALTER TABLE submissions ADD COLUMN created_by TEXT;
    END IF;

    -- Add rejection handling if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'submissions' AND column_name = 'rejection_reason') THEN
        ALTER TABLE submissions ADD COLUMN rejection_reason TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'submissions' AND column_name = 'allowed_reasons') THEN
        ALTER TABLE submissions ADD COLUMN allowed_reasons TEXT[] DEFAULT ARRAY['WRONG_FILE', 'QUALITY_ISSUE', 'CONTENT_MISMATCH', 'MISSING_REQUIREMENTS'];
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'submissions' AND column_name = 'appeal_count') THEN
        ALTER TABLE submissions ADD COLUMN appeal_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'submissions' AND column_name = 'last_appeal_at') THEN
        ALTER TABLE submissions ADD COLUMN last_appeal_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 3. Update SubmissionStatus enum if needed
DO $$
BEGIN
    -- Check if PENDING_REVIEW exists in enum, if not update it
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'SubmissionStatus' AND e.enumlabel = 'PENDING_REVIEW'
    ) THEN
        -- Add new enum values
        ALTER TYPE "SubmissionStatus" ADD VALUE IF NOT EXISTS 'PENDING_REVIEW';
        ALTER TYPE "SubmissionStatus" ADD VALUE IF NOT EXISTS 'AUTO_APPROVED';
        ALTER TYPE "SubmissionStatus" ADD VALUE IF NOT EXISTS 'APPEAL_PENDING';
    END IF;
END $$;

-- 4. Add indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_release_deadline 
ON payments (release_deadline_at) WHERE release_deadline_at IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_review_deadline 
ON submissions (review_deadline_at) WHERE review_deadline_at IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_payment_id 
ON submissions (payment_id);

-- 5. Add foreign key constraints if missing
DO $$
BEGIN
    -- Add payment_id foreign key to submissions if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'submissions_payment_id_fkey'
    ) THEN
        ALTER TABLE submissions 
        ADD CONSTRAINT submissions_payment_id_fkey 
        FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 6. Update any existing submissions to have proper status
UPDATE submissions 
SET status = 'PENDING_REVIEW' 
WHERE status = 'PENDING' AND status != 'PENDING_REVIEW';

COMMIT;

-- Verification queries (run these to check)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'payments' ORDER BY column_name;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'submissions' ORDER BY column_name;
-- SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'SubmissionStatus';