-- Migration to add enhanced fields to gigs table
-- Run this after updating the Prisma schema

-- Add new columns to gigs table
ALTER TABLE gigs 
ADD COLUMN IF NOT EXISTS "maxApplications" INTEGER,
ADD COLUMN IF NOT EXISTS "platformRequirements" TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT '{}';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "gigs_maxApplications_idx" ON "gigs"("maxApplications");
CREATE INDEX IF NOT EXISTS "gigs_platformRequirements_idx" ON "gigs" USING GIN("platformRequirements");
CREATE INDEX IF NOT EXISTS "gigs_tags_idx" ON "gigs" USING GIN("tags");

-- Update existing gigs to have empty arrays for new fields
UPDATE gigs SET 
    "platformRequirements" = '{}',
    "tags" = '{}'
WHERE "platformRequirements" IS NULL OR "tags" IS NULL;
