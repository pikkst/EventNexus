-- Show all existing columns in users table
-- Run this in Supabase SQL Editor to see what fields are currently in the database

SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'users'
ORDER BY ordinal_position;

-- Show all existing columns in events table
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'events'
ORDER BY ordinal_position;

-- Show all tables in public schema
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Count records in key tables
SELECT 
    'users' as table_name,
    COUNT(*) as record_count
FROM users
UNION ALL
SELECT 
    'events' as table_name,
    COUNT(*) as record_count
FROM events
UNION ALL
SELECT 
    'notifications' as table_name,
    COUNT(*) as record_count
FROM notifications;
