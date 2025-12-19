# Stripe Connect Setup for EventNexus

## Overview
This document outlines the implementation of Stripe Connect for organizer payouts.

## Problem Statement
Currently, all payments (subscriptions AND ticket sales) go to the platform's Stripe account. There is NO mechanism for event organizers to receive their ticket revenue.

## Solution: Stripe Connect with Standard Accounts

### Architecture
```
┌─────────────────────────────────────────────────────────────┐
│ Payment Flow                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 1. Customer purchases ticket via EventNexus checkout        │
│    ↓                                                         │
│ 2. Payment goes to PLATFORM Stripe account                  │
│    ↓                                                         │
│ 3. Platform receives full amount                            │
│    ↓                                                         │
│ 4. Platform takes 2.5% commission (configurable by tier)    │
│    ↓                                                         │
│ 5. Remaining 97.5% transferred to ORGANIZER'S account       │
│    (automated via Stripe Transfer API)                      │
│    ↓                                                         │
│ 6. Organizer can withdraw to bank via Stripe Dashboard      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Commission Structure
- **Free Tier:** 5% platform fee
- **Pro Tier:** 3% platform fee
- **Premium Tier:** 2.5% platform fee
- **Enterprise Tier:** 1.5% platform fee (custom negotiable)

## Implementation Steps

### 1. Database Schema Changes

Add to `users` table:
```sql
-- Stripe Connect fields
stripe_connect_account_id TEXT,           -- Connected account ID
stripe_connect_onboarding_complete BOOLEAN DEFAULT FALSE,
stripe_connect_details_submitted BOOLEAN DEFAULT FALSE,
stripe_connect_charges_enabled BOOLEAN DEFAULT FALSE,
stripe_connect_payouts_enabled BOOLEAN DEFAULT FALSE
```

Create new `payouts` table:
```sql
CREATE TABLE public.payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    
    -- Stripe references
    stripe_transfer_id TEXT UNIQUE,
    stripe_payout_id TEXT,
    
    -- Amounts (in cents for precision)
    gross_amount BIGINT NOT NULL,           -- Total ticket sales
    platform_fee BIGINT NOT NULL,           -- Platform commission
    net_amount BIGINT NOT NULL,             -- Amount sent to organizer
    
    -- Metadata
    ticket_count INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled')),
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT payouts_positive_amounts CHECK (gross_amount > 0 AND platform_fee >= 0 AND net_amount >= 0)
);

CREATE INDEX idx_payouts_user_id ON public.payouts(user_id);
CREATE INDEX idx_payouts_event_id ON public.payouts(event_id);
CREATE INDEX idx_payouts_status ON public.payouts(status);
CREATE INDEX idx_payouts_stripe_transfer_id ON public.payouts(stripe_transfer_id);
```

### 2. Stripe Connect Onboarding Flow

Create Edge Function: `supabase/functions/create-connect-account/index.ts`

```typescript
import Stripe from 'stripe';

// Create Stripe Connect account for organizer
const account = await stripe.accounts.create({
  type: 'standard', // Standard accounts get their own Stripe Dashboard
  country: 'EE',    // Estonia
  email: organizerEmail,
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
  metadata: {
    supabase_user_id: userId,
    platform: 'EventNexus',
  },
});

// Create account link for onboarding
const accountLink = await stripe.accountLinks.create({
  account: account.id,
  refresh_url: `${PLATFORM_URL}/#/dashboard?connect=refresh`,
  return_url: `${PLATFORM_URL}/#/dashboard?connect=success`,
  type: 'account_onboarding',
});

// Return onboarding URL
return { url: accountLink.url, accountId: account.id };
```

### 3. Update Ticket Checkout Flow

Modify `create-checkout/index.ts`:

```typescript
// Get event organizer's Stripe Connect account
const { data: event } = await supabase
  .from('events')
  .select('*, organizer:users!events_organizer_id_fkey(stripe_connect_account_id, subscription_tier)')
  .eq('id', eventId)
  .single();

if (!event.organizer.stripe_connect_account_id) {
  throw new Error('Event organizer has not completed Stripe Connect onboarding');
}

// Calculate platform fee based on organizer's subscription tier
const platformFeePercent = {
  free: 0.05,      // 5%
  pro: 0.03,       // 3%
  premium: 0.025,  // 2.5%
  enterprise: 0.015 // 1.5%
}[event.organizer.subscription_tier] || 0.05;

const totalAmount = ticketCount * pricePerTicket * 100; // in cents
const platformFee = Math.round(totalAmount * platformFeePercent);

// Store metadata for webhook processing
metadata: {
  user_id: userId,
  event_id: eventId,
  ticket_count: ticketCount.toString(),
  organizer_id: event.organizer_id,
  organizer_connect_account: event.organizer.stripe_connect_account_id,
  platform_fee: platformFee.toString(),
  gross_amount: totalAmount.toString(),
  net_amount: (totalAmount - platformFee).toString(),
  type: 'ticket',
}
```

### 4. Webhook: Auto-Transfer to Organizer

Update `stripe-webhook/index.ts`:

```typescript
case 'checkout.session.completed': {
  const session = event.data.object;
  const metadata = session.metadata;
  
  if (metadata.type === 'ticket') {
    // 1. Update tickets to paid status
    await supabase
      .from('tickets')
      .update({ 
        payment_status: 'paid',
        stripe_payment_id: session.payment_intent,
      })
      .eq('stripe_session_id', session.id);
    
    // 2. Create transfer to organizer's Connect account
    const transfer = await stripe.transfers.create({
      amount: parseInt(metadata.net_amount),
      currency: 'eur',
      destination: metadata.organizer_connect_account,
      description: `Ticket sales payout for event ${metadata.event_id}`,
      metadata: {
        event_id: metadata.event_id,
        session_id: session.id,
        ticket_count: metadata.ticket_count,
      },
    });
    
    // 3. Record payout in database
    await supabase.from('payouts').insert({
      user_id: metadata.organizer_id,
      event_id: metadata.event_id,
      stripe_transfer_id: transfer.id,
      gross_amount: parseInt(metadata.gross_amount),
      platform_fee: parseInt(metadata.platform_fee),
      net_amount: parseInt(metadata.net_amount),
      ticket_count: parseInt(metadata.ticket_count),
      status: 'paid',
      processed_at: new Date().toISOString(),
    });
    
    // 4. Create notification for organizer
    await supabase.from('notifications').insert({
      user_id: metadata.organizer_id,
      type: 'payout',
      message: `€${(parseInt(metadata.net_amount) / 100).toFixed(2)} payout processed for your event`,
      read: false,
    });
  }
  break;
}

