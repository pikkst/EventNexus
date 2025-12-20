-- Fix user creation issues in EventNexus database

-- 1. Check existing policies on users table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'users';

-- 2. Add INSERT policy for users table
-- This allows new users to create their profile during registration
DROP POLICY IF EXISTS "Users can insert their own profile during signup" ON users;
CREATE POLICY "Users can insert their own profile during signup" ON users
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- 3. Create function to automatically create user profile when auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, name, email, avatar, role, subscription, credits, followed_organizers, notification_prefs)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
        NEW.email,
        'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id::text,
        'attendee',
        'free',
        0,
        '[]'::jsonb,
        jsonb_build_object(
            'pushEnabled', true,
            'emailEnabled', true,
            'proximityAlerts', true,
            'alertRadius', 5,
            'interestedCategories', '[]'::jsonb
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 5. Verify policies after creation
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'users';
