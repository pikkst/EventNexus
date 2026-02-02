-- Create subscription discount codes table
CREATE TABLE IF NOT EXISTS public.subscription_discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('pro', 'premium', 'enterprise', 'any')),
  percent_off INTEGER NOT NULL CHECK (percent_off > 0 AND percent_off <= 100),
  duration_months INTEGER NOT NULL CHECK (duration_months >= 1 AND duration_months <= 12),
  max_uses INTEGER NULL,
  current_uses INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  stripe_coupon_id TEXT NOT NULL,
  stripe_promotion_code_id TEXT NOT NULL,
  created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.subscription_discount_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_code_id UUID NOT NULL REFERENCES public.subscription_discount_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_session_id TEXT NULL,
  stripe_subscription_id TEXT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tier TEXT NOT NULL CHECK (tier IN ('pro', 'premium', 'enterprise')),
  percent_off INTEGER NOT NULL,
  duration_months INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_subscription_discount_codes_code ON public.subscription_discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_subscription_discount_codes_active ON public.subscription_discount_codes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_subscription_discount_codes_tier ON public.subscription_discount_codes(tier);
CREATE INDEX IF NOT EXISTS idx_subscription_discount_redemptions_user ON public.subscription_discount_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_discount_redemptions_code ON public.subscription_discount_redemptions(discount_code_id);

ALTER TABLE public.subscription_discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_discount_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage subscription discount codes" ON public.subscription_discount_codes;
DROP POLICY IF EXISTS "Admins can manage subscription discount redemptions" ON public.subscription_discount_redemptions;

CREATE POLICY "Admins can manage subscription discount codes" ON public.subscription_discount_codes
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can manage subscription discount redemptions" ON public.subscription_discount_redemptions
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
);
