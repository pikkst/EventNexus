# Simplified Stripe Connect Flow for EventNexus

## Overview: Making It Dead Simple for Organizers

### The Big Question: "Do organizers need to create a Stripe account?"

**YES, but it's incredibly easy:**
- ⏱️ **5-10 minutes** one-time setup
- 📱 **Mobile-friendly** - can do from phone
- 🔐 **Secure** - Stripe handles all banking/compliance
- 🌍 **International** - works in 40+ countries
- 💳 **No fees** - free for organizers to create

---

## Simplified Onboarding Flow

### Step 1: Organizer Creates First Paid Event

```
When organizer tries to publish a paid event:
┌─────────────────────────────────────────┐
│ 🎫 Create Event: "Summer Music Festival" │
│                                          │
│ Price: 25 €                             │
│ Capacity: 500                           │
│                                          │
│ [Publish Event] ← Click                 │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ ⚠️ One-Time Setup Required              │
│                                          │
│ To receive payments, connect your       │
│ bank account via Stripe (5 min)         │
│                                          │
│ ✓ Secure & encrypted                    │
│ ✓ Get paid automatically                │
│ ✓ Track all earnings                    │
│                                          │
│ [Connect Bank Account] [Later]          │
└─────────────────────────────────────────┘
```

### Step 2: Stripe Express Onboarding (Fastest Option)

We use **Stripe Express Accounts** (not Standard) for simplest flow:

```typescript
// Simplified onboarding - NO separate Stripe Dashboard login needed
const account = await stripe.accounts.create({
  type: 'express', // ← Simpler than 'standard'
  country: 'EE',
  email: organizerEmail,
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
  business_type: 'individual', // or 'company'
});
```

**What organizer sees:**
1. Click "Connect Bank Account"
2. Redirects to Stripe (branded with EventNexus logo)
3. Fill form (5 fields):
   - Full name
   - Date of birth
   - Bank account (IBAN)
   - ID number (isikukood)
   - Phone number
4. Click "Agree & Submit"
5. **Done!** Redirects back to EventNexus

**No password, no separate login, no dashboard needed** (unless they want it).

---

## Payment Hold Strategy (CRITICAL for Refunds)

### The Refund Problem You Identified

```
❌ BAD FLOW (what we want to avoid):
1. Customer buys ticket → 100€ to platform
2. Platform instantly transfers 97.50€ to organizer
3. Customer requests refund next day
4. Platform has to refund 100€ but only has 2.50€!
5. Platform loses money 💸
```

### Solution: Smart Payout Timing

```
✅ GOOD FLOW:
1. Customer buys ticket → 100€ to platform
2. Platform HOLDS money until event date
3. If refund requested → Full 100€ available
4. If no refund → Auto-transfer to organizer after event
```

### Three Payout Timing Strategies

#### **Option A: Post-Event Payout (RECOMMENDED - Safest)**

```
Timeline:
Day 0:  Customer buys ticket → €100 to platform
Day 1-7: Refund window open → Money held
Day 7:  Event happens → Still held
Day 9:  Auto-payout → €97.50 to organizer (48h after event)

Refund Policy:
- Full refund: Up to 7 days before event
- 50% refund: 3-7 days before event  
- No refund: Less than 3 days before event
- Platform keeps money until safe to transfer
```

**Pros:**
- ✅ Platform never loses money on refunds
- ✅ Organizer gets money after successful event
- ✅ Simple logic

**Cons:**
- ⏳ Organizer waits for money (but knows timeline upfront)

---

#### **Option B: Rolling Payout (BALANCED)**

```
Timeline:
Day 0:  Customer buys ticket → €100 to platform
Day 14: Auto-payout → €97.50 to organizer (if event is >14 days away)

If event in <14 days:
- Hold until 2 days after event
- Then auto-payout

Refund Policy:
- If refund needed after payout → Deduct from organizer's next payout
- If no next payout → Request bank transfer reversal (rare)
```

