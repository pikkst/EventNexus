-- ============================================================
-- AUTONOMOUS_ACTIONS TABLE STRUCTURE INSPECTOR
-- ============================================================

-- 1. Get all columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'autonomous_actions'
ORDER BY ordinal_position;

-- 2. Get CHECK constraints (especially status)
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'autonomous_actions'
  AND con.contype = 'c';

-- 3. Get valid status values from existing data
SELECT DISTINCT status FROM autonomous_actions WHERE status IS NOT NULL;
