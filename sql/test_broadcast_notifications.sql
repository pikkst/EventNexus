-- Test broadcast notification functionality
-- Run this in Supabase SQL Editor to verify admin can send notifications to all users

-- 1. Check current RLS policies for notifications
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'notifications';

-- 2. Check if service_role has INSERT permissions
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'notifications'
  AND grantee = 'service_role';

-- 3. Count total users (to verify broadcast target)
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE role = 'organizer') as organizers,
    COUNT(*) FILTER (WHERE role = 'attendee') as attendees,
    COUNT(*) FILTER (WHERE role = 'admin') as admins
FROM users;

-- 4. Check recent notifications (last 10)
SELECT 
    n.id,
    n.title,
    n.message,
    n.type,
    u.email as recipient_email,
    u.role as recipient_role,
    n.timestamp
FROM notifications n
JOIN users u ON u.id = n.user_id
ORDER BY n.timestamp DESC
LIMIT 10;

-- 5. Test: Create a test broadcast notification for ALL users
-- This simulates what broadcastNotification function does
INSERT INTO notifications (user_id, title, message, type, "isRead", timestamp)
SELECT 
    id as user_id,
    'Test Broadcast Notification' as title,
    'This is a test message to verify admin broadcast functionality' as message,
    'system' as type,
    false as "isRead",
    NOW() as timestamp
FROM users;

-- Verify test notifications were created
SELECT COUNT(*) as notifications_created
FROM notifications
WHERE title = 'Test Broadcast Notification'
  AND timestamp > NOW() - INTERVAL '1 minute';
