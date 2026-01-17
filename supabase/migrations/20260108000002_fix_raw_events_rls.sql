-- Fix RLS policies for AI agent pipeline
-- Edge Functions use anon role, not authenticated

-- Allow anon to read/write raw_events (for fetch-sources and parse-event-ai)
CREATE POLICY "Anon can manage raw events" ON public.raw_events FOR ALL TO anon USING (true) WITH CHECK (true);

-- Allow anon to read event_sources (for fetch-sources)
CREATE POLICY "Anon can read event sources" ON public.event_sources FOR SELECT TO anon USING (true);

-- Allow anon to write parsed_events (for parse-event-ai)
CREATE POLICY "Anon can insert parsed events" ON public.parsed_events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can read parsed events" ON public.parsed_events FOR SELECT TO anon USING (true);

-- Allow anon to write ai_decision_log
CREATE POLICY "Anon can insert AI decisions" ON public.ai_decision_log FOR INSERT TO anon WITH CHECK (true);

-- Allow anon to read/write event_confidence (for validate-event)
CREATE POLICY "Anon can manage event confidence" ON public.event_confidence FOR ALL TO anon USING (true) WITH CHECK (true);

COMMENT ON POLICY "Anon can manage raw events" ON public.raw_events IS 'Edge Functions use anon role for pipeline operations';
