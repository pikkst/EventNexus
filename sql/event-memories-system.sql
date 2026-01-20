-- Event Memories System
-- Allows users to upload photos, videos, and reviews from events they attended
-- Created: 2026-01-20

-- Create event_memories table
CREATE TABLE IF NOT EXISTS public.event_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('photo', 'video', 'review')),
  media_url TEXT, -- URL to photo/video in Supabase Storage
  review_text TEXT, -- Optional review/memory text
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- Optional 1-5 star rating
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'followers')),
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Indexes
  CONSTRAINT unique_user_event_review UNIQUE NULLS NOT DISTINCT (user_id, event_id, review_text)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_memories_user_id ON public.event_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_event_memories_event_id ON public.event_memories(event_id);
CREATE INDEX IF NOT EXISTS idx_event_memories_created_at ON public.event_memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_memories_visibility ON public.event_memories(visibility);

-- Create event_memory_likes table for tracking who liked which memory
CREATE TABLE IF NOT EXISTS public.event_memory_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES public.event_memories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_memory_like UNIQUE(memory_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_memory_likes_memory_id ON public.event_memory_likes(memory_id);
CREATE INDEX IF NOT EXISTS idx_event_memory_likes_user_id ON public.event_memory_likes(user_id);

-- Enable Row Level Security
ALTER TABLE public.event_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_memory_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_memories

-- Anyone can view public memories
CREATE POLICY "Public memories are viewable by everyone"
  ON public.event_memories
  FOR SELECT
  USING (visibility = 'public');

-- Users can view their own memories regardless of visibility
CREATE POLICY "Users can view their own memories"
  ON public.event_memories
  FOR SELECT
  USING (auth.uid() = user_id);

-- Followers can view follower-only memories
CREATE POLICY "Followers can view follower-only memories"
  ON public.event_memories
  FOR SELECT
  USING (
    visibility = 'followers' AND 
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (SELECT user_id FROM public.event_memories WHERE id = event_memories.id)
      AND followed_organizers @> to_jsonb(auth.uid()::text)
    )
  );

-- Users can insert their own memories
CREATE POLICY "Users can insert their own memories"
  ON public.event_memories
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own memories
CREATE POLICY "Users can update their own memories"
  ON public.event_memories
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own memories
CREATE POLICY "Users can delete their own memories"
  ON public.event_memories
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for event_memory_likes

-- Anyone can view likes
CREATE POLICY "Anyone can view memory likes"
  ON public.event_memory_likes
  FOR SELECT
  USING (true);

-- Users can insert their own likes
CREATE POLICY "Users can like memories"
  ON public.event_memory_likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own likes
CREATE POLICY "Users can unlike memories"
  ON public.event_memory_likes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to increment likes_count
CREATE OR REPLACE FUNCTION increment_memory_likes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.event_memories
  SET likes_count = likes_count + 1,
      updated_at = now()
  WHERE id = NEW.memory_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement likes_count
CREATE OR REPLACE FUNCTION decrement_memory_likes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.event_memories
  SET likes_count = GREATEST(likes_count - 1, 0),
      updated_at = now()
  WHERE id = OLD.memory_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for like counting
DROP TRIGGER IF EXISTS on_memory_like_added ON public.event_memory_likes;
CREATE TRIGGER on_memory_like_added
  AFTER INSERT ON public.event_memory_likes
  FOR EACH ROW
  EXECUTE FUNCTION increment_memory_likes();

DROP TRIGGER IF EXISTS on_memory_like_removed ON public.event_memory_likes;
CREATE TRIGGER on_memory_like_removed
  AFTER DELETE ON public.event_memory_likes
  FOR EACH ROW
  EXECUTE FUNCTION decrement_memory_likes();

-- Function to get memories for an event with user info
CREATE OR REPLACE FUNCTION get_event_memories(p_event_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  username TEXT,
  user_avatar TEXT,
  event_id UUID,
  memory_type TEXT,
  media_url TEXT,
  review_text TEXT,
  rating INTEGER,
  visibility TEXT,
  likes_count INTEGER,
  user_has_liked BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    em.id,
    em.user_id,
    u.name as username,
    u.avatar as user_avatar,
    em.event_id,
    em.memory_type,
    em.media_url,
    em.review_text,
    em.rating,
    em.visibility,
    em.likes_count,
    EXISTS(
      SELECT 1 FROM public.event_memory_likes eml 
      WHERE eml.memory_id = em.id AND eml.user_id = auth.uid()
    ) as user_has_liked,
    em.created_at
  FROM public.event_memories em
  JOIN public.users u ON u.id = em.user_id
  WHERE em.event_id = p_event_id
    AND (
      em.visibility = 'public' 
      OR em.user_id = auth.uid()
      OR (em.visibility = 'followers' AND u.followed_organizers @> to_jsonb(auth.uid()::text))
    )
  ORDER BY em.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's memories
CREATE OR REPLACE FUNCTION get_user_memories(p_user_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  event_id UUID,
  event_name TEXT,
  event_date DATE,
  event_image TEXT,
  memory_type TEXT,
  media_url TEXT,
  review_text TEXT,
  rating INTEGER,
  visibility TEXT,
  likes_count INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    em.id,
    em.event_id,
    e.name as event_name,
    e.date as event_date,
    e.imageUrl as event_image,
    em.memory_type,
    em.media_url,
    em.review_text,
    em.rating,
    em.visibility,
    em.likes_count,
    em.created_at
  FROM public.event_memories em
  JOIN public.events e ON e.id = em.event_id
  WHERE em.user_id = p_user_id
    AND (
      em.visibility = 'public'
      OR em.user_id = auth.uid()
      OR (em.visibility = 'followers' AND EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = p_user_id 
        AND followed_organizers @> to_jsonb(auth.uid()::text)
      ))
    )
  ORDER BY em.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_memories TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.event_memory_likes TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_memories TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_memories TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.event_memories IS 'User-uploaded photos, videos, and reviews from events they attended';
COMMENT ON TABLE public.event_memory_likes IS 'Tracks which users liked which event memories';
COMMENT ON FUNCTION get_event_memories IS 'Retrieves all visible memories for a specific event';
COMMENT ON FUNCTION get_user_memories IS 'Retrieves all visible memories created by a specific user';
