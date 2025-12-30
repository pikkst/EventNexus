-- Add tutorial_completed field to users table
-- This ensures the onboarding tutorial only shows once per user

DO $$ 
BEGIN
    -- Add tutorial_completed if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'tutorial_completed') THEN
        ALTER TABLE public.users 
        ADD COLUMN tutorial_completed BOOLEAN NOT NULL DEFAULT false;
        
        COMMENT ON COLUMN public.users.tutorial_completed IS 
            'Tracks whether user has completed or skipped the onboarding tutorial';
    END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_tutorial_completed 
    ON public.users(tutorial_completed) 
    WHERE tutorial_completed = false;

-- For existing users who already have localStorage onboarding_completed,
-- we'll handle migration in the application layer