**Pros:**
- ✅ Organizer gets money earlier for advance events
- ✅ Platform still protected for near-term events

**Cons:**
- ⚠️ Complex logic
- ⚠️ Rare edge case: organizer owes money back

---

#### **Option C: Instant Payout with Escrow Reserve (FASTEST)**

```
Timeline:
Day 0: Customer buys ticket → €100 to platform
       Platform transfers €95 to organizer
       Platform keeps €5 (2.5% fee + 2.5% reserve)

Reserve Pool:
- Platform holds 2.5% extra in reserve
- Reserve released 7 days after event
- Covers refunds if needed

Example: €10,000 ticket sales
- Organizer gets: €9,500 instantly
- Platform fee: €250
- Reserve: €250 (released post-event)
```

**Pros:**
- ✅ Organizer gets cash flow immediately
- ✅ Platform protected by reserve

**Cons:**
- ⚠️ Organizer gets slightly less upfront (95% vs 97.5%)

---

## Recommended Implementation: Option A (Post-Event)

### Why This is Best for EventNexus

1. **Simple** - Easy to understand and communicate
2. **Safe** - Zero risk of platform losing money
3. **Fair** - Clear refund policy protects customers
4. **Automated** - No manual intervention needed

### Database Schema Updates

```sql
-- Add payout timing fields to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS
  payout_scheduled_date TIMESTAMP WITH TIME ZONE,
  payout_processed BOOLEAN DEFAULT FALSE,
  payout_hold_reason TEXT;

-- Update payouts table with event-aware logic
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS
  event_date TIMESTAMP WITH TIME ZONE,
  payout_eligible_date TIMESTAMP WITH TIME ZONE,
  auto_payout_enabled BOOLEAN DEFAULT TRUE;

-- Refund tracking
CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  event_id UUID NOT NULL REFERENCES public.events(id),
  
  -- Amounts
  refund_amount BIGINT NOT NULL, -- in cents
  platform_fee_refunded BIGINT NOT NULL,
  organizer_amount_reversed BIGINT NOT NULL,
  
  -- Status
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  reason TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Stripe
  stripe_refund_id TEXT UNIQUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_refunds_ticket_id ON public.refunds(ticket_id);
CREATE INDEX idx_refunds_status ON public.refunds(status);
```

### Automated Payout Logic (Edge Function)

