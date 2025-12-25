# Stripe Secret Key Missing - Quick Fix

Error: "This API call cannot be made with a publishable API key. Please use a secret API key."

Root cause: the `create-checkout` Edge Function does not have `STRIPE_SECRET_KEY` (and often `STRIPE_WEBHOOK_SECRET`) set in Supabase Functions.

## Option 1: Interactive Script (recommended)
Run the helper script and follow the prompts:

```
bash setup_stripe_secrets.sh
```

It will collect the Stripe secret key, webhook secret, and redeploy the functions automatically.

## Option 2: Manual Commands
1. Get the Stripe secret key from https://dashboard.stripe.com/test/apikeys (starts with `sk_test_`).
2. Get the webhook signing secret from https://dashboard.stripe.com/test/webhooks (endpoint for `stripe-webhook`).
3. Set the secrets:

```
npx supabase secrets set STRIPE_SECRET_KEY="sk_test_YOUR_KEY_HERE" --project-ref anlivujgkjmajkcgbaxw
npx supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_YOUR_SECRET_HERE" --project-ref anlivujgkjmajkcgbaxw
```

4. Redeploy the functions:

```
npx supabase functions deploy create-checkout --no-verify-jwt --project-ref anlivujgkjmajkcgbaxw
npx supabase functions deploy stripe-webhook --no-verify-jwt --project-ref anlivujgkjmajkcgbaxw
```

## Verification

```
npx supabase secrets list --project-ref anlivujgkjmajkcgbaxw
```

Expect to see `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_PREMIUM`, and `STRIPE_PRICE_ENTERPRISE` set.

## Testing
1. Open https://www.eventnexus.eu/#/pricing.
2. Click an upgrade button.
3. Confirm you are redirected to Stripe Checkout without the publishable-key error.

## What Was Fixed Already
- RLS for `stripe_public_key` was corrected with [sql/stripe/FIX_STRIPE_PUBLIC_KEY_RLS.sql](../../sql/stripe/FIX_STRIPE_PUBLIC_KEY_RLS.sql).
- Users can read the public key; this guide covers the missing secret key.

## Useful Links
- API keys: https://dashboard.stripe.com/test/apikeys
- Webhooks: https://dashboard.stripe.com/test/webhooks
- Products and prices: https://dashboard.stripe.com/test/products
