-- ============================================
-- Stripe Connect Integration Setup
-- ============================================
-- Adds support for Stripe Connect accounts, automated payouts, and refunds
-- This enables event organizers to receive ticket revenue automatically

-- Step 1: Add Stripe Connect fields to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS
  stripe_connect_account_id TEXT UNIQUE,
  stripe_connect_onboarding_complete BOOLEAN DEFAULT FALSE,
  stripe_connect_details_submitted BOOLEAN DEFAULT FALSE,
  stripe_connect_charges_enabled BOOLEAN DEFAULT FALSE,
  stripe_connect_payouts_enabled BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_stripe_connect_account 
  ON public.users(stripe_connect_account_id) WHERE stripe_connect_account_id IS NOT NULL;

-- Step 2: Add payout tracking fields to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS
  payout_scheduled_date TIMESTAMP WITH TIME ZONE,
  payout_processed BOOLEAN DEFAULT FALSE,
  payout_hold_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_events_payout_pending 
  ON public.events(date, payout_processed) WHERE payout_processed = FALSE;

-- Step 3: Create payouts table for tracking all financial transfers
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  
  -- Stripe references
  stripe_transfer_id TEXT UNIQUE,
  stripe_payout_id TEXT,
  
  -- Amounts in cents for precision (avoid floating point errors)
  gross_amount BIGINT NOT NULL,           -- Total ticket sales revenue (cents)
  platform_fee BIGINT NOT NULL,           -- Platform commission taken (cents)
  net_amount BIGINT NOT NULL,             -- Amount sent to organizer (cents)
  
  -- Metadata
  ticket_count INTEGER NOT NULL,
  event_date TIMESTAMP WITH TIME ZONE,
  payout_eligible_date TIMESTAMP WITH TIME ZONE, -- When payout became eligible
  auto_payout_enabled BOOLEAN DEFAULT TRUE,
  
  -- Status tracking
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled')),
  error_message TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT payouts_positive_amounts CHECK (
    gross_amount > 0 AND 
    platform_fee >= 0 AND 
    net_amount >= 0 AND
    gross_amount = platform_fee + net_amount
  )
);

-- Indexes for payouts
CREATE INDEX idx_payouts_user_id ON public.payouts(user_id);
CREATE INDEX idx_payouts_event_id ON public.payouts(event_id);
CREATE INDEX idx_payouts_status ON public.payouts(status);
CREATE INDEX idx_payouts_stripe_transfer_id ON public.payouts(stripe_transfer_id) WHERE stripe_transfer_id IS NOT NULL;
CREATE INDEX idx_payouts_date ON public.payouts(created_at DESC);

-- Step 4: Create refunds table for tracking ticket refunds
CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  event_id UUID NOT NULL REFERENCES public.events(id),
  
  -- Amounts in cents
  original_amount BIGINT NOT NULL,        -- Original ticket price
  refund_amount BIGINT NOT NULL,          -- Amount being refunded
  refund_percent INTEGER NOT NULL,        -- Percentage (100, 50, or 0)
  platform_fee_refunded BIGINT NOT NULL,  -- Platform fee returned
  organizer_amount_reversed BIGINT NOT NULL, -- Amount clawed back from organizer
  
  -- Status tracking
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'processed', 'failed')),
  reason TEXT,
  rejection_reason TEXT,
  
  -- Stripe references
  stripe_refund_id TEXT UNIQUE,
  
  -- Timestamps
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT refunds_valid_percent CHECK (refund_percent IN (0, 50, 100)),
  CONSTRAINT refunds_positive_amounts CHECK (
    original_amount > 0 AND 
    refund_amount >= 0 AND 
    refund_amount <= original_amount
  )
);

-- Indexes for refunds
CREATE INDEX idx_refunds_ticket_id ON public.refunds(ticket_id);
CREATE INDEX idx_refunds_user_id ON public.refunds(user_id);
CREATE INDEX idx_refunds_event_id ON public.refunds(event_id);
CREATE INDEX idx_refunds_status ON public.refunds(status);
CREATE INDEX idx_refunds_date ON public.refunds(created_at DESC);