Create `supabase/functions/process-scheduled-payouts/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

serve(async (req: Request) => {
  try {
    const now = new Date();
    
    // Find events that happened 2+ days ago and haven't been paid out
    const { data: events, error } = await supabase
      .from('events')
      .select(`
        id,
        name,
        date,
        organizer_id,
        organizer:users!events_organizer_id_fkey(
          id,
          email,
          name,
          subscription_tier,
          stripe_connect_account_id,
          stripe_connect_charges_enabled
        )
      `)
      .lt('date', new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()) // 2 days ago
      .eq('payout_processed', false)
      .not('organizer.stripe_connect_account_id', 'is', null);

    if (error) throw error;

    const results = [];

    for (const event of events || []) {
      // Check if organizer can receive payments
      if (!event.organizer.stripe_connect_charges_enabled) {
        console.log(`Skipping event ${event.id} - organizer not enabled`);
        continue;
      }

      // Calculate total ticket sales for this event
      const { data: tickets } = await supabase
        .from('tickets')
        .select('price, status')
        .eq('event_id', event.id)
        .eq('payment_status', 'paid')
        .neq('status', 'cancelled');

      if (!tickets || tickets.length === 0) {
        console.log(`No paid tickets for event ${event.id}`);
        continue;
      }

      const totalRevenue = tickets.reduce((sum, t) => sum + (t.price || 0), 0);
      const grossAmountCents = Math.round(totalRevenue * 100);

      // Calculate platform fee based on subscription tier
      const platformFeePercent = {
        free: 0.05,
        pro: 0.03,
        premium: 0.025,
        enterprise: 0.015
      }[event.organizer.subscription_tier] || 0.05;

      const platformFeeCents = Math.round(grossAmountCents * platformFeePercent);
      const netAmountCents = grossAmountCents - platformFeeCents;

      // Skip if nothing to transfer
      if (netAmountCents <= 0) continue;

      try {
        // Create Stripe transfer
        const transfer = await stripe.transfers.create({
          amount: netAmountCents,
          currency: 'eur',
          destination: event.organizer.stripe_connect_account_id,
          description: `Payout for "${event.name}" (${tickets.length} tickets)`,
          metadata: {
            event_id: event.id,
            event_name: event.name,
            ticket_count: tickets.length.toString(),
            event_date: event.date,
          },
        });

        // Record payout in database
        await supabase.from('payouts').insert({
          user_id: event.organizer.id,
          event_id: event.id,
          stripe_transfer_id: transfer.id,
          gross_amount: grossAmountCents,
          platform_fee: platformFeeCents,
          net_amount: netAmountCents,
          ticket_count: tickets.length,
          status: 'paid',
          event_date: event.date,
          processed_at: now.toISOString(),
        });

        // Mark event as paid out
        await supabase
          .from('events')
          .update({ 
            payout_processed: true,
            payout_scheduled_date: now.toISOString()
          })
          .eq('id', event.id);

        // Send notification to organizer
        await supabase.from('notifications').insert({
          user_id: event.organizer.id,
          type: 'payout',
          message: `💰 Payout of €${(netAmountCents / 100).toFixed(2)} processed for "${event.name}"`,
          read: false,
        });

        results.push({
          event_id: event.id,
          event_name: event.name,
          status: 'success',
          amount: netAmountCents / 100,
          transfer_id: transfer.id,
        });

      } catch (transferError) {
        console.error(`Transfer failed for event ${event.id}:`, transferError);
        
        // Record failed payout
        await supabase.from('payouts').insert({
          user_id: event.organizer.id,
          event_id: event.id,
          gross_amount: grossAmountCents,
          platform_fee: platformFeeCents,
          net_amount: netAmountCents,
          ticket_count: tickets.length,
          status: 'failed',
          error_message: transferError.message,
          event_date: event.date,
        });

        results.push({
          event_id: event.id,
          event_name: event.name,
          status: 'failed',
          error: transferError.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        processed: results.length,
        results,
        timestamp: now.toISOString(),
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scheduled payout error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

### Scheduled Execution (Supabase Cron)

Add to `supabase/migrations/20250120000001_payout_automation.sql`:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily payout processing at 2 AM UTC
SELECT cron.schedule(
  'process-scheduled-payouts',
  '0 2 * * *', -- Every day at 2 AM
  $$
  SELECT net.http_post(
    url := 'https://[YOUR_PROJECT_REF].supabase.co/functions/v1/process-scheduled-payouts',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

---

## Refund Handling Logic

### Refund Request Flow

```typescript
// In EventDetail.tsx - customer requests refund
const handleRequestRefund = async (ticketId: string, eventDate: Date) => {
  const daysUntilEvent = Math.floor((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  let refundPercent = 0;
  if (daysUntilEvent >= 7) {
    refundPercent = 100; // Full refund
  } else if (daysUntilEvent >= 3) {
    refundPercent = 50; // Partial refund
  } else {
    alert('No refunds available within 3 days of event');
    return;
  }
  
  const { data, error } = await supabase.functions.invoke('request-refund', {
    body: { ticketId, refundPercent }
  });
  
  if (!error) {
    alert(`Refund request submitted (${refundPercent}% refund)`);
  }
};
```

### Refund Processing (Edge Function)

Create `supabase/functions/request-refund/index.ts`:

```typescript
serve(async (req: Request) => {
  const { ticketId, refundPercent } = await req.json();
  
  // Get ticket details
  const { data: ticket } = await supabase
    .from('tickets')
    .select('*, event:events(*)')
    .eq('id', ticketId)
    .single();
  
  if (!ticket) throw new Error('Ticket not found');
  
  const refundAmountCents = Math.round(ticket.price * 100 * (refundPercent / 100));
  
  // Check if event payout already processed
  const { data: event } = await supabase
    .from('events')
    .select('payout_processed')
    .eq('id', ticket.event_id)
    .single();
  
  if (event?.payout_processed) {
    // Money already transferred to organizer - need to request reversal
    return new Response(
      JSON.stringify({ 
        error: 'Event already paid out - contact support',
        requiresManualReview: true 
      }),
      { status: 400 }
    );
  }
  
  // Process refund via Stripe
  const refund = await stripe.refunds.create({
    payment_intent: ticket.stripe_payment_id,
    amount: refundAmountCents,
    reason: 'requested_by_customer',
    metadata: {
      ticket_id: ticketId,
      refund_percent: refundPercent.toString(),
    },
  });
  
  // Record refund
  await supabase.from('refunds').insert({
    ticket_id: ticketId,
    user_id: ticket.user_id,
    event_id: ticket.event_id,
    refund_amount: refundAmountCents,
    platform_fee_refunded: Math.round(refundAmountCents * 0.025),
    organizer_amount_reversed: refundAmountCents - Math.round(refundAmountCents * 0.025),
    status: 'processed',
    stripe_refund_id: refund.id,
    processed_at: new Date().toISOString(),
  });
  
  // Update ticket status
  await supabase
    .from('tickets')
    .update({ status: 'refunded' })
    .eq('id', ticketId);
  
  return new Response(
    JSON.stringify({ success: true, refundAmount: refundAmountCents / 100 }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

---

## User Experience: Super Simple Flow

### For Organizers

**First Time:**
```
1. Create paid event
2. Click "Connect Bank" (5 min Stripe form)
3. Event published
4. Tickets sell
5. Event happens
6. 2 days later: Money appears in bank account 💰
```

**Next Events:**
```
1. Create event
2. Publish (already connected!)
3. Auto-payout after event
```

### For Customers

**Buying:**
```
1. Find event
2. Buy ticket with card
3. Get QR code instantly
```

**Refund:**
```
1. Click "Request Refund" on ticket
2. See refund policy (100%/50%/0%)
3. Confirm
4. Money back in 5-10 days
```

---

## Admin Dashboard Monitoring

Add to `AdminCommandCenter.tsx`:

```tsx
<div className="grid grid-cols-3 gap-4">
  {/* Pending Payouts */}
  <div className="bg-yellow-50 p-4 rounded-lg">
    <h3 className="font-semibold">Pending Payouts</h3>
    <p className="text-2xl font-bold">{pendingPayouts.length}</p>
    <p className="text-sm text-gray-600">
      €{pendingPayoutsTotal.toFixed(2)} total
    </p>
  </div>
  
  {/* Processed Today */}
  <div className="bg-green-50 p-4 rounded-lg">
    <h3 className="font-semibold">Paid Today</h3>
    <p className="text-2xl font-bold">{paidToday}</p>
    <p className="text-sm text-gray-600">
      €{paidTodayTotal.toFixed(2)} transferred
    </p>
  </div>
  
  {/* Refunds */}
  <div className="bg-red-50 p-4 rounded-lg">
    <h3 className="font-semibold">Refunds Processed</h3>
    <p className="text-2xl font-bold">{refundsToday}</p>
    <p className="text-sm text-gray-600">
      €{refundsTodayTotal.toFixed(2)} returned
    </p>
  </div>
</div>
```

---

## Implementation Checklist

### Phase 1: Database & Core (Week 1)
- [ ] Add Stripe Connect fields to users table
- [ ] Create payouts table
- [ ] Create refunds table
- [ ] Add payout tracking to events table
- [ ] Write RLS policies

### Phase 2: Stripe Connect Onboarding (Week 1-2)
- [ ] Create `create-connect-account` Edge Function
- [ ] Create `check-connect-status` Edge Function
- [ ] Add "Connect Bank" UI in Dashboard
- [ ] Handle return URLs after Stripe onboarding
- [ ] Show connection status badge

### Phase 3: Payout Automation (Week 2)
- [ ] Create `process-scheduled-payouts` Edge Function
- [ ] Set up Supabase cron job (daily at 2 AM)
- [ ] Update webhook to NOT instant-transfer
- [ ] Add payout notifications
- [ ] Create payout history component

### Phase 4: Refund System (Week 3)
- [ ] Create `request-refund` Edge Function
- [ ] Add refund button to tickets
- [ ] Show refund policy based on event date
- [ ] Handle refund webhook events
- [ ] Create refunds admin view

### Phase 5: Testing (Week 3-4)
- [ ] Test with Stripe test mode
- [ ] Test Express account onboarding
- [ ] Test full purchase → payout flow
- [ ] Test refund scenarios
- [ ] Test edge cases (cancelled events, etc.)

### Phase 6: Go Live (Week 4)
- [ ] Switch to live Stripe keys
- [ ] Create first real Connect account
- [ ] Monitor first real payout
- [ ] Set up monitoring alerts
- [ ] Document for organizers

---

## Key Advantages of This Approach

### 1. **Simplicity**
- One button: "Connect Bank Account"
- 5-minute setup
- No separate Stripe login needed

### 2. **Safety**
- Platform never loses money on refunds
- Money held until event completes
- Clear refund policy

### 3. **Automation**
- Daily cron job processes payouts
- No manual intervention
- Organizers don't need to request payment

### 4. **Transparency**
- Organizers see expected payout date
- Payout history in dashboard
- Email notifications when paid

### 5. **Fair**
- Lower fees for paid subscribers
- Clear commission structure
- No hidden charges

---

## Cost Analysis Example

**Event: 100 tickets @ €25 each = €2,500 revenue**

| Tier | Platform Fee | Organizer Gets | Platform Keeps |
|------|--------------|----------------|----------------|
| Free | 5% (€125) | €2,375 | €125 |
| Pro | 3% (€75) | €2,425 | €75 |
| Premium | 2.5% (€62.50) | €2,437.50 | €62.50 |
| Enterprise | 1.5% (€37.50) | €2,462.50 | €37.50 |

**Note:** Stripe's 2.9% + €0.25 payment processing fee is deducted from gross before split.

**Real numbers:**
- Customer pays: €25.00
- Stripe takes: ~€0.98 (2.9% + €0.25)
- Platform receives: €24.02
- Platform fee (Premium): €0.60 (2.5%)
- Organizer gets: €23.42

---

## Questions & Answers

**Q: What if organizer needs money urgently before event?**
A: They can contact support for manual early payout (with manual approval).

**Q: What if event gets cancelled?**
A: Admin can trigger mass refunds, no payout happens.

**Q: What if organizer's bank account is invalid?**
A: Stripe transfer fails, we retry next day, notify organizer to update details.

**Q: Can organizer change bank account?**
A: Yes, they log into Stripe Express dashboard and update.

**Q: What about international organizers?**
A: Stripe Connect works in 40+ countries with local payouts.

---

## Summary

✅ **Simple**: One-time 5-minute setup  
✅ **Safe**: Post-event payouts prevent refund issues  
✅ **Automated**: Daily cron job handles everything  
✅ **Fair**: Clear fees, transparent process  
✅ **Scalable**: Works for 1 ticket or 10,000 tickets  

**Next Step:** Start with Phase 1 (database migrations) and build incrementally.

<function_calls>
<invoke name="read_file">
<parameter name="filePath">/workspaces/EventNexus/constants.tsx