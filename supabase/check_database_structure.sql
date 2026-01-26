-- Database Structure Check Script
-- Run this in Supabase SQL Editor to see what exists in your database

-- 1. Check if users table has home_location column
SELECT 
    'users.home_location' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'users' 
            AND column_name = 'home_location'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- 2. Check if event_reviews table exists
SELECT 
    'event_reviews table' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'event_reviews'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- 3. Check if event_memories table exists
SELECT 
    'event_memories table' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'event_memories'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- 4. Check if ticket_templates table exists
SELECT 
    'ticket_templates table' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'ticket_templates'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- 5. Check if user_buddies table exists
SELECT 
    'user_buddies table' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'user_buddies'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- 6. Check if tickets table has event_id column
SELECT 
    'tickets.event_id' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'tickets' 
            AND column_name = 'event_id'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- 7. Check if get_event_memories function exists
SELECT 
    'get_event_memories()' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'get_event_memories'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- 8. Check if get_buddy_matches function exists
SELECT 
    'get_buddy_matches()' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'get_buddy_matches'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- 9. List ALL columns in users table
SELECT 
    'Current users columns' as info,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users'
GROUP BY table_name;

-- 10. List ALL columns in tickets table (if exists)
SELECT 
    'Current tickets columns' as info,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'tickets'
GROUP BY table_name;

-- 11. List ALL tables in public schema
SELECT 
    'All public tables' as info,
    string_agg(table_name, ', ' ORDER BY table_name) as tables
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE';

-- 12. Check RLS policies on ticket_templates (if exists)
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'ticket_templates'
ORDER BY policyname;

-- 13. Check if event_memories table has event_id column (if table exists)
SELECT 
    'event_memories.event_id' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'event_memories' 
            AND column_name = 'event_id'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING (table might not exist)'
    END as status;
