-- Add engagement_score to events table to support ordering by popularity
-- Safe default; does not assume other columns exist

BEGIN;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS engagement_score NUMERIC NOT NULL DEFAULT 0;

-- Backfill existing rows (DEFAULT handles existing rows automatically in Postgres >= 11)
UPDATE public.events
SET engagement_score = COALESCE(engagement_score, 0);

-- Optional index to optimize ordering by engagement_score then date
CREATE INDEX IF NOT EXISTS idx_events_engagement_score_date
  ON public.events (engagement_score DESC, date ASC);

COMMIT;
