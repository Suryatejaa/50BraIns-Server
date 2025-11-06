-- Fix delivery table names to match Prisma schema
-- Run this in Supabase SQL Editor

-- Check if old tables exist and rename them to singular form
DO $$
BEGIN
    -- Rename gigDeliveries to gigDelivery if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'gigDeliveries') THEN
        ALTER TABLE "gigDeliveries" RENAME TO "gigDelivery";
        
        -- Update constraint and index names
        ALTER TABLE "gigDelivery" RENAME CONSTRAINT "gigDeliveries_pkey" TO "gigDelivery_pkey";
        
        -- Rename foreign key constraints if they exist
        IF EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = 'gigDeliveries_gigId_fkey') THEN
            ALTER TABLE "gigDelivery" RENAME CONSTRAINT "gigDeliveries_gigId_fkey" TO "gigDelivery_gigId_fkey";
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = 'gigDeliveries_applicationId_fkey') THEN
            ALTER TABLE "gigDelivery" RENAME CONSTRAINT "gigDeliveries_applicationId_fkey" TO "gigDelivery_applicationId_fkey";
        END IF;
        
        RAISE NOTICE 'Renamed gigDeliveries to gigDelivery';
    END IF;
    
    -- Rename gigDeliveryCleanups to gigDeliveryCleanup if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'gigDeliveryCleanups') THEN
        ALTER TABLE "gigDeliveryCleanups" RENAME TO "gigDeliveryCleanup";
        
        -- Update constraint name
        ALTER TABLE "gigDeliveryCleanup" RENAME CONSTRAINT "gigDeliveryCleanups_pkey" TO "gigDeliveryCleanup_pkey";
        
        RAISE NOTICE 'Renamed gigDeliveryCleanups to gigDeliveryCleanup';
    END IF;
    
    -- If neither old table exists, create the new ones
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'gigDelivery') THEN
        RAISE NOTICE 'Creating new delivery tables...';
        
        -- Create enum types for delivery statuses
        CREATE TYPE "GigDeliveryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');
        CREATE TYPE "GigDeliveryCleanupStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
        
        -- Create GigDelivery table
        CREATE TABLE "gigDelivery" (
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
        CREATE TABLE "gigDeliveryCleanup" (
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

        -- Create indexes
        CREATE INDEX "gigDelivery_gigId_idx" ON "gigDelivery"("gigId");
        CREATE INDEX "gigDelivery_applicationId_idx" ON "gigDelivery"("applicationId");
        CREATE INDEX "gigDelivery_submittedById_idx" ON "gigDelivery"("submittedById");
        CREATE INDEX "gigDelivery_expiresAt_idx" ON "gigDelivery"("expiresAt");
        CREATE INDEX "gigDeliveryCleanup_scheduledAt_idx" ON "gigDeliveryCleanup"("scheduledAt");
        CREATE INDEX "gigDeliveryCleanup_status_idx" ON "gigDeliveryCleanup"("status");

        -- Add foreign key constraints
        ALTER TABLE "gigDelivery" 
        ADD CONSTRAINT "gigDelivery_gigId_fkey" 
        FOREIGN KEY ("gigId") REFERENCES "gigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

        ALTER TABLE "gigDelivery" 
        ADD CONSTRAINT "gigDelivery_applicationId_fkey" 
        FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        
        RAISE NOTICE 'Created new delivery tables';
    END IF;
    
    RAISE NOTICE 'Migration completed successfully';
END
$$;