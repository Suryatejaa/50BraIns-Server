-- Migration script to add GigDelivery and GigDeliveryCleanup tables
-- Run this in Supabase SQL Editor

-- Create enum types for delivery statuses
DO $$ BEGIN
    CREATE TYPE "GigDeliveryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "GigDeliveryCleanupStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create GigDelivery table
CREATE TABLE IF NOT EXISTS "gigDelivery" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "submittedByType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "files" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "GigDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "feedback" TEXT,
    "notes" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gigDelivery_pkey" PRIMARY KEY ("id")
);

-- Create GigDeliveryCleanup table
CREATE TABLE IF NOT EXISTS "gigDeliveryCleanup" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "fileUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "status" "GigDeliveryCleanupStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gigDeliveryCleanup_pkey" PRIMARY KEY ("id")
);

-- Create indexes for GigDelivery
CREATE INDEX IF NOT EXISTS "gigDelivery_gigId_idx" ON "gigDelivery"("gigId");
CREATE INDEX IF NOT EXISTS "gigDelivery_applicationId_idx" ON "gigDelivery"("applicationId");
CREATE INDEX IF NOT EXISTS "gigDelivery_submittedById_idx" ON "gigDelivery"("submittedById");
CREATE INDEX IF NOT EXISTS "gigDelivery_expiresAt_idx" ON "gigDelivery"("expiresAt");

-- Create indexes for GigDeliveryCleanup
CREATE INDEX IF NOT EXISTS "gigDeliveryCleanup_scheduledAt_idx" ON "gigDeliveryCleanup"("scheduledAt");
CREATE INDEX IF NOT EXISTS "gigDeliveryCleanup_status_idx" ON "gigDeliveryCleanup"("status");

-- Add foreign key constraints
ALTER TABLE "gigDelivery" 
ADD CONSTRAINT "gigDelivery_gigId_fkey" 
FOREIGN KEY ("gigId") REFERENCES "gigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "gigDelivery" 
ADD CONSTRAINT "gigDelivery_applicationId_fkey" 
FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create trigger to auto-update updatedAt for gigDeliveryCleanups
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_gigDeliveryCleanup_updated_at 
    BEFORE UPDATE ON "gigDeliveryCleanup" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT ALL ON "gigDelivery" TO authenticated;
-- GRANT ALL ON "gigDeliveryCleanup" TO authenticated;

COMMIT;