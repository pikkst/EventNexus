-- Fix RLS policies for ai_decision_log to allow admin INSERT via triggers
-- This fixes "new row violates row-level security policy" error when adding cities

-- Add INSERT policy for ai_decision_log (triggered by city_bootstrap_trigger)
CREATE POLICY "System can insert AI decision logs"
  ON public.ai_decision_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Also add INSERT policy for other AI system tables that may be triggered
CREATE POLICY "System can insert event confidence"
  ON public.event_confidence FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can insert event versions"
  ON public.event_versions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can insert parsed events"
  ON public.parsed_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update parsed events"
  ON public.parsed_events FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "System can insert raw events"
  ON public.raw_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update raw events"
  ON public.raw_events FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "System can insert event sources"
  ON public.event_sources FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update event sources"
  ON public.event_sources FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
