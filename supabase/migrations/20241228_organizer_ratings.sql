-- Organizer Rating System
-- Allows attendees to rate organizers after attending events

-- Create organizer_ratings table
CREATE TABLE IF NOT EXISTS public.organizer_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  aspects JSONB DEFAULT '{
    "organization": 0,
    "venue": 0,
    "communication": 0,
    "value": 0
  }'::jsonb,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate ratings from same user for same organizer
  UNIQUE(organizer_id, user_id, event_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizer_ratings_organizer ON public.organizer_ratings(organizer_id);
CREATE INDEX IF NOT EXISTS idx_organizer_ratings_user ON public.organizer_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_organizer_ratings_event ON public.organizer_ratings(event_id);
CREATE INDEX IF NOT EXISTS idx_organizer_ratings_rating ON public.organizer_ratings(rating);
CREATE INDEX IF NOT EXISTS idx_organizer_ratings_created ON public.organizer_ratings(created_at DESC);

-- Create materialized view for organizer statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS public.organizer_rating_stats AS
SELECT 
  u.id as organizer_id,
  u.name as organizer_name,
  u.agency_slug,
  u.subscription_tier,
  COALESCE(COUNT(r.id), 0)::INTEGER as total_ratings,
  COALESCE(ROUND(AVG(r.rating)::numeric, 2), 0)::NUMERIC as avg_rating,
  COALESCE(COUNT(DISTINCT r.event_id), 0)::INTEGER as events_rated,
  COALESCE(SUM(CASE WHEN r.rating >= 4 THEN 1 ELSE 0 END), 0)::INTEGER as positive_ratings,
  COALESCE(ROUND(AVG((r.aspects->>'organization')::numeric), 2), 0)::NUMERIC as avg_organization,
  COALESCE(ROUND(AVG((r.aspects->>'venue')::numeric), 2), 0)::NUMERIC as avg_venue,
  COALESCE(ROUND(AVG((r.aspects->>'communication')::numeric), 2), 0)::NUMERIC as avg_communication,
  COALESCE(ROUND(AVG((r.aspects->>'value')::numeric), 2), 0)::NUMERIC as avg_value,
  MAX(r.created_at) as last_rating_at
FROM public.users u
LEFT JOIN public.organizer_ratings r ON u.id = r.organizer_id
WHERE u.subscription_tier IN ('pro', 'premium', 'enterprise')
  AND u.agency_slug IS NOT NULL
GROUP BY u.id, u.name, u.agency_slug, u.subscription_tier;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizer_rating_stats_id ON public.organizer_rating_stats(organizer_id);
CREATE INDEX IF NOT EXISTS idx_organizer_rating_stats_rating ON public.organizer_rating_stats(avg_rating DESC);
CREATE INDEX IF NOT EXISTS idx_organizer_rating_stats_tier ON public.organizer_rating_stats(subscription_tier);

-- Function to refresh stats (call after ratings change)
CREATE OR REPLACE FUNCTION refresh_organizer_rating_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.organizer_rating_stats;
END;
$$;

-- Function to calculate weighted score for ranking
-- Formula: (avg_rating * total_ratings) / (total_ratings + 10) + tier_bonus
CREATE OR REPLACE FUNCTION calculate_organizer_score(
  p_organizer_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_avg_rating NUMERIC;
  v_total_ratings INTEGER;
  v_tier TEXT;
  v_tier_bonus NUMERIC := 0;
  v_score NUMERIC;
BEGIN
  -- Get stats
  SELECT avg_rating, total_ratings, subscription_tier
  INTO v_avg_rating, v_total_ratings, v_tier
  FROM public.organizer_rating_stats
  WHERE organizer_id = p_organizer_id;
  
  -- Tier bonuses
  v_tier_bonus := CASE 
    WHEN v_tier = 'enterprise' THEN 0.5
    WHEN v_tier = 'premium' THEN 0.3
    WHEN v_tier = 'pro' THEN 0.1
    ELSE 0
  END;
  
  -- Weighted Bayesian average
  v_score := ((v_avg_rating * v_total_ratings) / (v_total_ratings + 10)) + v_tier_bonus;
  
  RETURN COALESCE(v_score, 0);
END;
$$;

-- RLS Policies
ALTER TABLE public.organizer_ratings ENABLE ROW LEVEL SECURITY;

-- Anyone can read ratings
CREATE POLICY "Public can view organizer ratings"
  ON public.organizer_ratings
  FOR SELECT
  TO public
  USING (true);

-- Only authenticated users who attended the event can rate
CREATE POLICY "Users can rate organizers after attending events"
  ON public.organizer_ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.event_id = organizer_ratings.event_id
        AND t.user_id = auth.uid()
        AND t.used_at IS NOT NULL
    )
  );

-- Users can update their own ratings
CREATE POLICY "Users can update their own ratings"
  ON public.organizer_ratings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own ratings
CREATE POLICY "Users can delete their own ratings"
  ON public.organizer_ratings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to get top rated organizers
CREATE OR REPLACE FUNCTION get_top_organizers(
  p_limit INTEGER DEFAULT 10,
  p_tier TEXT DEFAULT NULL
)
RETURNS TABLE (
  organizer_id UUID,
  organizer_name TEXT,
  agency_slug TEXT,
  subscription_tier TEXT,
  total_ratings INTEGER,
  avg_rating NUMERIC,
  weighted_score NUMERIC,
  events_rated INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.organizer_id,
    s.organizer_name::TEXT,
    s.agency_slug::TEXT,
    s.subscription_tier::TEXT,
    s.total_ratings,
    s.avg_rating,
    calculate_organizer_score(s.organizer_id) as weighted_score,
    s.events_rated
  FROM public.organizer_rating_stats s
  WHERE (p_tier IS NULL OR s.subscription_tier = p_tier)
    AND s.total_ratings > 0
  ORDER BY calculate_organizer_score(s.organizer_id) DESC
  LIMIT p_limit;
END;
$$;

-- Trigger to refresh stats after rating changes
CREATE OR REPLACE FUNCTION trigger_refresh_rating_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Schedule refresh (in production, use pg_cron or external scheduler)
  PERFORM refresh_organizer_rating_stats();
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_rating_change
  AFTER INSERT OR UPDATE OR DELETE ON public.organizer_ratings
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_rating_stats();

-- Initial refresh
SELECT refresh_organizer_rating_stats();

-- Grant permissions
GRANT SELECT ON public.organizer_ratings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.organizer_ratings TO authenticated;
GRANT SELECT ON public.organizer_rating_stats TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_top_organizers TO anon, authenticated;
GRANT EXECUTE ON FUNCTION calculate_organizer_score TO anon, authenticated;
