-- Add event likes functionality
-- This migration creates a table to track user likes on events

-- Create event_likes table
CREATE TABLE IF NOT EXISTS public.event_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, event_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_event_likes_user_id ON public.event_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_event_likes_event_id ON public.event_likes(event_id);
CREATE INDEX IF NOT EXISTS idx_event_likes_created_at ON public.event_likes(created_at DESC);

-- Add like_count column to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- Create function to update like count
CREATE OR REPLACE FUNCTION update_event_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.events 
        SET like_count = like_count + 1 
        WHERE id = NEW.event_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.events 
        SET like_count = GREATEST(0, like_count - 1)
        WHERE id = OLD.event_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update like count
DROP TRIGGER IF EXISTS trigger_update_event_like_count ON public.event_likes;
CREATE TRIGGER trigger_update_event_like_count
    AFTER INSERT OR DELETE ON public.event_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_event_like_count();

-- Enable RLS
ALTER TABLE public.event_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_likes
-- Users can view all likes
CREATE POLICY "Anyone can view event likes"
    ON public.event_likes FOR SELECT
    USING (true);

-- Users can insert their own likes
CREATE POLICY "Users can like events"
    ON public.event_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own likes
CREATE POLICY "Users can unlike events"
    ON public.event_likes FOR DELETE
    USING (auth.uid() = user_id);

-- Comment
COMMENT ON TABLE public.event_likes IS 'Tracks which users have liked which events';
