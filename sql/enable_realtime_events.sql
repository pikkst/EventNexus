-- Enable Realtime for events table
-- Run this in Supabase SQL Editor

-- 1. Enable realtime replication for events table
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;

-- 2. Check if realtime is enabled (should return 'events' in the list)
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- 3. Verify RLS policies allow reading events
-- (Real-time respects RLS policies, so users must have SELECT permission)
SELECT * FROM pg_policies WHERE tablename = 'events';

-- 4. Grant necessary permissions for realtime (if not already granted)
GRANT SELECT ON public.events TO anon, authenticated;

-- 5. Test query - should return events
SELECT id, name, created_at, location 
FROM public.events 
ORDER BY created_at DESC 
LIMIT 5;

-- SUCCESS INDICATORS:
-- ✅ events table appears in pg_publication_tables
-- ✅ anon/authenticated have SELECT grants
-- ✅ RLS policies allow SELECT for public events
-- ✅ Test query returns results

-- TROUBLESHOOTING:
-- If realtime still doesn't work:
-- 1. Check Supabase Dashboard > Settings > API > Realtime is enabled
-- 2. Check browser console for subscription status logs
-- 3. Verify VITE_SUPABASE_ANON_KEY is correct in .env.local
-- 4. Try restarting Supabase project (Dashboard > Settings > General > Pause/Resume)
