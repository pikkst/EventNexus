-- Quick fix: Update the get_top_organizers function to explicitly cast types
DROP FUNCTION IF EXISTS get_top_organizers(INTEGER, TEXT);

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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_top_organizers TO anon, authenticated;