// Handle transfer failures
case 'transfer.failed': {
  const transfer = event.data.object;
  
  await supabase
    .from('payouts')
    .update({
      status: 'failed',
      error_message: transfer.failure_message,
    })
    .eq('stripe_transfer_id', transfer.id);
  
  break;
}
```

### 5. UI Components

#### Organizer Dashboard: Connect Account Setup
```tsx
// In UserProfile.tsx or Dashboard.tsx
const handleConnectStripe = async () => {
  const { data, error } = await supabase.functions.invoke('create-connect-account', {
    body: { userId: user.id }
  });
  
  if (data?.url) {
    window.location.href = data.url; // Redirect to Stripe onboarding
  }
};

{!user.stripe_connect_onboarding_complete && (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
    <h3 className="font-semibold text-yellow-900">Complete Stripe Setup</h3>
    <p className="text-sm text-yellow-700 mt-1">
      Connect your bank account to receive ticket sale payouts
    </p>
    <button onClick={handleConnectStripe} className="mt-3 btn-primary">
      Connect Stripe Account
    </button>
  </div>
)}
```

#### Payouts History Component
```tsx
const PayoutsHistory: React.FC<{ userId: string }> = ({ userId }) => {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  
  useEffect(() => {
    const fetchPayouts = async () => {
      const { data } = await supabase
        .from('payouts')
        .select('*, event:events(name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      setPayouts(data || []);
    };
    
    fetchPayouts();
  }, [userId]);
  
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Payout History</h2>
      {payouts.map(payout => (
        <div key={payout.id} className="border rounded-lg p-4">
          <div className="flex justify-between">
            <div>
              <p className="font-semibold">{payout.event.name}</p>
              <p className="text-sm text-gray-600">
                {payout.ticket_count} tickets sold
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-green-600">
                €{(payout.net_amount / 100).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">
                Platform fee: €{(payout.platform_fee / 100).toFixed(2)}
              </p>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className={`px-2 py-1 rounded text-xs ${
              payout.status === 'paid' ? 'bg-green-100 text-green-800' :
              payout.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {payout.status}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(payout.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
```

### 6. Environment Variables

Add to Supabase Edge Functions secrets:
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set PLATFORM_URL=https://pikkst.github.io/EventNexus
```

### 7. Testing Flow

1. **Organizer Setup:**
   - Create user account
   - Click "Connect Stripe"
   - Complete Stripe onboarding (add bank details)
   - Verify `stripe_connect_onboarding_complete = true`

2. **Create Event:**
   - Organizer creates paid event
   - Set ticket price

3. **Customer Purchase:**
   - Customer buys ticket
   - Payment goes to platform account
   - Webhook triggers transfer
   - Organizer receives payout (minus fee)

4. **Verify:**
   - Check `payouts` table
   - Check Stripe Dashboard > Transfers
   - Check organizer's Stripe Dashboard > Balances

## Revenue Flow Example

**Example: 100€ ticket sale (organizer on Premium tier)**

```
Customer pays:        100.00 €
↓
Platform receives:    100.00 €
↓
Stripe fee (~2.9%):    -2.90 €
Platform balance:      97.10 €
↓
Platform fee (2.5%):   -2.50 €
Organizer receives:    94.60 €
```

**Platform keeps:** 2.50 € (commission)  
**Organizer gets:** 94.60 € (transferred automatically)

## Security Considerations

1. **RLS Policies:** Organizers can only see their own payouts
2. **Connect Account Verification:** Check `charges_enabled` before allowing event creation
3. **Transfer Limits:** Implement daily/monthly transfer limits for fraud prevention
4. **Webhook Signature Verification:** Always verify Stripe webhook signatures

## Admin Dashboard Integration

Add payout monitoring to `AdminCommandCenter.tsx`:

```tsx
- Total payouts processed
- Pending transfers
- Failed transfers (require manual review)
- Platform commission earned
```

## Future Enhancements

1. **Batch Payouts:** Weekly/monthly payout schedules instead of per-transaction
2. **Multi-Currency:** Support for USD, GBP beyond EUR
3. **Express Accounts:** Faster onboarding for organizers
4. **Refund Handling:** Reverse transfers when tickets are refunded
5. **Payout Delays:** Hold payouts until event completion (prevent fraud)

## Implementation Priority

1. ✅ Database schema (payouts table)
2. ✅ Create Connect Account Edge Function
3. ✅ Update checkout flow with transfer metadata
4. ✅ Webhook transfer automation
5. ⬜ UI components (connect button, payout history)
6. ⬜ Admin monitoring dashboard
7. ⬜ Testing with Stripe test mode
8. ⬜ Go live with real accounts

## Documentation Links

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Stripe Transfers API](https://stripe.com/docs/connect/charges-transfers)
- [Standard Accounts](https://stripe.com/docs/connect/standard-accounts)
- [Webhook Events](https://stripe.com/docs/api/events/types)
