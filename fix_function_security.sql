-- Make functions run with owner privileges (SECURITY DEFINER)
-- This allows them to bypass RLS policies

ALTER FUNCTION capture_platform_intelligence() SECURITY DEFINER;
ALTER FUNCTION get_strategic_recommendation() SECURITY DEFINER;
ALTER FUNCTION auto_create_strategic_campaign(UUID) SECURITY DEFINER;
ALTER FUNCTION run_intelligent_autonomous_operations() SECURITY DEFINER;
ALTER FUNCTION run_autonomous_operations_with_posting() SECURITY DEFINER;
ALTER FUNCTION log_autonomous_action(TEXT, UUID, TEXT, TEXT, JSONB, TEXT) SECURITY DEFINER;
