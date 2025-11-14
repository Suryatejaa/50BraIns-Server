-- SQL Migration for Platform Fee System
-- Add payment-related fields, enums and tables missing from prod.prisma
-- Run this in your Supabase/PostgreSQL database

-- First transaction: Create the PaymentStatus enum
BEGIN;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') THEN
        CREATE TYPE "PaymentStatus" AS ENUM (
            'CREATED',
            'AUTHORIZED', 
            'HELD_ESCROW',
            'RELEASED',
            'REFUNDED',
            'FAILED',
            'DISPUTED'
        );
    END IF;
END $$;
COMMIT;

-- Second transaction: Add all other changes
BEGIN;

-- Add platform fee columns to applications table
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS "platformFee" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "gstOnFee" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "totalAmount" DECIMAL(10,2);

-- Update column comments
COMMENT ON COLUMN applications."quotedPrice" IS 'Creator''s quoted price before platform fee';
COMMENT ON COLUMN applications."platformFee" IS 'Platform fee calculated from quoted price (default 10%)';
COMMENT ON COLUMN applications."gstOnFee" IS 'GST on platform fee (default 0%, configurable)';
COMMENT ON COLUMN applications."totalAmount" IS 'Total amount brand pays (quotedPrice + platformFee + gstOnFee)';

-- Update ApplicationStatus enum to include payment states
-- Note: This will only work if you don't have existing data that conflicts
-- Otherwise, you'll need to migrate existing data first

-- For new ApplicationStatus values, add them to the enum
DO $$
BEGIN
    -- Add new status values if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'PAYMENT_PENDING' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ApplicationStatus')
    ) THEN
        ALTER TYPE "ApplicationStatus" ADD VALUE 'PAYMENT_PENDING';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'PAYMENT_FAILED' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ApplicationStatus')
    ) THEN
        ALTER TYPE "ApplicationStatus" ADD VALUE 'PAYMENT_FAILED';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'WORK_IN_PROGRESS' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ApplicationStatus')
    ) THEN
        ALTER TYPE "ApplicationStatus" ADD VALUE 'WORK_IN_PROGRESS';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'COMPLETED' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ApplicationStatus')
    ) THEN
        ALTER TYPE "ApplicationStatus" ADD VALUE 'COMPLETED';
    END IF;
END $$;

-- Create payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "applicationId" TEXT UNIQUE NOT NULL,
    "gigId" TEXT NOT NULL,
    
    -- Razorpay details
    "orderId" TEXT UNIQUE NOT NULL,
    "paymentId" TEXT UNIQUE,
    signature TEXT,
    
    -- Amount breakdown
    "quotedPrice" DECIMAL(10,2) NOT NULL,
    "platformFee" DECIMAL(10,2) NOT NULL,
    "gstOnFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "creatorAmount" DECIMAL(10,2) NOT NULL,
    
    -- Payment details
    currency TEXT DEFAULT 'INR',
    status "PaymentStatus" DEFAULT 'CREATED',
    
    -- Parties
    "paidBy" TEXT NOT NULL,
    "paidTo" TEXT NOT NULL,
    
    -- Timestamps
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "authorizedAt" TIMESTAMP WITH TIME ZONE,
    "heldEscrowAt" TIMESTAMP WITH TIME ZONE,
    "releasedAt" TIMESTAMP WITH TIME ZONE,
    "refundedAt" TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    receipt TEXT UNIQUE NOT NULL,
    description TEXT,
    notes JSONB,
    
    -- Foreign keys
    CONSTRAINT fk_payments_application 
        FOREIGN KEY ("applicationId") REFERENCES applications(id) ON DELETE CASCADE,
    CONSTRAINT fk_payments_gig 
        FOREIGN KEY ("gigId") REFERENCES gigs(id) ON DELETE CASCADE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_gig_id ON payments("gigId");
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_paid_by ON payments("paidBy");
CREATE INDEX IF NOT EXISTS idx_payments_paid_to ON payments("paidTo");

COMMIT;

-- Verification queries (run these to check)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'applications' ORDER BY column_name;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'payments' ORDER BY column_name;
-- SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'ApplicationStatus';
-- SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'PaymentStatus';