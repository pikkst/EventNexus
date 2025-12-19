-- Create subscription_payments table to track individual payments
-- This allows admin dashboard to show payment history

BEGIN;

-- Create subscription payments tracking table
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subscription_tier TEXT NOT NULL CHECK (subscription_tier IN ('pro', 'premium', 'enterprise')),
  amount_cents BIGINT NOT NULL,
  currency TEXT DEFAULT 'eur',
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,
  status TEXT DEFAULT 'succeeded' CHECK (status IN ('succeeded', 'failed', 'pending', 'refunded')),
  billing_reason TEXT, -- 'subscription_create', 'subscription_cycle', 'subscription_update'
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscription_payments_user_id ON public.subscription_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_created_at ON public.subscription_payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_stripe_invoice ON public.subscription_payments(stripe_invoice_id);

-- Enable RLS
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

-- Admin can see all payments
CREATE POLICY "Admins can view all subscription payments"
  ON public.subscription_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Users can see their own payments
CREATE POLICY "Users can view own subscription payments"
  ON public.subscription_payments
  FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.subscription_payments IS 'Track individual subscription payment transactions';

COMMIT;
