-- ============================================
-- Add purchase_date Column to Tickets
-- Date: 2025-12-28
-- Purpose: Add purchase_date column for compatibility with Edge Functions
--          while keeping purchased_at for backward compatibility
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

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tickets_purchase_date ON public.tickets(purchase_date);

COMMENT ON COLUMN public.tickets.purchase_date IS 'Timestamp when ticket was purchased - used by Edge Functions';
