-- Debug Social Media Accounts Data
-- Check what's stored and what admin can see

-- 1. Show all social_media_accounts records
SELECT 
    'All social_media_accounts records:' as debug_section,
    COUNT(*) as total_count
FROM public.social_media_accounts;

-- 2. List all records with details
SELECT 
    id,
    user_id,
    platform,
    account_id,
    account_name,
    is_connected,
    created_at,
    updated_at
FROM public.social_media_accounts
ORDER BY created_at DESC;

-- 3. Check admin user ID
SELECT 
    'Admin user information:' as debug_section,
    id,
    email,
    role,
    created_at
FROM public.users
WHERE role = 'admin'
LIMIT 1;

-- 4. Check RLS policies on social_media_accounts
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'social_media_accounts'
ORDER BY policyname;

-- 5. Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'social_media_accounts'
ORDER BY ordinal_position;

-- 6. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'social_media_accounts';
