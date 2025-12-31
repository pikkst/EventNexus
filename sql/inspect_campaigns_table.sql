-- ============================================================
-- CAMPAIGNS TABLE STRUCTURE INSPECTOR
-- Run this in Supabase SQL Editor to see EXACT table structure
-- ============================================================

-- 1. Get all columns with types, nullability, and defaults
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'campaigns'
ORDER BY ordinal_position;

-- 2. Get all CHECK constraints
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'campaigns'
  AND con.contype = 'c';

-- 3. Get NOT NULL constraints (summary)
SELECT 
  column_name,
  'NOT NULL' as constraint_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'campaigns'
  AND is_nullable = 'NO'
ORDER BY ordinal_position;

-- 4. Get ENUM types if any
SELECT 
  t.typname AS enum_name,
  e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
  AND t.typname LIKE '%campaign%'
ORDER BY t.typname, e.enumsortorder;

-- 5. Test which placement values are allowed
-- Copy this to find valid placement values:
-- SELECT DISTINCT placement FROM campaigns WHERE placement IS NOT NULL LIMIT 10;
