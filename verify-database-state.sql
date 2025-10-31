-- =====================================================================================
-- Database State Verification Script
-- =====================================================================================
-- Run this to check if the migration was applied correctly

-- Check if EMAIL_UPDATE enum exists
SELECT 'EMAIL_UPDATE enum check:' as check_type,
       CASE WHEN EXISTS (
           SELECT 1 FROM pg_enum 
           WHERE enumlabel = 'EMAIL_UPDATE' 
           AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'OTPPurpose')
       ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check if lastUsernameUpdated column exists in authUsers
SELECT 'authUsers.lastUsernameUpdated:' as check_type,
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.columns 
           WHERE table_name = 'authUsers' 
           AND column_name = 'lastUsernameUpdated'
           AND table_schema = 'public'
       ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Show all OTPPurpose enum values
SELECT 'Current OTPPurpose values:' as info, 
       string_agg(enumlabel, ', ' ORDER BY enumlabel) as enum_values
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'OTPPurpose');

-- Show authUsers table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'authUsers' 
AND table_schema = 'public'
ORDER BY ordinal_position;