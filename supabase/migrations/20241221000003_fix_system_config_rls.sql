-- Fix system_config RLS policies for admin access
-- Allow admins to insert and update system configuration

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can read system config" ON public.system_config;
DROP POLICY IF EXISTS "Admins can insert system config" ON public.system_config;
DROP POLICY IF EXISTS "Admins can update system config" ON public.system_config;

-- Enable RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Allow admins to read system config
CREATE POLICY "Admins can read system config"
ON public.system_config
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Allow admins to insert system config
CREATE POLICY "Admins can insert system config"
ON public.system_config
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Allow admins to update system config
CREATE POLICY "Admins can update system config"
ON public.system_config
FOR UPDATE
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

-- Allow service role to manage system config (for Edge Functions)
CREATE POLICY "Service role can manage system config"
ON public.system_config
FOR ALL
USING (true)
WITH CHECK (true);

COMMENT ON TABLE public.system_config IS 'System configuration key-value store with admin-only access';
