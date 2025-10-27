-- Debug queries for workRecords table in Supabase
-- Run these queries in Supabase SQL Editor to check data

-- 1. Check if workRecords table exists and its structure
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'workRecords'
ORDER BY ordinal_position;

-- 2. Check total count of records in workRecords
SELECT COUNT(*) as total_records FROM public."workRecords";

-- 3. Check if there are any records for a specific userId (replace with actual userId)
SELECT COUNT(*) as user_records 
FROM public."workRecords" 
WHERE "userId" = '5dacf5a1-1867-4ccf-8714-980b7d127aa9';

-- 4. Check recent records (last 30 days) with all columns
SELECT *
FROM public."workRecords"
WHERE "completedAt" >= NOW() - INTERVAL '30 days'
ORDER BY "completedAt" DESC
LIMIT 10;

-- 5. Check all records for a specific user (replace userId)
SELECT 
    id,
    "userId",
    "gigId",
    title,
    category,
    "completedAt",
    "clientRating",
    verified,
    "actualBudget",
    "createdAt"
FROM public."workRecords"
WHERE "userId" = '5dacf5a1-1867-4ccf-8714-980b7d127aa9'
ORDER BY "completedAt" DESC;

-- 6. Check if completedAt field has data and is not null
SELECT 
    COUNT(*) as total_records,
    COUNT("completedAt") as records_with_completed_date,
    COUNT(*) - COUNT("completedAt") as records_without_completed_date
FROM public."workRecords";

-- 7. Check the date range of completedAt values
SELECT 
    MIN("completedAt") as earliest_completion,
    MAX("completedAt") as latest_completion,
    COUNT(*) as total_with_dates
FROM public."workRecords"
WHERE "completedAt" IS NOT NULL;

-- 8. Check sample data (first 5 records)
SELECT 
    id,
    "userId",
    "gigId",
    title,
    category,
    "completedAt",
    "clientRating",
    verified,
    "actualBudget"
FROM public."workRecords"
ORDER BY "createdAt" DESC
LIMIT 5;

-- 9. Check if there are records but completedAt is null
SELECT 
    COUNT(*) as records_without_completion_date
FROM public."workRecords"
WHERE "completedAt" IS NULL;

-- 10. Check for any records with the exact query from the code
SELECT 
    id,
    "gigId",
    title,
    category,
    "completedAt",
    "clientRating",
    verified,
    "actualBudget"
FROM public."workRecords"
WHERE "userId" = '5dacf5a1-1867-4ccf-8714-980b7d127aa9'  -- Replace with actual userId
ORDER BY "completedAt" DESC
LIMIT 5;

-- 11. Check table names (in case the table name is different)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%work%';

-- 12. Alternative: Check if it's named differently (camelCase vs snake_case)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name ILIKE '%work%' OR table_name ILIKE '%record%');