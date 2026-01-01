-- ============================================
-- Cascade Delete for Auth Users
-- ============================================
-- When a user is deleted from auth.users, also delete from public.users
-- ============================================

-- Create function to handle user deletion
CREATE OR REPLACE FUNCTION public.handle_user_deletion()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Delete user from public.users table
    DELETE FROM public.users WHERE id = OLD.id;
    
    RAISE NOTICE 'Deleted user profile for %', OLD.id;
    RETURN OLD;
EXCEPTION
    WHEN others THEN
        -- Log error but don't fail the auth deletion
        RAISE WARNING 'Error deleting user profile for %: %', OLD.id, SQLERRM;
        RETURN OLD;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

-- Create trigger on auth.users DELETE
CREATE TRIGGER on_auth_user_deleted
    BEFORE DELETE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_deletion();

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_user_deletion IS 
'Automatically deletes user profile from public.users when auth user is deleted. Ensures data consistency.';

-- Now manually clean up orphaned users (users in public.users without corresponding auth.users)
DELETE FROM public.users 
WHERE id NOT IN (SELECT id FROM auth.users);
