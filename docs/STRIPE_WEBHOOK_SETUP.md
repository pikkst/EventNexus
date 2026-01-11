# Stripe Webhook Setup

## Configure Webhook in Stripe Dashboard

The webhook is needed to automatically update user subscriptions after payment.

### Step 1: Create Webhook Endpoint #1 (Your Account)

**Important:** Stripe only allows selecting ONE "Events from" option per webhook. You need TWO webhooks pointing to the same endpoint.

1. Go to https://dashboard.stripe.com/webhooks (use /test/webhooks in Test mode)
2. Click **"Add endpoint"**
3. **Endpoint URL:** `https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/stripe-webhook`
4. **Description:** EventNexus Platform Events
5. **Events from:** Select **"Your account"** (platform payments)

### Step 2: Select Events for Webhook #1 (Your Account)

Subscribe to these events:

**Subscriptions:**
- `checkout.session.completed`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

**Ticket Payments:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `checkout.session.expired`
- `charge.refunded`
- `refund.updated`

**Transfers & Disputes:**
- `transfer.created`
- `transfer.updated`
- `transfer.reversed`
- `charge.dispute.created`
- `charge.dispute.closed`

### Step 3: Create Webhook Endpoint #2 (Connected Accounts)

1. Click **"Add endpoint"** again
2. **Endpoint URL:** `https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/stripe-webhook` (same URL!)
3. **Description:** EventNexus Connected Accounts
4. **Events from:** Select **"Connected and v2 accounts"** (organizer Connect accounts)

### Step 4: Select Events for Webhook #2 (Connected Accounts)

Subscribe to:
- `account.updated` (critical for Connect onboarding status)
- `account.external_account.created`
- `account.external_account.updated`

### Step 5: Get Webhook Signing Secrets

You now have TWO webhooks with **different** signing secrets. Set both in Supabase:

1. Copy the signing secret from webhook #1 "EventNexus Platform Events"
2. Copy the signing secret from webhook #2 "EventNexus Connected Accounts"
3. Set both in Supabase:

```bash
# Platform Events secret (Your account)
npx supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_YOUR_PLATFORM_SECRET" --project-ref anlivujgkjmajkcgbaxw

# Connected Accounts secret
npx supabase secrets set STRIPE_WEBHOOK_SECRET_CONNECTED="whsec_YOUR_CONNECTED_SECRET" --project-ref anlivujgkjmajkcgbaxw
```

4. Redeploy the webhook function:

```bash
npx supabase functions deploy stripe-webhook --no-verify-jwt --project-ref anlivujgkjmajkcgbaxw
```

**How it works:** The webhook handler will try both secrets when verifying incoming events. This allows one endpoint to handle webhooks from both "Your account" and "Connected accounts".

### Step 6: Test Both Webhooks

1. In Stripe Dashboard, go to webhook #1 (Your account)
2. Click **"Send test webhook"**
3. Select `checkout.session.completed` event
4. Click **"Send test webhook"**
5. Check logs - should show 200 OK

6. Repeat for webhook #2 (Connected accounts):
7. Select `account.updated` event
8. Should also show 200 OK

### Step 7: Fix Existing Subscription (if needed)

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
- ❌ Webhook #1 (Your account) not configured in Stripe
- ❌ Webhook #2 (Connected accounts) not configured in Stripe
- ❌ Events not selected

## After Setup

Once webhook is configured:
1. Future payments will automatically update subscription tiers
2. Ticket purchases will be confirmed
3. Refunds will be processed
4. Admin dashboard will show real-time data
