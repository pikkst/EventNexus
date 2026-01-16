-- Enable pgvector extension (available in Supabase)
-- pgvector provides vector similarity search for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create quality_scores table for training data
-- Stores validated events with quality metrics for model training
CREATE TABLE IF NOT EXISTS event_quality_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  parsed_event_id UUID REFERENCES parsed_events(id) ON DELETE CASCADE,
  
  -- Input features for ML model
  has_complete_data BOOLEAN DEFAULT false,
  has_coordinates BOOLEAN DEFAULT false,
  has_valid_time BOOLEAN DEFAULT false,
  address_length INTEGER,
  description_length INTEGER,
  category_confidence FLOAT,
  source_score FLOAT,
  
  -- Target variable (what we're predicting)
  quality_score FLOAT NOT NULL CHECK (quality_score >= 0 AND quality_score <= 1),
  
  -- Metadata
  manually_validated BOOLEAN DEFAULT false,
  validated_by UUID REFERENCES auth.users(id),
  validation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure we don't duplicate scores
  UNIQUE(event_id),
  UNIQUE(parsed_event_id)
);

-- Index for training queries
CREATE INDEX idx_quality_scores_validated ON event_quality_scores(manually_validated, created_at);
CREATE INDEX idx_quality_scores_score ON event_quality_scores(quality_score);

-- RLS: Service role can do everything, authenticated users can read
ALTER TABLE event_quality_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on quality_scores"
  ON event_quality_scores
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated read quality_scores"
  ON event_quality_scores
  FOR SELECT
  TO authenticated
  USING (true);

-- Create embeddings table for duplicate detection
-- Stores vector embeddings of event names/descriptions for similarity search
-- Uses pgvector for fast cosine similarity search
CREATE TABLE IF NOT EXISTS event_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  parsed_event_id UUID REFERENCES parsed_events(id) ON DELETE CASCADE,
  
  -- Vector embedding (1536 dimensions for text-embedding-3-small from OpenAI)
  -- Or can use Gemini embeddings (768 dimensions)
  embedding vector(768) NOT NULL,
  
  -- What was embedded
  text_source TEXT NOT NULL, -- 'name', 'description', 'combined'
  text_content TEXT NOT NULL, -- Original text for reference
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(event_id, text_source),
  UNIQUE(parsed_event_id, text_source)
);

-- Index for similarity search using cosine distance
CREATE INDEX idx_event_embeddings_vector ON event_embeddings 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Regular indexes
CREATE INDEX idx_event_embeddings_event ON event_embeddings(event_id);
CREATE INDEX idx_event_embeddings_parsed ON event_embeddings(parsed_event_id);

-- RLS for embeddings
ALTER TABLE event_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on embeddings"
  ON event_embeddings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated read embeddings"
  ON event_embeddings
  FOR SELECT
  TO authenticated
  USING (true);

-- Helper function: Auto-populate quality scores from existing events
-- This creates initial training data from published events
CREATE OR REPLACE FUNCTION populate_initial_quality_scores()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inserted_count INTEGER := 0;
BEGIN
  -- Get all published events that don't have quality scores yet
  INSERT INTO event_quality_scores (
    event_id,
    has_complete_data,
    has_coordinates,
    has_valid_time,
    address_length,
    description_length,
    category_confidence,
    source_score,
    quality_score,
    manually_validated
  )
  SELECT
    e.id,
    -- Feature extraction
    (e.name IS NOT NULL AND e.description IS NOT NULL AND e.location IS NOT NULL) as has_complete_data,
    (e.location_point IS NOT NULL) as has_coordinates,
    (e.time IS NOT NULL AND e.time != '00:00') as has_valid_time,
    LENGTH(COALESCE(e.location->>'address', '')) as address_length,
    LENGTH(COALESCE(e.description, '')) as description_length,
    0.9 as category_confidence, -- High confidence for published events
    0.95 as source_score, -- EventScout AI score
    
    -- Target: Published events are high quality (0.9+)
    CASE
      WHEN e.status = 'active' THEN 0.95
      WHEN e.status = 'cancelled' THEN 0.70
      ELSE 0.85
    END as quality_score,
    
    false as manually_validated -- Auto-generated, not manual
  FROM events e
  WHERE e.id NOT IN (SELECT event_id FROM event_quality_scores WHERE event_id IS NOT NULL)
    AND e.status = 'active'
  LIMIT 1000; -- Batch process
  
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

