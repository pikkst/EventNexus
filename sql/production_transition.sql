-- ============================================================
-- Production Transition Migration
-- ============================================================
-- This migration enables the transition from development/sandbox
-- mode to production mode. When executed, it:
-- 1. Disables beta tester features
-- 2. Updates API configuration to production keys
-- 3. Locks sandbox/test configurations
-- 4. Enables production monitoring and safeguards
-- ============================================================

-- Table: production_transition_log
-- Tracks all transitions from dev to production
CREATE TABLE IF NOT EXISTS production_transition_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transitioned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  transition_date TIMESTAMPTZ DEFAULT NOW(),
  environment_from TEXT NOT NULL, -- 'development', 'staging', 'sandbox'
  environment_to TEXT NOT NULL DEFAULT 'production',
  changes_applied JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'in_progress', 'completed', 'rolled_back')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: environment_config
-- Stores environment-specific configurations
CREATE TABLE IF NOT EXISTS environment_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment TEXT UNIQUE NOT NULL CHECK (environment IN ('development', 'staging', 'production')),
  is_active BOOLEAN DEFAULT FALSE,
  stripe_mode TEXT NOT NULL CHECK (stripe_mode IN ('test', 'live')),
  stripe_public_key TEXT,
  stripe_secret_key_ref TEXT, -- Reference to secret, not stored in plain text
  webhook_signing_secret_ref TEXT,
  api_base_url TEXT,
  is_beta_features_enabled BOOLEAN DEFAULT TRUE,
  is_sandbox_enabled BOOLEAN DEFAULT TRUE,
  external_api_timeout_ms INTEGER DEFAULT 5000,
  rate_limit_per_minute INTEGER DEFAULT 100,
  enable_maintenance_mode BOOLEAN DEFAULT FALSE,
  maintenance_message TEXT,
  enable_advanced_logging BOOLEAN DEFAULT TRUE,
  backup_schedule TEXT DEFAULT 'daily',
  allow_test_transactions BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_production_transition_log_date ON production_transition_log(transition_date);
CREATE INDEX IF NOT EXISTS idx_production_transition_log_status ON production_transition_log(status);
CREATE INDEX IF NOT EXISTS idx_environment_config_active ON environment_config(is_active);

-- ============================================================
-- FUNCTION: transition_to_production
-- Main orchestrator function for dev->production transition
-- ============================================================
CREATE OR REPLACE FUNCTION transition_to_production(
  p_admin_id UUID,
  p_stripe_public_key TEXT DEFAULT NULL,
  p_api_base_url TEXT DEFAULT 'https://www.eventnexus.eu',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_transition_id UUID;
  v_changes JSONB := '{}'::JSONB;
  v_admin_exists BOOLEAN;
BEGIN
  -- Verify admin user
  SELECT EXISTS(SELECT 1 FROM users WHERE id = p_admin_id AND role = 'admin')
  INTO v_admin_exists;
  
  IF NOT v_admin_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User is not an admin'
    );
  END IF;
  
  -- Check if already in production
  IF EXISTS(SELECT 1 FROM environment_config WHERE environment = 'production' AND is_active = true) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Platform is already in production mode'
    );
  END IF;
  
  -- START TRANSITION PROCESS
  BEGIN
    -- 1. Disable development environment
    UPDATE environment_config 
    SET is_active = false,
        updated_at = NOW()
    WHERE environment = 'development';
    
    v_changes := jsonb_set(v_changes, '{disabled_environments}', '["development"]'::JSONB);
    
    -- 2. Activate production environment
    INSERT INTO environment_config (
      environment,
      is_active,
      stripe_mode,
      stripe_public_key,
      api_base_url,
      is_beta_features_enabled,
      is_sandbox_enabled,
      allow_test_transactions,
      enable_maintenance_mode
    ) VALUES (
      'production',
      true,
      'live',
      COALESCE(p_stripe_public_key, 'pk_live_'),
      p_api_base_url,
      false, -- Disable beta features in production
      false, -- Disable sandbox mode
      false, -- No test transactions in production
      false  -- No maintenance mode
    )
    ON CONFLICT (environment) DO UPDATE
    SET is_active = true,
        stripe_mode = 'live',
        stripe_public_key = COALESCE(p_stripe_public_key, environment_config.stripe_public_key),
        api_base_url = p_api_base_url,
        is_beta_features_enabled = false,
        is_sandbox_enabled = false,
        allow_test_transactions = false,
        enable_maintenance_mode = false,
        updated_at = NOW();
    
    v_changes := jsonb_set(v_changes, '{activated_environments}', '["production"]'::JSONB);
    
    -- 3. Disable all beta tester features
    UPDATE beta_testers
    SET is_active = false,
        disabled_at = NOW()
    WHERE is_active = true;
    
    v_changes := jsonb_set(v_changes, '{beta_testers_disabled}', 'true'::JSONB);
    
    -- 4. Close all beta test invitations
    UPDATE beta_invitations
    SET status = 'archived',
        archived_at = NOW()
    WHERE status IN ('pending', 'accepted');
    
    v_changes := jsonb_set(v_changes, '{beta_invitations_archived}', 'true'::JSONB);
    
    -- 5. Disable sandbox Stripe transactions
    UPDATE system_config
    SET value = jsonb_build_object(
      'mode', 'live',
      'test_mode_disabled_at', NOW()
    )
    WHERE key = 'stripe_config';
    
    v_changes := jsonb_set(v_changes, '{stripe_mode_switched}', '"test_to_live"'::JSONB);
    
    -- 6. Update global platform mode
    UPDATE system_config
    SET value = jsonb_build_object(
      'environment', 'production',
      'beta_features_enabled', false,
      'sandbox_enabled', false,
      'transitioned_at', NOW()
    )
    WHERE key = 'platform_mode';
    
    v_changes := jsonb_set(v_changes, '{platform_mode_updated}', '"development_to_production"'::JSONB);
    
    -- 7. Enable production safeguards
    UPDATE system_config
    SET value = jsonb_build_object(
      'require_2fa_for_admin', true,
      'enable_audit_logging', true,
      'enable_ddos_protection', true,
      'enable_rate_limiting', true,
      'auto_backup_enabled', true,
      'backup_frequency', 'hourly'
    )
    WHERE key = 'production_safeguards';
    
    v_changes := jsonb_set(v_changes, '{production_safeguards_enabled}', 'true'::JSONB);
    
    -- 8. Log the transition
    INSERT INTO production_transition_log (
      transitioned_by,
      environment_from,
      environment_to,
      changes_applied,
      status,
      notes
    ) VALUES (
      p_admin_id,
      'development',
      'production',
      v_changes,
      'completed',
      COALESCE(p_notes, 'Automated transition to production')
    ) RETURNING id INTO v_transition_id;
    
    -- 9. Notify admins about transition
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      data,
      read
    )
    SELECT
      u.id,
      'Platform Transitioned to Production 🚀',
      format('The EventNexus platform has been transitioned to production mode by %s. All sandbox features are now disabled.', 
        (SELECT email FROM users WHERE id = p_admin_id LIMIT 1)
      ),
      'platform_alert',
      jsonb_build_object(
        'transition_id', v_transition_id,
        'environment', 'production',
        'changes', v_changes
      ),
      false
    FROM users u
    WHERE u.role = 'admin';
    
    v_changes := jsonb_set(v_changes, '{admin_notifications_sent}', 'true'::JSONB);
    
    -- Return success response
    RETURN jsonb_build_object(
      'success', true,
      'transition_id', v_transition_id,
      'environment', 'production',
      'changes_applied', v_changes,
      'message', 'Platform successfully transitioned to production mode. All sandbox and beta features are now disabled.'
    );
    
  EXCEPTION WHEN OTHERS THEN
    -- Rollback on error
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'code', SQLSTATE
    );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: get_current_environment
