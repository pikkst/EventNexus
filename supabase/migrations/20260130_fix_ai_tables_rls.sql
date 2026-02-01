-- Fix RLS for AI-related tables
-- STEP 4 of ACTION_PLAN.md: RLS Policy Audit & Fix
-- Date: 2026-01-30

-- =====================================================
-- 1. ai_language_routing - Store AI language detection routing
-- =====================================================

ALTER TABLE public.ai_language_routing ENABLE ROW LEVEL SECURITY;

-- Admins can read all routing data
CREATE POLICY "Admins can read AI language routing"
  ON public.ai_language_routing
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Service role can manage routing
CREATE POLICY "Service role can manage AI language routing"
  ON public.ai_language_routing
  FOR ALL
  TO service_role
  USING (true);

-- Authenticated users can insert routing logs
CREATE POLICY "Authenticated can insert AI language routing"
  ON public.ai_language_routing
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- 2. ai_model_usage - Track AI model usage/costs
-- =====================================================

ALTER TABLE public.ai_model_usage ENABLE ROW LEVEL SECURITY;

-- Admins can read all usage data
CREATE POLICY "Admins can read AI model usage"
  ON public.ai_model_usage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Service role can manage usage tracking
CREATE POLICY "Service role can manage AI model usage"
  ON public.ai_model_usage
  FOR ALL
  TO service_role
  USING (true);

-- Edge Functions can insert usage logs
CREATE POLICY "Functions can insert AI model usage"
  ON public.ai_model_usage
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- =====================================================
-- 3. ai_platform_stats - Platform-wide AI statistics
-- =====================================================

ALTER TABLE public.ai_platform_stats ENABLE ROW LEVEL SECURITY;

-- Admins can read platform stats
CREATE POLICY "Admins can read AI platform stats"
  ON public.ai_platform_stats
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Service role full access to stats
CREATE POLICY "Service role can manage AI platform stats"
  ON public.ai_platform_stats
  FOR ALL
  TO service_role
  USING (true);

-- Edge Functions can update stats
CREATE POLICY "Functions can update AI platform stats"
  ON public.ai_platform_stats
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- =====================================================
-- 4. ai_regional_settings - Regional AI configurations
-- =====================================================

ALTER TABLE public.ai_regional_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage regional settings
CREATE POLICY "Admins can manage AI regional settings"
  ON public.ai_regional_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Service role full access
CREATE POLICY "Service role can manage AI regional settings"
  ON public.ai_regional_settings
  FOR ALL
  TO service_role
  USING (true);

-- Authenticated users can read regional settings
CREATE POLICY "Authenticated can read AI regional settings"
  ON public.ai_regional_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check that RLS is now enabled and policies exist:
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' 
--   AND tablename IN ('ai_language_routing', 'ai_model_usage', 'ai_platform_stats', 'ai_regional_settings');

-- Should show all with rowsecurity = true

-- Count policies:
-- SELECT tablename, COUNT(*) as policy_count 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
--   AND tablename IN ('ai_language_routing', 'ai_model_usage', 'ai_platform_stats', 'ai_regional_settings')
-- GROUP BY tablename;

-- Should show 3 policies per table
