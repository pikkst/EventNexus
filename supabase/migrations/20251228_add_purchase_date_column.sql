-- ============================================
-- Add Missing Columns to Tickets Table
-- Date: 2025-12-28
-- Purpose: Add missing columns for Edge Function compatibility
--          (purchase_date, payment_status, stripe_session_id, price)
--          Also make holder_name, holder_email, ticket_name nullable
-- ============================================

-- Add purchase_date column to tickets table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tickets' 
        AND column_name = 'purchase_date'
    ) THEN
        ALTER TABLE public.tickets 
        ADD COLUMN purchase_date TIMESTAMPTZ DEFAULT NOW();
        
        -- Copy data from purchased_at to purchase_date for existing records
        UPDATE public.tickets 
        SET purchase_date = purchased_at 
        WHERE purchased_at IS NOT NULL AND purchase_date IS NULL;
    END IF;
END $$;

-- Add payment_status column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tickets' 
        AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE public.tickets 
        ADD COLUMN payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));
    END IF;
END $$;

-- Add stripe_session_id column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tickets' 
        AND column_name = 'stripe_session_id'
    ) THEN
        ALTER TABLE public.tickets 
        ADD COLUMN stripe_session_id TEXT;
    END IF;
END $$;

-- Add price column (alias for price_paid for backward compatibility)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tickets' 
        AND column_name = 'price'
    ) THEN
        ALTER TABLE public.tickets 
        ADD COLUMN price NUMERIC DEFAULT 0;
        
        -- Copy data from price_paid to price for existing records
        UPDATE public.tickets 
        SET price = price_paid 
        WHERE price_paid IS NOT NULL AND price IS NULL;
    END IF;
END $$;

-- Make holder_name, holder_email, and ticket_name nullable (they can be set later)
DO $$ 
BEGIN
    -- Make holder_name nullable
    ALTER TABLE public.tickets ALTER COLUMN holder_name DROP NOT NULL;
    
    -- Make holder_email nullable
    ALTER TABLE public.tickets ALTER COLUMN holder_email DROP NOT NULL;
    
    -- Make ticket_name nullable
    ALTER TABLE public.tickets ALTER COLUMN ticket_name DROP NOT NULL;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tickets_purchase_date ON public.tickets(purchase_date);
CREATE INDEX IF NOT EXISTS idx_tickets_payment_status ON public.tickets(payment_status);
CREATE INDEX IF NOT EXISTS idx_tickets_stripe_session_id ON public.tickets(stripe_session_id);

-- Add comments
COMMENT ON COLUMN public.tickets.purchase_date IS 'Timestamp when ticket was purchased - used by Edge Functions';
COMMENT ON COLUMN public.tickets.payment_status IS 'Payment status: pending, paid, failed, or refunded';
COMMENT ON COLUMN public.tickets.stripe_session_id IS 'Stripe checkout session ID for tracking payments';
COMMENT ON COLUMN public.tickets.price IS 'Ticket price (alias for price_paid for backward compatibility)';
