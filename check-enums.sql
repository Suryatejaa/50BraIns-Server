-- Check existing enums in Supabase database
-- Run this in Supabase SQL Editor or via psql

-- Method 1: List all enums with their values
SELECT 
    t.typname AS enum_name,
    array_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
GROUP BY t.typname
ORDER BY t.typname;

-- Method 2: List all enum types and individual values
SELECT 
    pg_type.typname AS enum_name,
    pg_enum.enumlabel AS enum_value,
    pg_enum.enumsortorder AS sort_order
FROM pg_type 
JOIN pg_enum ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typtype = 'e'
ORDER BY pg_type.typname, pg_enum.enumsortorder;

-- Method 3: Check specific enum (NotificationType)
SELECT enumlabel as notification_types 
FROM pg_enum 
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
WHERE pg_type.typname = 'NotificationType'
ORDER BY pg_enum.enumsortorder;

-- Method 4: Check if specific enum value exists
SELECT EXISTS(
    SELECT 1 
    FROM pg_enum 
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
    WHERE pg_type.typname = 'NotificationType' 
    AND pg_enum.enumlabel = 'ENGAGEMENT'
) AS has_engagement_type;