-- Returns the current active environment configuration
-- ============================================================
CREATE OR REPLACE FUNCTION get_current_environment()
RETURNS TABLE(
  environment TEXT,
  stripe_mode TEXT,
  is_beta_features_enabled BOOLEAN,
  is_sandbox_enabled BOOLEAN,
  api_base_url TEXT,
  enable_maintenance_mode BOOLEAN,
  maintenance_message TEXT,
  activated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ec.environment,
    ec.stripe_mode,
    ec.is_beta_features_enabled,
    ec.is_sandbox_enabled,
    ec.api_base_url,
    ec.enable_maintenance_mode,
    ec.maintenance_message,
    ec.created_at
  FROM environment_config ec
  WHERE ec.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: get_production_transition_history
-- Returns all production transitions for audit purposes
-- ============================================================
CREATE OR REPLACE FUNCTION get_production_transition_history()
RETURNS TABLE(
  id UUID,
  transitioned_by_email TEXT,
  transition_date TIMESTAMPTZ,
  environment_from TEXT,
  environment_to TEXT,
  status TEXT,
  changes_count INTEGER,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ptl.id,
    COALESCE(u.email, 'Unknown Admin'),
    ptl.transition_date,
    ptl.environment_from,
    ptl.environment_to,
    ptl.status,
    jsonb_object_keys(ptl.changes_applied)::INTEGER,
    ptl.notes
  FROM production_transition_log ptl
  LEFT JOIN users u ON ptl.transitioned_by = u.id
  ORDER BY ptl.transition_date DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RLS Policies (Admin-only access)
-- ============================================================
ALTER TABLE production_transition_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE environment_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin full access to production_transition_log" ON production_transition_log;
DROP POLICY IF EXISTS "Admin full access to environment_config" ON environment_config;

-- Create new policies
CREATE POLICY "Admin full access to production_transition_log" ON production_transition_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin full access to environment_config" ON environment_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- Seed initial development environment configuration
-- ============================================================
INSERT INTO environment_config (
  environment,
  is_active,
  stripe_mode,
  api_base_url,
  is_beta_features_enabled,
  is_sandbox_enabled,
  allow_test_transactions
) VALUES (
  'development',
  true,
  'test',
  'http://localhost:3000',
  true,
  true,
  true
)
ON CONFLICT (environment) DO NOTHING;

-- ============================================================
-- Complete! Test with:
-- SELECT * FROM get_current_environment();
-- SELECT * FROM transition_to_production('admin-uuid-here'::UUID, 'pk_live_xxx');
-- SELECT * FROM get_production_transition_history();
-- ============================================================
