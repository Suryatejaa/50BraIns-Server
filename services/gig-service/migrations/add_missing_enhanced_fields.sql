-- Add missing enhanced fields to gigs table
ALTER TABLE gigs 
ADD COLUMN "followerRequirements" JSONB[] DEFAULT '{}',
ADD COLUMN "locationRequirements" TEXT[] DEFAULT '{}';

-- Add comments for clarity
COMMENT ON COLUMN gigs."followerRequirements" IS 'Array of JSON objects with platform and minFollowers requirements';
COMMENT ON COLUMN gigs."locationRequirements" IS 'Array of geographic requirements';
