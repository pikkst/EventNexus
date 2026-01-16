-- Create RPC function for full-text event search
-- This function performs semantic full-text search on events
-- It searches across event names, descriptions, and categories
-- Results are ordered by relevance (ts_rank)

CREATE OR REPLACE FUNCTION search_events(
  search_query text,
  result_limit int DEFAULT 50
)
RETURNS SETOF events
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT e.*
  FROM events e
  WHERE e.status = 'active'
    AND e.visibility IN ('public', 'semi-private')
    AND e.archived_at IS NULL
    AND (
      -- Full-text search on search_vector
      e.search_vector @@ websearch_to_tsquery('english', search_query)
      OR
      -- Fallback to ILIKE for partial matches
      e.name ILIKE '%' || search_query || '%'
      OR
      e.description ILIKE '%' || search_query || '%'
      OR
      e.category ILIKE '%' || search_query || '%'
    )
  ORDER BY
    -- Prioritize full-text matches by rank
    CASE WHEN e.search_vector @@ websearch_to_tsquery('english', search_query)
      THEN ts_rank(e.search_vector, websearch_to_tsquery('english', search_query))
      ELSE 0
    END DESC,
    -- Then by date (newer first)
    e.date DESC
  LIMIT result_limit;
END;
$$;

-- Grant permission to anon user (public access)
GRANT EXECUTE ON FUNCTION search_events(text, int) TO anon;
GRANT EXECUTE ON FUNCTION search_events(text, int) TO authenticated;
