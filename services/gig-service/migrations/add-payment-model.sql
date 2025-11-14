-- Migration: Add Payment model and relations
-- Date: November 7, 2025
-- Description: Add comprehensive escrow-based payment system with submissions for gig workflow

-- Create enums for payment and submission status
CREATE TYPE "PaymentStatus" AS ENUM (
  'CREATED',          -- Order created, awaiting payment
  'AUTHORIZED',       -- Payment captured but held in escrow
  'HELD_ESCROW',      -- Locked until delivery approved
  'PENDING_RELEASE',  -- Auto-release timer started
  'RELEASED',         -- Paid to creator
  'REFUNDED',         -- Returned to brand
  'DISPUTED'          -- Under dispute resolution
);

CREATE TYPE "SubmissionStatus" AS ENUM (
  'DRAFT',            -- Creator started but not submitted
  'PENDING_REVIEW',   -- Waiting for brand review
  'AUTO_APPROVED',    -- Auto-approved after timeout (48h)
  'APPROVED',         -- Brand approved explicitly
  'REJECTED',         -- Brand rejected with reason
  'APPEAL_PENDING'    -- Creator appealed rejection
);

-- First, add payment-related columns to existing tables

-- Add payment fields to gigs table
ALTER TABLE "gigs" ADD COLUMN "paymentRequired" BOOLEAN DEFAULT true;
ALTER TABLE "gigs" ADD COLUMN "advancePayment" INTEGER; -- Advance payment amount in paise
ALTER TABLE "gigs" ADD COLUMN "paymentTerms" TEXT; -- Payment terms description
ALTER TABLE "gigs" ADD COLUMN "paymentStatus" TEXT DEFAULT 'PENDING'; -- PENDING, PARTIAL, COMPLETED

-- Add payment fields to applications table  
ALTER TABLE "applications" ADD COLUMN "paymentStatus" TEXT DEFAULT 'PENDING'; -- PENDING, ORDERED, PAID, FAILED
ALTER TABLE "applications" ADD COLUMN "quotedAmount" INTEGER; -- Final quoted amount in paise
ALTER TABLE "applications" ADD COLUMN "advanceRequired" BOOLEAN DEFAULT false;
ALTER TABLE "applications" ADD COLUMN "paymentDueDate" TIMESTAMP(3);

-- Create the enhanced payments table with escrow support
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentId" TEXT,
    "signature" TEXT,
    "amount" INTEGER NOT NULL,
    "ourCut" INTEGER NOT NULL,
    "creatorAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "authorizedAt" TIMESTAMP(3),
    "heldEscrowAt" TIMESTAMP(3),
    "releaseScheduledAt" TIMESTAMP(3),
    "releaseDeadlineAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "paidBy" TEXT NOT NULL,
    "paidTo" TEXT NOT NULL,
    "receipt" TEXT NOT NULL,
    "description" TEXT,
    "rejectionReason" TEXT,
    "notes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- Create the submissions table for content delivery
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "contentUrl" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "caption" TEXT,
    "instagramPostUrl" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "reviewDeadlineAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "allowedReasons" TEXT[] DEFAULT ARRAY['WRONG_FILE', 'QUALITY_ISSUE', 'CONTENT_MISMATCH', 'MISSING_REQUIREMENTS'],
    "appealCount" INTEGER NOT NULL DEFAULT 0,
    "lastAppealAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints for payments
CREATE UNIQUE INDEX "payments_applicationId_key" ON "payments"("applicationId");
CREATE UNIQUE INDEX "payments_orderId_key" ON "payments"("orderId");
CREATE UNIQUE INDEX "payments_paymentId_key" ON "payments"("paymentId");
CREATE UNIQUE INDEX "payments_receipt_key" ON "payments"("receipt");

-- Create unique constraints for submissions
CREATE UNIQUE INDEX "submissions_paymentId_key" ON "submissions"("paymentId");

-- Create indexes for performance - payments
CREATE INDEX "payments_gigId_idx" ON "payments"("gigId");
CREATE INDEX "payments_applicationId_idx" ON "payments"("applicationId");
CREATE INDEX "payments_status_idx" ON "payments"("status");
CREATE INDEX "payments_paidBy_idx" ON "payments"("paidBy");
CREATE INDEX "payments_paidTo_idx" ON "payments"("paidTo");
CREATE INDEX "payments_releaseDeadlineAt_idx" ON "payments"("releaseDeadlineAt"); -- For auto-release cron job

-- Create indexes for performance - submissions
CREATE INDEX "submissions_paymentId_idx" ON "submissions"("paymentId");
CREATE INDEX "submissions_applicationId_idx" ON "submissions"("applicationId");
CREATE INDEX "submissions_gigId_idx" ON "submissions"("gigId");
CREATE INDEX "submissions_status_idx" ON "submissions"("status");
CREATE INDEX "submissions_reviewDeadlineAt_idx" ON "submissions"("reviewDeadlineAt"); -- For auto-approval cron job

