-- ============================================
-- FIX: Tickets Table Structure & Free Tier Stripe Access
-- Date: 2025-12-28
-- Purpose: Add missing columns and enable Stripe for all paid event organizers
-- ============================================

-- STEP 1: Add missing columns to tickets table
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;

-- STEP 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_tickets_payment_status ON public.tickets(payment_status);
CREATE INDEX IF NOT EXISTS idx_tickets_status_payment ON public.tickets(status, payment_status);

-- STEP 3: Update existing tickets with proper values
-- Set price from event price for existing tickets
UPDATE public.tickets t
SET price = COALESCE(e.price, 0)
FROM public.events e
WHERE t.event_id = e.id
  AND t.price IS NULL OR t.price = 0;

-- STEP 4: Set payment_status based on ticket status
-- Valid tickets are considered paid (they went through Stripe checkout)
UPDATE public.tickets
SET payment_status = CASE 
  WHEN status = 'valid' THEN 'paid'
  WHEN status = 'used' THEN 'paid'
  WHEN status = 'cancelled' THEN 'refunded'
  ELSE 'pending'
END
WHERE payment_status = 'pending' OR payment_status IS NULL;

-- STEP 5: Add constraint to ensure valid payment statuses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tickets_payment_status_check'
  ) THEN
    ALTER TABLE public.tickets 
    ADD CONSTRAINT tickets_payment_status_check 
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled'));
  END IF;
END $$;

-- STEP 6: Fix Stripe Connect status for users with completed onboarding
-- This user has onboarding complete but charges not enabled - likely a webhook miss
UPDATE public.users
SET stripe_connect_charges_enabled = TRUE,
    stripe_connect_payouts_enabled = TRUE
WHERE stripe_connect_onboarding_complete = TRUE
  AND stripe_connect_account_id IS NOT NULL
  AND (stripe_connect_charges_enabled = FALSE OR stripe_connect_payouts_enabled = FALSE);

-- STEP 7: Verify the fixes
SELECT 
  'Tickets with payment_status' as check_type,
  COUNT(*) as total,
  COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid,
  COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN price > 0 THEN 1 END) as with_price
FROM public.tickets

UNION ALL

SELECT 
  'Users with Stripe Connect' as check_type,
  COUNT(*) as total,
  COUNT(CASE WHEN stripe_connect_onboarding_complete THEN 1 END) as onboarding_complete,
  COUNT(CASE WHEN stripe_connect_charges_enabled THEN 1 END) as charges_enabled,
  COUNT(CASE WHEN stripe_connect_payouts_enabled THEN 1 END) as payouts_enabled
FROM public.users
WHERE stripe_connect_account_id IS NOT NULL;

-- ============================================
-- RESULTS: Run this to see the specific user
-- ============================================
SELECT 
  id,
  name,
  email,
  subscription_tier,
  stripe_connect_account_id,
  stripe_connect_onboarding_complete,
  stripe_connect_charges_enabled,
  stripe_connect_payouts_enabled
FROM public.users
WHERE email = 'plog.pieesti@gmail.com';
