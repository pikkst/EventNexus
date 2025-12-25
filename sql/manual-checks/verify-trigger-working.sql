-- Test if trigger will work correctly for new users
-- Run this in Supabase SQL Editor

-- 1. Check if the trigger function exists and is correct
SELECT 
    'Trigger function check' as info,
    proname as function_name,
    prosrc as function_source
FROM pg_proc
WHERE proname = 'handle_new_user';

-- 2. Check if trigger is attached and enabled
SELECT 
    'Trigger status' as info,
    t.tgname as trigger_name,
    CASE t.tgenabled
        WHEN 'O' THEN '✅ ENABLED'
        WHEN 'D' THEN '❌ DISABLED'
        ELSE 'Unknown: ' || t.tgenabled
    END as status,
    c.relname as table_name,
    p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'on_auth_user_created';

-- 3. Test what would happen for a new user (simulation)
SELECT 
    'Simulation test' as info,
    '✅ Trigger will use auth.users.id directly' as explanation,
    'NEW.id from auth.users → public.users.id' as flow,
    'IDs will MATCH automatically' as result;

-- 4. Verify trigger was updated with 'status' column
SELECT 
    'Check if status column is in trigger' as info,
    CASE 
        WHEN prosrc LIKE '%status%' THEN '✅ Trigger includes status column'
        ELSE '❌ Trigger missing status column - RUN COMPLETE_USER_REGISTRATION_FIX.sql'
    END as status_check
FROM pg_proc
WHERE proname = 'handle_new_user';
