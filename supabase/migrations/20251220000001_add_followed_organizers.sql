-- Add followed_organizers column to users table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'followed_organizers'
    ) THEN
        ALTER TABLE public.users 
        ADD COLUMN followed_organizers UUID[] DEFAULT '{}';
        
        COMMENT ON COLUMN public.users.followed_organizers IS 'Array of organizer user IDs that this user follows';
    END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_followed_organizers 
ON public.users USING GIN (followed_organizers);
