-- Credit System: Promo/Reward Codes and Credit Transactions
-- This migration creates tables for managing credit codes and transactions

-- Create promo_codes table
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  code_type VARCHAR(20) NOT NULL CHECK (code_type IN ('promo', 'reward')),
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('free', 'basic', 'pro', 'enterprise')),
  credit_amount INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT valid_credit_amount CHECK (credit_amount >= 0),
  CONSTRAINT valid_uses CHECK (max_uses IS NULL OR max_uses > 0),
  CONSTRAINT valid_current_uses CHECK (current_uses >= 0)
);

-- Create credit_transactions table
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('admin_grant', 'code_redemption', 'purchase', 'refund', 'adjustment')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  promo_code_id UUID REFERENCES public.promo_codes(id) ON DELETE SET NULL,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create code_redemptions table to track who used which codes
CREATE TABLE IF NOT EXISTS public.code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  credit_granted INTEGER NOT NULL,
  UNIQUE(promo_code_id, user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON public.promo_codes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_promo_codes_type ON public.promo_codes(code_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_code_redemptions_user_id ON public.code_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_code_redemptions_promo_code_id ON public.code_redemptions(promo_code_id);

-- Enable RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for promo_codes
-- Admins can do everything
CREATE POLICY "Admins can manage promo codes" ON public.promo_codes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Users can view active codes (for validation)
CREATE POLICY "Users can view active promo codes" ON public.promo_codes
  FOR SELECT
  TO authenticated
  USING (is_active = true AND (valid_until IS NULL OR valid_until > NOW()));

-- RLS Policies for credit_transactions
-- Admins can view all transactions
CREATE POLICY "Admins can view all credit transactions" ON public.credit_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Users can view their own transactions
CREATE POLICY "Users can view own credit transactions" ON public.credit_transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Only admins can insert transactions (via functions)
CREATE POLICY "Admins can insert credit transactions" ON public.credit_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- RLS Policies for code_redemptions
-- Admins can view all redemptions
CREATE POLICY "Admins can view all code redemptions" ON public.code_redemptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Users can view their own redemptions
CREATE POLICY "Users can view own code redemptions" ON public.code_redemptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own redemptions (via functions)
CREATE POLICY "Users can redeem codes" ON public.code_redemptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Database function to validate and redeem a code
CREATE OR REPLACE FUNCTION public.redeem_promo_code(
  p_user_id UUID,
  p_code VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_promo_code RECORD;
  v_current_credits INTEGER;
  v_new_balance INTEGER;
  v_transaction_id UUID;
  v_redemption_id UUID;
BEGIN
  -- Lock the promo code row for update
  SELECT * INTO v_promo_code
  FROM public.promo_codes
  WHERE code = p_code
  FOR UPDATE;

  -- Validate code exists
  IF v_promo_code IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code not found');
  END IF;

  -- Validate code is active
  IF v_promo_code.is_active = false THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code is inactive');
  END IF;

  -- Validate code validity period
  IF v_promo_code.valid_until IS NOT NULL AND v_promo_code.valid_until < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code has expired');
  END IF;

  IF v_promo_code.valid_from > NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code is not yet valid');
  END IF;

  -- Check if user already redeemed this code
  IF EXISTS (
    SELECT 1 FROM public.code_redemptions
    WHERE promo_code_id = v_promo_code.id AND user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code already redeemed by this user');
  END IF;

  -- Check max uses
  IF v_promo_code.max_uses IS NOT NULL AND v_promo_code.current_uses >= v_promo_code.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code has reached maximum uses');
  END IF;

  -- Get current user credits
  SELECT COALESCE(credits, 0) INTO v_current_credits
  FROM public.users
  WHERE id = p_user_id;

  v_new_balance := v_current_credits + v_promo_code.credit_amount;

  -- Update user credits
  UPDATE public.users
  SET credits = v_new_balance,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Record transaction
  INSERT INTO public.credit_transactions (
    user_id,
    transaction_type,
    amount,
    balance_after,
    promo_code_id,
    performed_by,
    reason,
    metadata
  )
  VALUES (
    p_user_id,
    'code_redemption',
    v_promo_code.credit_amount,
    v_new_balance,
    v_promo_code.id,
    p_user_id,
    'Promo code redeemed: ' || p_code,
    jsonb_build_object('code', p_code, 'tier', v_promo_code.tier)
  )
  RETURNING id INTO v_transaction_id;

  -- Record redemption
  INSERT INTO public.code_redemptions (
    promo_code_id,
    user_id,
    credit_granted
  )
  VALUES (
    v_promo_code.id,
    p_user_id,
    v_promo_code.credit_amount
  )
  RETURNING id INTO v_redemption_id;

  -- Update promo code usage count
  UPDATE public.promo_codes
  SET current_uses = current_uses + 1
  WHERE id = v_promo_code.id;

  RETURN jsonb_build_object(
    'success', true,
    'credits_granted', v_promo_code.credit_amount,
    'new_balance', v_new_balance,
    'transaction_id', v_transaction_id,
    'redemption_id', v_redemption_id
  );
END;
$$;

-- Database function for admins to grant credits directly
CREATE OR REPLACE FUNCTION public.admin_grant_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_credits INTEGER;
  v_new_balance INTEGER;
  v_transaction_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Verify admin privileges
  SELECT role = 'admin' INTO v_is_admin
  FROM public.users
  WHERE id = p_admin_id;

  IF v_is_admin IS NULL OR v_is_admin = false THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin privileges required');
  END IF;

  -- Validate amount
  IF p_amount = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount cannot be zero');
  END IF;

  -- Get current user credits
  SELECT COALESCE(credits, 0) INTO v_current_credits
  FROM public.users
  WHERE id = p_user_id;

  IF v_current_credits IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  v_new_balance := v_current_credits + p_amount;

  -- Prevent negative balance
  IF v_new_balance < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot reduce credits below zero');
  END IF;

  -- Update user credits
  UPDATE public.users
  SET credits = v_new_balance,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Record transaction
  INSERT INTO public.credit_transactions (
    user_id,
    transaction_type,
    amount,
    balance_after,
    performed_by,
    reason,
    metadata
  )
  VALUES (
    p_user_id,
    'admin_grant',
    p_amount,
    v_new_balance,
    p_admin_id,
    p_reason,
    jsonb_build_object('granted_by', p_admin_id)
  )
  RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'amount', p_amount,
    'new_balance', v_new_balance,
    'transaction_id', v_transaction_id
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.redeem_promo_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_credits TO authenticated;

-- Create view for code statistics (admin only)
CREATE OR REPLACE VIEW public.promo_code_stats AS
SELECT
  pc.id,
  pc.code,
  pc.code_type,
  pc.tier,
  pc.credit_amount,
  pc.max_uses,
  pc.current_uses,
  pc.is_active,
  pc.valid_from,
  pc.valid_until,
  pc.created_at,
  COUNT(DISTINCT cr.user_id) as unique_users,
  COALESCE(SUM(cr.credit_granted), 0) as total_credits_granted
FROM public.promo_codes pc
LEFT JOIN public.code_redemptions cr ON pc.id = cr.promo_code_id
GROUP BY pc.id;

-- Grant view access to admins
GRANT SELECT ON public.promo_code_stats TO authenticated;

COMMENT ON TABLE public.promo_codes IS 'Stores promo and reward codes for credit distribution';
COMMENT ON TABLE public.credit_transactions IS 'Audit log of all credit transactions';
COMMENT ON TABLE public.code_redemptions IS 'Tracks which users redeemed which codes';
COMMENT ON FUNCTION public.redeem_promo_code IS 'Validates and redeems a promo code for a user';
COMMENT ON FUNCTION public.admin_grant_credits IS 'Allows admins to directly grant or adjust user credits';
