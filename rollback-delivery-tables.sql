-- Rollback script to remove delivery tables if needed
-- Run this in Supabase SQL Editor if you need to undo the migration

-- Drop foreign key constraints first
ALTER TABLE "gigDeliveries" DROP CONSTRAINT IF EXISTS "gigDeliveries_gigId_fkey";
ALTER TABLE "gigDeliveries" DROP CONSTRAINT IF EXISTS "gigDeliveries_applicationId_fkey";

-- Drop triggers
DROP TRIGGER IF EXISTS update_gigDeliveryCleanups_updated_at ON "gigDeliveryCleanups";

-- Drop tables
DROP TABLE IF EXISTS "gigDeliveryCleanups";
DROP TABLE IF EXISTS "gigDeliveries";

-- Drop enum types
DROP TYPE IF EXISTS "GigDeliveryCleanupStatus";
DROP TYPE IF EXISTS "GigDeliveryStatus";

-- Drop the trigger function
DROP FUNCTION IF EXISTS update_updated_at_column();

COMMIT;