-- Comment for documentation
COMMENT ON FUNCTION populate_initial_quality_scores() IS 
'Populates quality_scores table with training data from published events. Run once to bootstrap quality prediction.';

COMMENT ON TABLE event_quality_scores IS 
'Training data for quality prediction. Auto-populated from validated events. Used by calculate_event_quality() for SQL-based scoring.';

COMMENT ON TABLE event_embeddings IS 
'Vector embeddings for semantic duplicate detection and similarity search using pgvector.';

-- SQL-based quality prediction function
-- Calculates quality score based on event features without external ML
-- Uses weighted scoring of completeness, validity, and source trust
CREATE OR REPLACE FUNCTION calculate_event_quality(
  p_has_complete_data BOOLEAN,
  p_has_coordinates BOOLEAN,
  p_has_valid_time BOOLEAN,
  p_address_length INTEGER,
  p_description_length INTEGER,
  p_category_confidence FLOAT,
  p_source_score FLOAT
)
RETURNS FLOAT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  score FLOAT := 0.0;
  max_score FLOAT := 0.0;
BEGIN
  -- Completeness (30% weight)
  IF p_has_complete_data THEN
    score := score + 0.30;
  END IF;
  max_score := max_score + 0.30;
  
  -- Coordinates (20% weight)
  IF p_has_coordinates THEN
    score := score + 0.20;
  END IF;
  max_score := max_score + 0.20;
  
  -- Valid time (15% weight)
  IF p_has_valid_time THEN
    score := score + 0.15;
  END IF;
  max_score := max_score + 0.15;
  
  -- Address quality (10% weight)
  -- Good address: 30-200 chars
  IF p_address_length >= 30 AND p_address_length <= 200 THEN
    score := score + 0.10;
  ELSIF p_address_length > 0 THEN
    score := score + 0.05; -- Partial credit
  END IF;
  max_score := max_score + 0.10;
  
  -- Description quality (10% weight)
  -- Good description: 50+ chars
  IF p_description_length >= 50 THEN
    score := score + 0.10;
  ELSIF p_description_length >= 20 THEN
    score := score + 0.05; -- Partial credit
  END IF;
  max_score := max_score + 0.10;
  
  -- Category confidence (10% weight)
  IF p_category_confidence IS NOT NULL THEN
    score := score + (p_category_confidence * 0.10);
  END IF;
  max_score := max_score + 0.10;
  
  -- Source trust (5% weight)
  IF p_source_score IS NOT NULL THEN
    score := score + (p_source_score * 0.05);
  END IF;
  max_score := max_score + 0.05;
  
  -- Normalize to 0-1 range
  IF max_score > 0 THEN
    RETURN score / max_score;
  ELSE
    RETURN 0.0;
  END IF;
END;
$$;

COMMENT ON FUNCTION calculate_event_quality IS 
'SQL-based quality prediction. Returns 0-1 score based on event features. Fast (milliseconds) and free.';

-- Helper function: Find similar events using embeddings
-- Uses cosine similarity to find duplicate or similar events
CREATE OR REPLACE FUNCTION find_similar_events(
  p_embedding vector(768),
  p_threshold FLOAT DEFAULT 0.85,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  event_id UUID,
  parsed_event_id UUID,
  text_content TEXT,
  similarity FLOAT
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    event_id,
    parsed_event_id,
    text_content,
    1 - (embedding <=> p_embedding) as similarity
  FROM event_embeddings
  WHERE 1 - (embedding <=> p_embedding) >= p_threshold
  ORDER BY embedding <=> p_embedding
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION find_similar_events IS 
'Finds similar events using cosine similarity on embeddings. Returns events above threshold (default 0.85 = 85% similar).';

