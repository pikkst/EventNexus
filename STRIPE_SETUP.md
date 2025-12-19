# Stripe Integration Setup Guide

## ✅ What's Been Configured

### 1. **Stripe Webhook** ✓
- Endpoint: `https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/stripe-webhook`
- Webhook Secret: Added to Supabase (`STRIPE_WEBHOOK_SECRET`)
- Events listened: checkout.session.completed, customer.subscription.*, payment_intent.*

### 2. **Edge Functions Deployed** ✓
- `create-checkout` - Creates Stripe checkout sessions
- `stripe-webhook` - Handles Stripe webhook events

### 3. **Payment Service** ✓
- `services/stripeService.ts` - Frontend Stripe integration
- Handles subscriptions and ticket purchases

### 4. **Frontend Components Updated** ✓
- `PricingPage.tsx` - Real Stripe checkout for subscriptions
- `EventDetail.tsx` - Real Stripe checkout for ticket purchases

---

## 🔧 Required Configuration

### Add These Secrets to Supabase

Go to: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/settings/functions

**Required secrets:**

```bash
# Stripe Secret Key (from Stripe Dashboard → Developers → API keys)
STRIPE_SECRET_KEY=sk_live_... (or sk_test_... for testing)

# Already added ✓
STRIPE_WEBHOOK_SECRET=***REMOVED***

# Optional: Price IDs for subscriptions (if different from defaults)
STRIPE_PRICE_PRO=price_xxx
STRIPE_PRICE_PREMIUM=price_xxx  
STRIPE_PRICE_ENTERPRISE=price_xxx
```

### Add Stripe Public Key to Database

Run this in Supabase SQL Editor:

```sql
-- Add Stripe public key to system_config
INSERT INTO public.system_config (key, value, updated_at)
VALUES ('stripe_public_key', '"pk_live_..."'::json, NOW())
ON CONFLICT (key) 
DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();
```

Replace `pk_live_...` with your actual Stripe publishable key.

---

## 📝 Stripe Dashboard Configuration

### 1. Create Products & Prices

In Stripe Dashboard → Products, create:

1. **EventNexus Pro** - €19.99/month
2. **EventNexus Premium** - €49.99/month  
3. **EventNexus Enterprise** - €149.99/month

For each product, add metadata:
- `tier` = `pro` | `premium` | `enterprise`

Copy the Price IDs (e.g., `price_1AbC...`) and add to Supabase secrets.

### 2. Webhook Configuration ✓

Already configured:
- Destination: `https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/stripe-webhook`
- Events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`

---

## 🧪 Testing

### Test Mode

1. Use test API keys (`sk_test_...` and `pk_test_...`)
2. Use test card: `4242 4242 4242 4242`
3. Any future expiry date, any CVC

### Live Mode

1. Replace with live keys (`sk_live_...` and `pk_live_...`)
2. Real payments will be processed

---

## 🔄 Payment Flow

### Subscription Purchase
1. User clicks upgrade on Pricing page
2. `createSubscriptionCheckout()` creates Stripe session via Edge Function
3. User redirected to Stripe Checkout
4. After payment, Stripe calls webhook
5. Webhook updates `users.subscription_tier` and `subscription_status`
6. User redirected back with success message

### Ticket Purchase
1. User clicks "Secure Tickets" on Event Detail page
2. `createTicketCheckout()` creates Stripe session via Edge Function
3. Pending tickets created in database
4. User redirected to Stripe Checkout
5. After payment, webhook updates tickets to `paid` status
6. User redirected back with confirmation

---

## 🗄️ Database Updates Needed

The webhook expects these columns:

```sql
-- Add to users table if missing
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP;

-- Add to tickets table if missing
ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_id TEXT;
```

---

## 🎯 Next Steps

1. ✅ Add `STRIPE_SECRET_KEY` to Supabase secrets
2. ✅ Add `stripe_public_key` to system_config table
3. ✅ Create products/prices in Stripe Dashboard
4. ✅ Test with test mode keys
5. ✅ Switch to live keys when ready to accept real payments

---

## 📞 Support

Issues? Check:
- Supabase Functions logs: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/logs/edge-functions
- Stripe webhook logs: Stripe Dashboard → Developers → Webhooks
- Browser console for frontend errors