-- Step 5: Add refund tracking to tickets table
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS
  refund_requested BOOLEAN DEFAULT FALSE,
  refund_processed BOOLEAN DEFAULT FALSE,
  refunded_at TIMESTAMP WITH TIME ZONE;

-- Step 6: Create RLS policies for payouts
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- Users can view their own payouts
CREATE POLICY "Users can view own payouts"
  ON public.payouts FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Only system (via Edge Functions) can insert/update payouts
CREATE POLICY "Service role can manage payouts"
  ON public.payouts FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Step 7: Create RLS policies for refunds
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- Users can view refunds for their tickets
CREATE POLICY "Users can view own refunds"
  ON public.refunds FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = refunds.event_id AND events.organizer_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Users can request refunds for their own tickets
CREATE POLICY "Users can request own refunds"
  ON public.refunds FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    status = 'pending'
  );

-- Service role can manage all refunds
CREATE POLICY "Service role can manage refunds"
  ON public.refunds FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Step 8: Create function to calculate refund eligibility
CREATE OR REPLACE FUNCTION get_refund_eligibility(
  p_event_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  eligible BOOLEAN,
  refund_percent INTEGER,
  reason TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  days_until_event INTEGER;
BEGIN
  days_until_event := EXTRACT(DAY FROM (p_event_date - NOW()));
  
  IF days_until_event >= 7 THEN
    -- Full refund available 7+ days before event
    RETURN QUERY SELECT TRUE, 100, 'Full refund available (7+ days before event)';
  ELSIF days_until_event >= 3 THEN
    -- Partial refund 3-7 days before event
    RETURN QUERY SELECT TRUE, 50, 'Partial refund available (3-7 days before event)';
  ELSE
    -- No refund within 3 days of event
    RETURN QUERY SELECT FALSE, 0, 'No refunds available within 3 days of event';
  END IF;
END;
$$;

-- Step 9: Create function to get pending payouts for admin dashboard
CREATE OR REPLACE FUNCTION get_pending_payouts_summary()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'count', COUNT(*),
    'total_amount', COALESCE(SUM(net_amount), 0),
    'total_gross', COALESCE(SUM(gross_amount), 0),
    'total_fees', COALESCE(SUM(platform_fee), 0),
    'events', json_agg(json_build_object(
      'event_id', e.id,
      'event_name', e.name,
      'event_date', e.date,
      'organizer_name', u.name,
      'ticket_count', COUNT(t.id),
      'gross_amount', SUM(t.price * 100)::BIGINT,
      'eligible_date', e.date + INTERVAL '2 days'
    ))
  ) INTO result
  FROM public.events e
  JOIN public.users u ON e.organizer_id = u.id
  LEFT JOIN public.tickets t ON t.event_id = e.id AND t.payment_status = 'paid' AND t.status != 'cancelled'
  WHERE e.date < NOW() - INTERVAL '2 days'
    AND e.payout_processed = FALSE
    AND u.stripe_connect_charges_enabled = TRUE
  GROUP BY e.id, e.name, e.date, u.name
  HAVING COUNT(t.id) > 0;
  
  RETURN COALESCE(result, '{}'::json);
END;
$$;

-- Step 10: Create notification types for payout events
INSERT INTO public.system_config (key, value, updated_at)
VALUES (
  'notification_types',
  '["event", "ticket", "proximity", "system", "payout", "refund"]'::json,
  NOW()
)
ON CONFLICT (key) DO UPDATE SET
  value = '["event", "ticket", "proximity", "system", "payout", "refund"]'::json,
  updated_at = NOW();

-- Step 11: Create trigger to update updated_at timestamp on payouts
CREATE OR REPLACE FUNCTION update_payouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payouts_updated_at_trigger
  BEFORE UPDATE ON public.payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_payouts_updated_at();

-- Step 12: Grant necessary permissions
GRANT SELECT ON public.payouts TO authenticated;
GRANT SELECT ON public.refunds TO authenticated;
GRANT INSERT ON public.refunds TO authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Verification queries (commented out - uncomment to test)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'payouts';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'refunds';
-- SELECT * FROM get_refund_eligibility(NOW() + INTERVAL '10 days');
-- SELECT * FROM get_pending_payouts_summary();
