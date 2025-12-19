# Stripe Webhook Setup

## Configure Webhook in Stripe Dashboard

The webhook is needed to automatically update user subscriptions after payment.

### Step 1: Create Webhook Endpoint

1. Go to https://dashboard.stripe.com/test/webhooks
2. Click **"Add endpoint"**
3. **Endpoint URL:** `https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/stripe-webhook`
4. **Description:** EventNexus Payment Webhook

### Step 2: Select Events to Listen

Add these events (click "Select events" → search for each):

**For Subscriptions:**
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

**For Tickets:**
- `payment_intent.succeeded`
- `charge.refunded`

**For Connect Payouts:**
- `account.updated`

### Step 3: Get Webhook Signing Secret

After creating the webhook:
1. Click on the webhook you just created
2. Copy the **Signing secret** (starts with `whsec_...`)
3. Run this command:

```bash
npx supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_YOUR_SECRET_HERE" --project-ref anlivujgkjmajkcgbaxw
```

4. Redeploy the webhook function:

```bash
npx supabase functions deploy stripe-webhook --no-verify-jwt --project-ref anlivujgkjmajkcgbaxw
```

### Step 4: Test the Webhook

1. In Stripe Dashboard, go to your webhook
2. Click **"Send test webhook"**
3. Select `checkout.session.completed` event
4. Click **"Send test webhook"**
5. Check the webhook logs - should show 200 OK

### Step 5: Fix Existing Subscription (if needed)

If you already paid but your subscription wasn't updated, run this in Supabase SQL Editor:

```sql
-- Replace with your user email and desired tier
UPDATE public.users 
SET 
  subscription_tier = 'pro',  -- Change to: pro, premium, or enterprise
  subscription_status = 'active'
WHERE email = 'your-email@example.com';
```

---

## Webhook Endpoint URL

```
https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/stripe-webhook
```

## Current Configuration Status

- ✅ Webhook function deployed
- ❌ Webhook endpoint not configured in Stripe
- ❌ Events not selected

## After Setup

Once webhook is configured:
1. Future payments will automatically update subscription tiers
2. Ticket purchases will be confirmed
3. Refunds will be processed
4. Admin dashboard will show real-time data