-- Add foreign key constraints for payments
ALTER TABLE "payments" ADD CONSTRAINT "payments_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "gigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key constraints for submissions
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "gigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add comments for documentation
COMMENT ON TABLE "payments" IS 'Escrow-based payment records for gig applications using Razorpay';
COMMENT ON COLUMN "payments"."amount" IS 'Total payment amount in paise (₹50 = 5000 paise)';
COMMENT ON COLUMN "payments"."ourCut" IS '50BraIns commission amount in paise (20-30% of total)';
COMMENT ON COLUMN "payments"."creatorAmount" IS 'Amount paid to creator after commission in paise';
COMMENT ON COLUMN "payments"."status" IS 'Payment status in escrow workflow';
COMMENT ON COLUMN "payments"."orderId" IS 'Razorpay order ID (rzp_order_xxx)';
COMMENT ON COLUMN "payments"."paymentId" IS 'Razorpay payment ID (rzp_payment_xxx)';
COMMENT ON COLUMN "payments"."paidBy" IS 'Brand/Gig owner user ID';
COMMENT ON COLUMN "payments"."paidTo" IS 'Creator/Influencer user ID';
COMMENT ON COLUMN "payments"."receipt" IS 'Unique receipt identifier for the payment';
COMMENT ON COLUMN "payments"."signature" IS 'Razorpay signature for payment verification';
COMMENT ON COLUMN "payments"."releaseDeadlineAt" IS 'When payment auto-releases if no action taken (48h after submission)';
COMMENT ON COLUMN "payments"."rejectionReason" IS 'Reason for payment refund if rejected';

COMMENT ON TABLE "submissions" IS 'Content submissions by creators for gig deliverables';
COMMENT ON COLUMN "submissions"."contentUrl" IS 'R2 URL to the submitted content';
COMMENT ON COLUMN "submissions"."contentType" IS 'Type of content: video, image, carousel';
COMMENT ON COLUMN "submissions"."instagramPostUrl" IS 'URL of the Instagram post after publishing';
COMMENT ON COLUMN "submissions"."status" IS 'Submission review status with 48h auto-approval';
COMMENT ON COLUMN "submissions"."reviewDeadlineAt" IS 'When submission auto-approves if no brand action (48h)';
COMMENT ON COLUMN "submissions"."allowedReasons" IS 'Only these rejection reasons are allowed to prevent abuse';
COMMENT ON COLUMN "submissions"."appealCount" IS 'Number of times creator appealed rejection';

-- Add comments for new gig table columns
COMMENT ON COLUMN "gigs"."paymentRequired" IS 'Whether payment is required for this gig';
COMMENT ON COLUMN "gigs"."advancePayment" IS 'Advance payment amount in paise (if any)';
COMMENT ON COLUMN "gigs"."paymentTerms" IS 'Payment terms and conditions for the gig';
COMMENT ON COLUMN "gigs"."paymentStatus" IS 'Overall payment status: PENDING, PARTIAL, COMPLETED';

-- Add comments for new application table columns
COMMENT ON COLUMN "applications"."paymentStatus" IS 'Application payment status: PENDING, ORDERED, PAID, FAILED';
COMMENT ON COLUMN "applications"."quotedAmount" IS 'Final quoted amount in paise for this application';
COMMENT ON COLUMN "applications"."advanceRequired" IS 'Whether advance payment is required';
COMMENT ON COLUMN "applications"."paymentDueDate" IS 'When payment is due for this application';

-- Verify the migration
DO $$
BEGIN
    -- Check if enums exist
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') THEN
        RAISE NOTICE 'SUCCESS: PaymentStatus enum created successfully';
    ELSE
        RAISE EXCEPTION 'FAILED: PaymentStatus enum was not created';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubmissionStatus') THEN
        RAISE NOTICE 'SUCCESS: SubmissionStatus enum created successfully';
    ELSE
        RAISE EXCEPTION 'FAILED: SubmissionStatus enum was not created';
    END IF;

    -- Check if payments table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payments') THEN
        RAISE NOTICE 'SUCCESS: payments table created successfully';
    ELSE
        RAISE EXCEPTION 'FAILED: payments table was not created';
    END IF;
    
    -- Check if submissions table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'submissions') THEN
        RAISE NOTICE 'SUCCESS: submissions table created successfully';
    ELSE
        RAISE EXCEPTION 'FAILED: submissions table was not created';
    END IF;
    
    -- Check if new gig columns exist
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'gigs' AND column_name = 'paymentRequired') THEN
        RAISE NOTICE 'SUCCESS: paymentRequired column added to gigs table';
    ELSE
        RAISE EXCEPTION 'FAILED: paymentRequired column missing from gigs table';
    END IF;
    
    -- Check if new application columns exist
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'applications' AND column_name = 'paymentStatus') THEN
        RAISE NOTICE 'SUCCESS: paymentStatus column added to applications table';
    ELSE
        RAISE EXCEPTION 'FAILED: paymentStatus column missing from applications table';
    END IF;
    
    -- Check if foreign keys exist
    IF EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = 'payments_gigId_fkey') THEN
        RAISE NOTICE 'SUCCESS: Foreign key to gigs table created';
    ELSE
        RAISE EXCEPTION 'FAILED: Foreign key to gigs table missing';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = 'payments_applicationId_fkey') THEN
        RAISE NOTICE 'SUCCESS: Foreign key to applications table created';
    ELSE
        RAISE EXCEPTION 'FAILED: Foreign key to applications table missing';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = 'submissions_paymentId_fkey') THEN
        RAISE NOTICE 'SUCCESS: Foreign key from submissions to payments created';
    ELSE
        RAISE EXCEPTION 'FAILED: Foreign key from submissions to payments missing';
    END IF;
    
    RAISE NOTICE 'MIGRATION COMPLETED: Escrow-based payment and submission system added successfully';
END $$;