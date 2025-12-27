-- Migration: Newsletter Signups
-- Description: Create table for newsletter email subscriptions
-- Date: 2025-12-27

-- Newsletter Signups Table
CREATE TABLE IF NOT EXISTS public.newsletter_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'landing_page', -- where they signed up from
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  unsubscribed_at TIMESTAMPTZ,
  metadata JSONB -- for tracking preferences, etc.
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON public.newsletter_signups(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_active ON public.newsletter_signups(is_active, subscribed_at DESC);

-- Enable RLS
ALTER TABLE public.newsletter_signups ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can subscribe to newsletter"
  ON public.newsletter_signups
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins can view all newsletter signups"
  ON public.newsletter_signups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage newsletter signups"
  ON public.newsletter_signups
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

-- Grant permissions
GRANT INSERT ON public.newsletter_signups TO anon;
GRANT SELECT, UPDATE, DELETE ON public.newsletter_signups TO authenticated;
