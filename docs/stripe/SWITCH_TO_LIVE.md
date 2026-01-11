# Switch Stripe to Live Mode

Use this checklist to move from Stripe test/sandbox to real, live payments.

## Prerequisites
- Stripe account with live mode enabled.
- Live `Products` and `Prices` created for `pro`, `premium`, `enterprise` tiers.
- Access to Supabase project `anlivujgkjmajkcgbaxw`.

## 1) Update Supabase Edge Function Secrets
Set live keys and price IDs for functions that call Stripe.

```bash
# Replace values with your LIVE keys and price IDs
npx supabase secrets set STRIPE_SECRET_KEY="sk_live_..." --project-ref anlivujgkjmajkcgbaxw
npx supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_live_..." --project-ref anlivujgkjmajkcgbaxw
npx supabase secrets set STRIPE_PRICE_PRO="price_live_pro" --project-ref anlivujgkjmajkcgbaxw
npx supabase secrets set STRIPE_PRICE_PREMIUM="price_live_premium" --project-ref anlivujgkjmajkcgbaxw
npx supabase secrets set STRIPE_PRICE_ENTERPRISE="price_live_enterprise" --project-ref anlivujgkjmajkcgbaxw
```

Then redeploy the Stripe functions:

```bash
npx supabase functions deploy create-checkout --project-ref anlivujgkjmajkcgbaxw
npx supabase functions deploy stripe-webhook --no-verify-jwt --project-ref anlivujgkjmajkcgbaxw
npx supabase functions deploy verify-checkout --project-ref anlivujgkjmajkcgbaxw
npx supabase functions deploy cancel-subscription --project-ref anlivujgkjmajkcgbaxw
```

## 2) Set Publishable Key in `system_config`
Frontend reads `stripe_public_key` from the database. Update it to your live publishable key.

```sql
-- Run in Supabase SQL Editor
INSERT INTO public.system_config (key, value)
VALUES ('stripe_public_key', '"pk_live_..."')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

Ensure the RLS policy that allows reading `stripe_public_key` is applied (see `sql/stripe/FIX_STRIPE_PUBLIC_KEY_RLS.sql`).

## 3) Configure Stripe Webhook Endpoints (Live)

**Important:** You need TWO separate webhooks pointing to the same endpoint URL.

### Webhook #1: Your Account (Platform Events)
- Endpoint: https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/stripe-webhook
- Events from: **Your account**
- Subscribe to:
  - Subscriptions: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
  - Ticket payments: `payment_intent.succeeded`, `payment_intent.payment_failed`, `checkout.session.expired`, `charge.refunded`, `refund.updated`
  - Transfers & disputes: `transfer.created`, `transfer.updated`, `transfer.reversed`, `charge.dispute.created`, `charge.dispute.closed`

### Webhook #2: Connected Accounts (Organizer Events)
- Endpoint: https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/stripe-webhook (same!)
- Events from: **Connected and v2 accounts**
- Subscribe to:
  - `account.updated`
  - `account.external_account.created`
  - `account.external_account.updated`

### Webhook Secret
- Copy **BOTH** signing secrets from your two webhooks:
  - Platform Events (`whsec_live_...`)
  - Connected Accounts (`whsec_live_...`)
- Set both in Supabase:
```bash
npx supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_live_platform..." --project-ref anlivujgkjmajkcgbaxw
npx supabase secrets set STRIPE_WEBHOOK_SECRET_CONNECTED="whsec_live_connected..." --project-ref anlivujgkjmajkcgbaxw
```
- The webhook handler will verify using both secrets automatically.

## 4) Verify Live Checkout
- Pricing page subscription upgrades should redirect to Stripe Checkout without errors.
- Ticket purchases should create sessions and return to EventNexus with `session_id` in URL.
- Webhook should mark tickets as paid and update subscription tiers.

## Notes
- Client no longer hardcodes price IDs; tiers are resolved server-side via `STRIPE_PRICE_*` secrets.
- Keep all secrets in Supabase; do not commit keys to Git.
- If you see "Stripe public key not configured", update `system_config` with `pk_live_...`.
