-- Complete system_config table setup with proper RLS policies
-- This ensures admin can manage configuration via UI

-- Ensure table exists
CREATE TABLE IF NOT EXISTS public.system_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Admin full access to system_config" ON public.system_config;
DROP POLICY IF EXISTS "Admins can read system config" ON public.system_config;
DROP POLICY IF EXISTS "Admins can insert system config" ON public.system_config;
DROP POLICY IF EXISTS "Admins can update system config" ON public.system_config;
DROP POLICY IF EXISTS "Admins can delete system config" ON public.system_config;
DROP POLICY IF EXISTS "Service role can manage system config" ON public.system_config;

-- Enable RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Create comprehensive admin access policy
CREATE POLICY "Admin full access to system_config"
ON public.system_config
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_config_key ON public.system_config(key);

-- Insert default configuration if not exists
INSERT INTO public.system_config (key, value, updated_at)
VALUES 
  ('global_ticket_fee', '2.5'::jsonb, NOW()),
  ('credit_value', '0.50'::jsonb, NOW()),
  ('maintenance_mode', 'false'::jsonb, NOW())
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE public.system_config IS 'System-wide configuration key-value store with admin-only access';
