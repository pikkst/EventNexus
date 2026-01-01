-- ============================================
-- Fix Orphaned Tickets with Missing Payment Status
-- Date: 2026-01-01
-- Purpose: Fix tickets that were purchased but have no payment_status set
--          This happens when webhook fails or arrives before ticket creation
-- ============================================

-- Step 1: Update tickets with NULL payment_status to 'paid' if they have valid data
-- These are likely successful purchases where webhook failed
UPDATE public.tickets
SET payment_status = 'paid'
WHERE payment_status IS NULL
  AND purchased_at IS NOT NULL
    AND status = 'valid'
      AND price_paid > 0;

      -- Step 2: Set default payment_status to 'pending' for any remaining NULL values
      UPDATE public.tickets
      SET payment_status = 'pending'
      WHERE payment_status IS NULL;

      -- Step 3: Ensure all existing tickets have purchase_date set
      UPDATE public.tickets
      SET purchase_date = purchased_at
      WHERE purchase_date IS NULL
        AND purchased_at IS NOT NULL;

        -- Step 4: Add NOT NULL constraint to payment_status (after fixing data)
        ALTER TABLE public.tickets 
          ALTER COLUMN payment_status SET DEFAULT 'pending',
            ALTER COLUMN payment_status SET NOT NULL;

            -- Step 5: Create function to automatically sync revenue when tickets are updated
            CREATE OR REPLACE FUNCTION sync_event_revenue_on_ticket_update()
            RETURNS TRIGGER AS $$
            BEGIN
              -- When a ticket's payment_status changes to 'paid', update event metrics
                IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
                    -- Update event's attendees_count
                        UPDATE events
                            SET attendees_count = (
                                  SELECT COUNT(*)
                                        FROM tickets
                                              WHERE event_id = NEW.event_id
                                                      AND payment_status = 'paid'
                                                              AND status != 'cancelled'
                                                                  )
                                                                      WHERE id = NEW.event_id;
                                                                          
                                                                              RAISE NOTICE 'Updated event % attendee count after ticket % payment confirmed', NEW.event_id, NEW.id;
                                                                                END IF;
                                                                                  
                                                                                    RETURN NEW;
                                                                                    END;
                                                                                    $$ LANGUAGE plpgsql SECURITY DEFINER;

                                                                                    -- Step 6: Create trigger to auto-sync revenue
                                                                                    DROP TRIGGER IF EXISTS trigger_sync_event_revenue ON public.tickets;
                                                                                    CREATE TRIGGER trigger_sync_event_revenue
                                                                                      AFTER INSERT OR UPDATE OF payment_status ON public.tickets
                                                                                        FOR EACH ROW
                                                                                          EXECUTE FUNCTION sync_event_revenue_on_ticket_update();

                                                                                          -- Step 7: Run initial sync for all events with paid tickets
                                                                                          DO $$
                                                                                          DECLARE
                                                                                            event_record RECORD;
                                                                                            BEGIN
                                                                                              FOR event_record IN 
                                                                                                  SELECT DISTINCT event_id 
                                                                                                      FROM tickets 
                                                                                                          WHERE payment_status = 'paid'
                                                                                                            LOOP
                                                                                                                UPDATE events
                                                                                                                    SET attendees_count = (
                                                                                                                          SELECT COUNT(*)
                                                                                                                                FROM tickets
                                                                                                                                      WHERE event_id = event_record.event_id
                                                                                                                                              AND payment_status = 'paid'
                                                                                                                                                      AND status != 'cancelled'
                                                                                                                                                          )
                                                                                                                                                              WHERE id = event_record.event_id;
                                                                                                                                                                END LOOP;
                                                                                                                                                                  
                                                                                                                                                                    RAISE NOTICE 'Synced attendee counts for all events with paid tickets';
                                                                                                                                                                    END $$;

                                                                                                                                                                    COMMENT ON FUNCTION sync_event_revenue_on_ticket_update IS 'Automatically updates event attendee count when ticket payment status changes';
                                                                                                                                                                    