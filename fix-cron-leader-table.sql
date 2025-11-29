-- Add missing instanceId column to cron_leader table
-- This fixes the error: The column `cron_leader.instanceId` does not exist in the current database.

-- First ensure the table exists with basic structure
DO $$
BEGIN
    -- Create cron_leader table if it doesn't exist
    CREATE TABLE IF NOT EXISTS "cron_leader" (
        "id" SERIAL PRIMARY KEY,
        "isLeader" BOOLEAN NOT NULL DEFAULT false,
        "lastHeartbeat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    
    RAISE NOTICE 'Cron leader table created/verified';
END $$;

-- Now add the instanceId column if it doesn't exist
DO $$ 
BEGIN
    -- Check if instanceId column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'cron_leader' 
        AND column_name = 'instanceId'
    ) THEN
        ALTER TABLE "cron_leader" ADD COLUMN "instanceId" TEXT NOT NULL DEFAULT 'default';
        
        -- Add a default instanceId if there are existing records
        UPDATE "cron_leader" 
        SET "instanceId" = 'default-instance-' || gen_random_uuid()::text
        WHERE "instanceId" = 'default';
        
        RAISE NOTICE 'Added instanceId column to cron_leader table';
    ELSE
        RAISE NOTICE 'instanceId column already exists in cron_leader table';
    END IF;
END $$;

-- Add missing isLeader column if it doesn't exist
DO $$
BEGIN
    -- Check if isLeader column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'cron_leader' 
        AND column_name = 'isLeader'
    ) THEN
        ALTER TABLE "cron_leader" ADD COLUMN "isLeader" BOOLEAN NOT NULL DEFAULT false;
        RAISE NOTICE 'Added isLeader column to cron_leader table';
    ELSE
        RAISE NOTICE 'isLeader column already exists in cron_leader table';
    END IF;
END $$;

-- Finally add indexes after ensuring columns exist
DO $$
BEGIN
    -- Add instanceId index (only if column exists)
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'cron_leader' 
        AND column_name = 'instanceId'
    ) THEN
        CREATE INDEX IF NOT EXISTS "cron_leader_instanceId_idx" ON "cron_leader"("instanceId");
        RAISE NOTICE 'Created instanceId index';
    END IF;
    
    -- Add isLeader index (only if column exists)
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'cron_leader' 
        AND column_name = 'isLeader'
    ) THEN
        CREATE INDEX IF NOT EXISTS "cron_leader_isLeader_idx" ON "cron_leader"("isLeader");
        RAISE NOTICE 'Created isLeader index';
    END IF;
    
    RAISE NOTICE 'Cron leader indexes verified';
END $$;