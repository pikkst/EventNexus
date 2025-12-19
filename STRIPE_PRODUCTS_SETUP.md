# Stripe Products Setup Guide

## Create Subscription Products in Stripe

You need to create 3 recurring subscription products in your Stripe Dashboard.

### Step 1: Access Stripe Dashboard

1. Go to https://dashboard.stripe.com/test/products
2. Make sure you're in **Test mode** (toggle in top-right)

### Step 2: Create Products

Create these 3 products with recurring prices:

#### Product 1: Pro
- **Name:** EventNexus Pro
- **Description:** Professional event management for creators and promoters
- **Pricing:**
  - Type: Recurring
  - Price: €19.99
  - Billing period: Monthly
  - Currency: EUR
- After creating, **copy the Price ID** (starts with `price_...`)

#### Product 2: Premium
- **Name:** EventNexus Premium
- **Description:** Ultimate power for professional agencies
- **Pricing:**
  - Type: Recurring
  - Price: €49.99
  - Billing period: Monthly
  - Currency: EUR
- After creating, **copy the Price ID** (starts with `price_...`)

#### Product 3: Enterprise
- **Name:** EventNexus Enterprise
- **Description:** White-labeling & Global Infrastructure
- **Pricing:**
  - Type: Recurring
  - Price: €149.99
  - Billing period: Monthly
  - Currency: EUR
- After creating, **copy the Price ID** (starts with `price_...`)

### Step 3: Configure Price IDs

Once you have all 3 Price IDs, run these commands:

```bash
cd /workspaces/EventNexus

# Set Pro price ID
npx supabase secrets set STRIPE_PRICE_PRO="price_YOUR_PRO_PRICE_ID" --project-ref anlivujgkjmajkcgbaxw

# Set Premium price ID
npx supabase secrets set STRIPE_PRICE_PREMIUM="price_YOUR_PREMIUM_PRICE_ID" --project-ref anlivujgkjmajkcgbaxw

# Set Enterprise price ID
npx supabase secrets set STRIPE_PRICE_ENTERPRISE="price_YOUR_ENTERPRISE_PRICE_ID" --project-ref anlivujgkjmajkcgbaxw
```

### Step 4: Redeploy Edge Function

After setting the price IDs, redeploy the checkout function:

```bash
npx supabase functions deploy create-checkout --no-verify-jwt --project-ref anlivujgkjmajkcgbaxw
```

### Step 5: Test

Go back to the pricing page and try upgrading to a subscription tier. It should now redirect you to Stripe's checkout page.

---

## Quick Reference

Your current Stripe configuration:
- **Secret Key:** ✅ Configured
- **Price IDs:** ❌ Need to be configured
- **Webhook:** ⏳ To be configured after testing

### Stripe Dashboard Links
- Products: https://dashboard.stripe.com/test/products
- API Keys: https://dashboard.stripe.com/test/apikeys
- Webhooks: https://dashboard.stripe.com/test/webhooks
- Logs: https://dashboard.stripe.com/test/logs
