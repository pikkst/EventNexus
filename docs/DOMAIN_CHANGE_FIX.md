# Fix Domain Change for Stripe

## Problem
After domain change from `pikkst.github.io/EventNexus` to `eventnexus.eu`, Stripe Connect and other features may fail due to outdated redirect URLs.

## Solution: Update Environment Variables

### 1. Update Supabase Edge Function Secrets

Run these commands to update the platform URL:

```bash
# Update PLATFORM_URL to new domain
npx supabase secrets set PLATFORM_URL="https://eventnexus.eu" --project-ref anlivujgkjmajkcgbaxw

# Redeploy affected functions
npx supabase functions deploy create-connect-account --no-verify-jwt --project-ref anlivujgkjmajkcgbaxw
```

### 2. Check Stripe Dashboard Settings

#### A. Stripe Connect Settings
1. Go to [Stripe Connect Settings](https://dashboard.stripe.com/settings/connect)
2. Under **Redirects**, verify these URLs:
   - Refresh URL: `https://eventnexus.eu/#/dashboard?connect=refresh`
   - Return URL: `https://eventnexus.eu/#/dashboard?connect=success`

#### B. Webhook Endpoint (should already be correct)
1. Go to [Webhooks](https://dashboard.stripe.com/webhooks)
2. Verify endpoint: `https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/stripe-webhook`
3. This uses Supabase URL, not your domain, so it should still work ✅

### 3. Verify Checkout Sessions

Subscription checkout dynamically uses `window.location.origin`, so it should automatically work with the new domain. No changes needed ✅

## What Works Already

✅ **Subscription payments** - Uses dynamic URLs from frontend
✅ **Webhooks** - Uses Supabase URL (domain-independent)
✅ **Ticket purchases** - Uses dynamic URLs from frontend

## What Needs Fixing

❌ **Stripe Connect** - Uses hardcoded `PLATFORM_URL` environment variable
❌ **Stripe Connect Dashboard** - May have old redirect URLs configured

## Quick Test

After updating `PLATFORM_URL`:

1. Log in to https://eventnexus.eu
2. Go to Dashboard
3. Click "Connect Bank Account"
4. Should redirect to Stripe onboarding
5. After completing onboarding, should return to https://eventnexus.eu/#/dashboard

## Current Environment Variables to Set

```bash
# Required secrets in Supabase
PLATFORM_URL=https://eventnexus.eu
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_URL=https://anlivujgkjmajkcgbaxw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Run this to set them all at once:

```bash
npx supabase secrets set \
  PLATFORM_URL="https://eventnexus.eu" \
  --project-ref anlivujgkjmajkcgbaxw
```

## Enable Stripe Connect

Additionally, you need to enable Stripe Connect in your Stripe account:

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Settings → Connect → Enable Connect
3. Complete the onboarding questionnaire
4. Select "Express" account type

See [STRIPE_CONNECT_FIX.md](./STRIPE_CONNECT_FIX.md) for detailed instructions.
