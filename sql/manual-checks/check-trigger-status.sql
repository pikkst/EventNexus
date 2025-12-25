-- Check if trigger exists and is enabled
SELECT 
    t.tgname as trigger_name,
    t.tgenabled as enabled,
    c.relname as table_name,
    n.nspname as schema_name,
    p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'on_auth_user_created';

-- Check if the function exists
SELECT 
    routine_name,
    routine_schema,
    routine_type
FROM information_schema.routines
WHERE routine_name = 'handle_new_user';

-- Check recent auth.users entries
SELECT 
    au.id,
    au.email,
    au.confirmed_at,
    au.created_at,
    u.id as profile_id,
    u.name,
    u.role
FROM auth.users au
LEFT JOIN public.users u ON u.id = au.id
ORDER BY au.created_at DESC
LIMIT 5;
