-- ============================================
-- Mobile App Analytics & Logging
-- ============================================
-- Date: 2026-01-06
-- Purpose: Track mobile app usage, login attempts, and user actions
-- ============================================

-- Step 1: Create mobile app logs table
-- ============================================
CREATE TABLE IF NOT EXISTS public.mobile_app_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    app_name TEXT NOT NULL CHECK (app_name IN ('scanner', 'livemap')),
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    device_info JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_mobile_app_logs_user_id ON public.mobile_app_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mobile_app_logs_app_name ON public.mobile_app_logs(app_name);
CREATE INDEX IF NOT EXISTS idx_mobile_app_logs_event_type ON public.mobile_app_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_mobile_app_logs_created_at ON public.mobile_app_logs(created_at DESC);

-- Step 2: Enable RLS
-- ============================================
ALTER TABLE public.mobile_app_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own logs
CREATE POLICY "Users can view their own mobile logs"
    ON public.mobile_app_logs FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Admins can view all logs
CREATE POLICY "Admins can view all mobile logs"
    ON public.mobile_app_logs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Step 3: Create RPC function for logging
-- ============================================
CREATE OR REPLACE FUNCTION public.log_mobile_app_event(
    p_app_name TEXT,
    p_event_type TEXT,
    p_event_data JSONB DEFAULT '{}'::jsonb,
    p_device_info JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    log_id UUID;
    current_user_id UUID;
BEGIN
    -- Get current user ID (can be null for anonymous events)
    current_user_id := auth.uid();
    
    -- Insert log entry
    INSERT INTO public.mobile_app_logs (
        user_id,
        app_name,
        event_type,
        event_data,
        device_info,
        ip_address,
        created_at
    )
    VALUES (
        current_user_id,
        p_app_name,
        p_event_type,
        p_event_data,
        p_device_info,
        current_setting('request.headers', true)::json->>'x-forwarded-for',
        NOW()
    )
    RETURNING id INTO log_id;
    
    RETURN log_id;
EXCEPTION
    WHEN others THEN
        -- Log error but don't fail the operation
        RAISE WARNING 'Error logging mobile app event: %', SQLERRM;
        RETURN NULL;
END;
$$;

-- Grant execute to all roles (logging should always work)
GRANT EXECUTE ON FUNCTION public.log_mobile_app_event(TEXT, TEXT, JSONB, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.log_mobile_app_event(TEXT, TEXT, JSONB, JSONB) TO authenticated;

-- Step 4: Create analytics view for admins
-- ============================================
CREATE OR REPLACE VIEW public.mobile_app_analytics AS
SELECT 
    app_name,
    event_type,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users,
    DATE_TRUNC('day', created_at) as event_date
FROM public.mobile_app_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY app_name, event_type, DATE_TRUNC('day', created_at)
ORDER BY event_date DESC, event_count DESC;

-- Grant access to admins
GRANT SELECT ON public.mobile_app_analytics TO authenticated;

-- Step 5: Create helper view for recent activity
-- ============================================
CREATE OR REPLACE VIEW public.mobile_app_recent_activity AS
SELECT 
    mal.id,
    mal.app_name,
    mal.event_type,
    mal.event_data,
    mal.created_at,
    u.email as user_email,
    u.name as user_name
FROM public.mobile_app_logs mal
LEFT JOIN public.users u ON mal.user_id = u.id
WHERE mal.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY mal.created_at DESC
LIMIT 100;

GRANT SELECT ON public.mobile_app_recent_activity TO authenticated;

-- Step 6: Add comments
-- ============================================
COMMENT ON TABLE public.mobile_app_logs IS 'Tracks all mobile app events including logins, feature usage, and errors';
COMMENT ON FUNCTION public.log_mobile_app_event IS 'Mobile apps: Log any event with optional user context and device info';
COMMENT ON VIEW public.mobile_app_analytics IS 'Admin view: 30-day analytics of mobile app usage';
COMMENT ON VIEW public.mobile_app_recent_activity IS 'Admin view: Last 24 hours of mobile app activity';

-- Step 7: Log standard event types (for reference)
-- ============================================
DO $$ 
BEGIN
    RAISE NOTICE '✅ Mobile app analytics system created';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Standard event types:';
    RAISE NOTICE '   Authentication:';
    RAISE NOTICE '   - app_open: App launched';
    RAISE NOTICE '   - login_attempt: User tried to login';
    RAISE NOTICE '   - login_success: User logged in successfully';
    RAISE NOTICE '   - login_failure: Login failed';
    RAISE NOTICE '   - signup_attempt: User tried to sign up';
    RAISE NOTICE '   - signup_success: User signed up successfully';
    RAISE NOTICE '   - logout: User logged out';
    RAISE NOTICE '';
    RAISE NOTICE '   Live Map specific:';
    RAISE NOTICE '   - map_view: User viewed the map';
    RAISE NOTICE '   - event_view: User viewed event details';
    RAISE NOTICE '   - event_search: User searched for events';
    RAISE NOTICE '   - ticket_purchase: User purchased ticket';
    RAISE NOTICE '   - location_permission_granted: Location access granted';
    RAISE NOTICE '   - location_permission_denied: Location access denied';
    RAISE NOTICE '';
    RAISE NOTICE '   Scanner specific:';
    RAISE NOTICE '   - scanner_code_entered: Scanner code input';
    RAISE NOTICE '   - scanner_session_start: Scanning session started';
    RAISE NOTICE '   - ticket_scan: Ticket scanned';
    RAISE NOTICE '   - scan_success: Valid ticket';
    RAISE NOTICE '   - scan_failure: Invalid ticket';
    RAISE NOTICE '';
    RAISE NOTICE '   Errors:';
    RAISE NOTICE '   - error_network: Network error occurred';
    RAISE NOTICE '   - error_api: API error occurred';
    RAISE NOTICE '   - error_crash: App crashed';
END $$;
