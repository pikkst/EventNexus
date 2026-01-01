# Ticket Payment & Capacity Fix - Summary

## Issues Fixed

### 1. ❌ **Ticket Purchase Revenue Not Showing (Payment Status Issue)**

**Problem:** When users purchased tickets, the financial data didn't reach the event creator's dashboard. Revenue showed €0 even though tickets were sold.

**Root Cause:**
- In `create-checkout` Edge Function, tickets were created without `payment_status` and `stripe_session_id`
- Revenue functions filter by `payment_status = 'paid'`, so tickets without this field weren't counted
- If webhook failed or arrived late, tickets became "orphaned" with no payment tracking

**Solution:**
1. ✅ Updated `create-checkout/index.ts` to set:
   - `payment_status: 'pending'` initially
   - `stripe_session_id: session.id` for tracking
   - `purchase_date: now` for timestamp
2. ✅ Created migration `20260101000003_fix_orphaned_tickets.sql` to:
   - Fix existing orphaned tickets (NULL payment_status → 'paid')
   - Add NOT NULL constraint to payment_status
   - Create trigger to auto-sync event attendee counts
   - Sync all existing events with correct counts

**Files Changed:**
- `/workspaces/EventNexus/supabase/functions/create-checkout/index.ts`
- `/workspaces/EventNexus/supabase/migrations/20260101000003_fix_orphaned_tickets.sql`

---

### 2. ❌ **Event Capacity Showing Wrong Total**

**Problem:** Event page showed "100 Left of 100" even when ticket templates had different totals:
- General Admission: 50 tickets (49 available after 1 sale)
- VIP: 10 tickets
- **Actual Total: 60 tickets**, not 100

**Root Cause:**
- EventDetail component always displayed `event.maxAttendees` (static field)
- Didn't calculate dynamic total from ticket template quantities

**Solution:**
✅ Updated `EventDetail.tsx` to calculate:
```typescript
const totalCapacity = ticketTemplates.length > 0
  ? ticketTemplates.reduce((sum, t) => sum + t.quantity_sold + t.quantity_available, 0)
  : event.maxAttendees;

const remaining = ticketTemplates.length > 0
  ? ticketTemplates.reduce((sum, t) => sum + t.quantity_available, 0)
  : event.maxAttendees - currentAttendees;
```

Now displays: "49 Left of 60" (correct!)

**Files Changed:**
- `/workspaces/EventNexus/components/EventDetail.tsx`

---

## Deployment

### Quick Deploy Script
Created `/workspaces/EventNexus/deploy_ticket_payment_fix.sh` to:
1. Deploy migration (fix orphaned tickets)
2. Deploy updated Edge Function
3. Verify fixes with SQL queries

### Manual Steps
```bash
# 1. Deploy migration
cd /workspaces/EventNexus
supabase db push

# 2. Deploy Edge Function
supabase functions deploy create-checkout --no-verify-jwt

# 3. Build and deploy frontend
npm run build
# Deploy dist/ to production
```

---

## Testing Checklist

- [ ] Purchase a ticket on production
- [ ] Check revenue appears immediately in organizer dashboard
- [ ] Verify event capacity shows correct total (sum of templates)
- [ ] Confirm "X Left of Y" shows accurate counts
- [ ] Test webhook updates ticket to 'paid' status
- [ ] Verify trigger auto-syncs attendee counts

---

## Technical Details

### Revenue Query Logic
```sql
-- Only counts tickets with payment_status = 'paid'
LEFT JOIN tickets t ON t.event_id = e.id 
  AND t.status = 'valid' 
  AND t.payment_status = 'paid'
```

### Ticket Template Capacity
- `quantity_sold` - tickets purchased
- `quantity_available` - tickets remaining
- **Total = quantity_sold + quantity_available**

### Auto-Sync Trigger
```sql
CREATE TRIGGER trigger_sync_event_revenue
  AFTER INSERT OR UPDATE OF payment_status ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION sync_event_revenue_on_ticket_update();
```

Automatically updates `events.attendees_count` when ticket payment_status changes to 'paid'.

---

## Next Steps

1. Deploy fixes to production
2. Test ticket purchase flow end-to-end
3. Monitor webhook logs for any errors
4. Verify all existing events show correct capacity
