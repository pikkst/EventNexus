-- Diagnostic Script: Check Existing Database Schema
-- Run this first to see what already exists

-- Check if events table has the new columns
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'events'
ORDER BY ordinal_position;

-- Check if ticket-related tables exist
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('ticket_templates', 'tickets', 'ticket_verifications')
ORDER BY table_name;

-- Check existing RLS policies on events
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('events', 'tickets', 'ticket_templates', 'ticket_verifications')
ORDER BY tablename, policyname;

-- Check existing functions
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'update_ticket_template_quantities',
    'calculate_event_duration',
    'expire_old_tickets'
  )
ORDER BY routine_name;

-- Check existing triggers
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'ticket_template_quantity_trigger',
    'event_duration_trigger'
  )
ORDER BY trigger_name;

-- Summary report
SELECT 
  'Events table columns' as check_type,
  COUNT(*) as count
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'events'
UNION ALL
SELECT 
  'Ticket tables' as check_type,
  COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('ticket_templates', 'tickets', 'ticket_verifications')
UNION ALL
SELECT 
  'RLS policies' as check_type,
  COUNT(*) as count
FROM pg_policies
WHERE tablename IN ('events', 'tickets', 'ticket_templates', 'ticket_verifications')
UNION ALL
SELECT 
  'Functions' as check_type,
  COUNT(*) as count
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%ticket%' OR routine_name LIKE '%event%duration%';
