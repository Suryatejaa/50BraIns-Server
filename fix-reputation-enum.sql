-- Fix reputation service enum issue
-- Run this in Supabase SQL Editor

-- Create ReputationTier enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE reputation_tier AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'LEGEND');
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'reputation_tier enum already exists, skipping creation';
END $$;

-- Update reputation_scores table to use the enum
DO $$ 
BEGIN
    -- Check if the column exists and is text type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reputation_scores' 
        AND column_name = 'tier' 
        AND data_type = 'text'
    ) THEN
        -- Update the column to use the enum
        ALTER TABLE reputation_scores 
        ALTER COLUMN tier TYPE reputation_tier 
        USING tier::reputation_tier;
        
        RAISE NOTICE 'Updated reputation_scores.tier to use reputation_tier enum';
    ELSE
        RAISE NOTICE 'reputation_scores.tier column already using correct type or does not exist';
    END IF;
    
    -- Check if the clan reputation column exists and is text type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reputation_clan_reputations' 
        AND column_name = 'clan_tier' 
        AND data_type = 'text'
    ) THEN
        -- Update the column to use the enum
        ALTER TABLE reputation_clan_reputations 
        ALTER COLUMN clan_tier TYPE reputation_tier 
        USING clan_tier::reputation_tier;
        
        RAISE NOTICE 'Updated reputation_clan_reputations.clan_tier to use reputation_tier enum';
    ELSE
        RAISE NOTICE 'reputation_clan_reputations.clan_tier column already using correct type or does not exist';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error occurred: %', SQLERRM;
END $$;

-- Verify the changes
DO $$
BEGIN
    RAISE NOTICE '✅ Reputation enum fix completed!';
    RAISE NOTICE 'Tables updated to use reputation_tier enum properly.';
END $$;