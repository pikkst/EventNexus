-- Force Supabase PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';

-- Also verify the foreign keys exist
SELECT 
    'Foreign keys check:' as info,
    conname as constraint_name,
    conrelid::regclass as table_name,
    confrelid::regclass as referenced_table
FROM pg_constraint
WHERE contype = 'f' 
AND connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::text;
