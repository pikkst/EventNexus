-- Create data deletion requests table for GDPR compliance
CREATE TABLE IF NOT EXISTS public.data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  user_id TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  confirmation_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_platform_user 
ON public.data_deletion_requests(platform, user_id);

CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_status 
ON public.data_deletion_requests(status);

-- Enable RLS
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Only admins can view deletion requests
CREATE POLICY "Admins can view all deletion requests"
ON public.data_deletion_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- System can insert deletion requests (via Edge Functions with service role)
CREATE POLICY "Service role can insert deletion requests"
ON public.data_deletion_requests
FOR INSERT
WITH CHECK (true);

COMMENT ON TABLE public.data_deletion_requests IS 'Tracks data deletion requests from social media platforms for GDPR compliance';
