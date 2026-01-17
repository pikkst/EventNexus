-- Allow inserts into funnel_tracking for authenticated users and anon (no PII)
-- RLS is enabled; this policy permits logging funnel steps from client apps.
CREATE POLICY "Allow insert funnel tracking anon or auth"
ON public.funnel_tracking
FOR INSERT
WITH CHECK (auth.role() = 'anon' OR auth.uid() IS NOT NULL);
