-- RLS Policy Audit Query
-- Run this in Supabase SQL Editor to check all tables

-- 1. Find tables WITHOUT RLS enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity = false THEN '🔴 UNPROTECTED'
    ELSE '✅ PROTECTED'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY rowsecurity ASC, tablename ASC;

-- 2. Count policies per table
SELECT 
  t.tablename,
  COUNT(p.policyname) as policy_count,
  CASE 
    WHEN COUNT(p.policyname) = 0 THEN '⚠️ NO POLICIES'
    WHEN COUNT(p.policyname) < 2 THEN '⚠️ LIMITED'
    ELSE '✅ GOOD'
  END as coverage
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
GROUP BY t.tablename
ORDER BY policy_count ASC, t.tablename ASC;

-- 3. List all existing RLS policies with their details
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as operation,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4. Critical tables that MUST have RLS (EventNexus specific)
SELECT 
  tablename,
  rowsecurity,
  CASE 
    WHEN tablename IN (
      'users', 'events', 'tickets', 'notifications', 
      'payments', 'subscriptions', 'user_sessions',
      'event_analytics', 'achievements', 'user_stats'
    ) AND rowsecurity = false THEN '🚨 CRITICAL - NO RLS!'
    WHEN tablename IN (
      'users', 'events', 'tickets', 'notifications', 
      'payments', 'subscriptions', 'user_sessions',
      'event_analytics', 'achievements', 'user_stats'
    ) AND rowsecurity = true THEN '✅ Protected'
    ELSE 'ℹ️ Non-critical'
  END as assessment
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'events', 'tickets', 'notifications', 
    'payments', 'subscriptions', 'user_sessions',
    'event_analytics', 'achievements', 'user_stats',
    'blog_posts', 'comments', 'reviews', 'chat_messages'
  )
ORDER BY assessment ASC;
