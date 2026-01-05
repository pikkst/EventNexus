-- Ensure funnel_tracking accepts inserts from anon/auth clients (event creation funnels)
DO $$
BEGIN
  IF to_regclass('public.funnel_tracking') IS NOT NULL THEN
    ALTER TABLE IF EXISTS public.funnel_tracking ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow insert funnel tracking anon or auth" ON public.funnel_tracking;
    CREATE POLICY "Allow insert funnel tracking anon or auth"
      ON public.funnel_tracking
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (auth.role() = 'anon' OR auth.uid() IS NOT NULL);

    GRANT INSERT ON public.funnel_tracking TO anon, authenticated;
  ELSE
    RAISE NOTICE 'funnel_tracking table not found, skipping policy update';
  END IF;
END $$;
