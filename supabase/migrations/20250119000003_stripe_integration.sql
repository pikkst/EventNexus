-- Add Stripe-related columns to support payment integration
-- Run this in Supabase SQL Editor

-- Add Stripe columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'past_due')),
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP;

-- Add Stripe columns to tickets table
ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_id TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON public.users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_stripe_session ON public.tickets(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_tickets_payment_status ON public.tickets(payment_status);

-- Add system_config table if it doesn't exist (for Stripe public key storage)
CREATE TABLE IF NOT EXISTS public.system_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on system_config (read-only for authenticated users)
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read system config"
    ON public.system_config
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only service role can modify system config"
    ON public.system_config
    FOR ALL
    TO service_role
    USING (true);

-- Insert Stripe public key placeholder (replace with your actual key)
INSERT INTO public.system_config (key, value, updated_at)
VALUES ('stripe_public_key', '"pk_test_YOUR_KEY_HERE"'::json, NOW())
ON CONFLICT (key) 
DO NOTHING;

-- Verify changes
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('users', 'tickets') 
  AND column_name LIKE '%stripe%' OR column_name = 'payment_status' OR column_name = 'subscription_status'
ORDER BY table_name, ordinal_position;

-- Check system_config
SELECT * FROM public.system_config WHERE key = 'stripe_public_key';
