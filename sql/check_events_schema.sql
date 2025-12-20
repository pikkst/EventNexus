-- ============================================
-- Check Events Table Schema
-- Run this in Supabase SQL Editor to see the current schema
-- ============================================

-- 1. Check all columns in events table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'events'
ORDER BY ordinal_position;

-- 2. Check constraints on events table
SELECT
    con.conname AS constraint_name,
    con.contype AS constraint_type,
    CASE con.contype
        WHEN 'c' THEN 'CHECK'
        WHEN 'f' THEN 'FOREIGN KEY'
        WHEN 'p' THEN 'PRIMARY KEY'
        WHEN 'u' THEN 'UNIQUE'
        WHEN 't' THEN 'TRIGGER'
        ELSE con.contype::text
    END AS constraint_type_desc,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'events'
ORDER BY con.conname;

-- 3. Show a sample event to see actual data structure
SELECT 
    id,
    name,
    category,
    date,
    -- Check if time column exists (will error if it doesn't)
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'events' 
            AND column_name = 'time'
        ) THEN 'TIME COLUMN EXISTS'
        ELSE 'TIME COLUMN MISSING'
    END as time_column_status
FROM events
LIMIT 1;

-- 4. Quick check: does time column exist?
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'events' 
      AND column_name = 'time'
) as time_column_exists;
