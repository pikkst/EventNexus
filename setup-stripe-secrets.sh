#!/bin/bash

# ============================================
# Stripe Secrets Setup for Supabase Edge Functions
# ============================================
# This script helps you configure Stripe API keys as secrets
# for your Supabase Edge Functions

echo "🔐 Setting up Stripe secrets for Supabase Edge Functions..."
echo ""
echo "You need to provide the following Stripe API keys:"
echo "1. STRIPE_SECRET_KEY - Your Stripe secret key (starts with sk_test_ or sk_live_)"
echo "2. STRIPE_WEBHOOK_SECRET - Your webhook signing secret (starts with whsec_)"
echo ""
echo "Get these from: https://dashboard.stripe.com/test/apikeys"
echo ""

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install with: npm install -g supabase"
    exit 1
fi

# Prompt for Stripe Secret Key
read -p "Enter your STRIPE_SECRET_KEY (sk_test_...): " STRIPE_SECRET_KEY
if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo "❌ STRIPE_SECRET_KEY is required"
    exit 1
fi

# Prompt for Webhook Secret
read -p "Enter your STRIPE_WEBHOOK_SECRET (whsec_...): " STRIPE_WEBHOOK_SECRET
if [ -z "$STRIPE_WEBHOOK_SECRET" ]; then
    echo "❌ STRIPE_WEBHOOK_SECRET is required"
    exit 1
fi

# Optional: Stripe Price IDs
echo ""
echo "Optional: Configure Stripe Price IDs for subscriptions"
read -p "Enter STRIPE_PRICE_PRO (or press Enter to skip): " STRIPE_PRICE_PRO
read -p "Enter STRIPE_PRICE_PREMIUM (or press Enter to skip): " STRIPE_PRICE_PREMIUM
read -p "Enter STRIPE_PRICE_ENTERPRISE (or press Enter to skip): " STRIPE_PRICE_ENTERPRISE

echo ""
echo "⏳ Setting secrets in Supabase..."

# Set required secrets
npx supabase secrets set STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" --project-ref anlivujgkjmajkcgbaxw
npx supabase secrets set STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET" --project-ref anlivujgkjmajkcgbaxw

# Set optional price IDs if provided
if [ ! -z "$STRIPE_PRICE_PRO" ]; then
    npx supabase secrets set STRIPE_PRICE_PRO="$STRIPE_PRICE_PRO" --project-ref anlivujgkjmajkcgbaxw
fi

if [ ! -z "$STRIPE_PRICE_PREMIUM" ]; then
    npx supabase secrets set STRIPE_PRICE_PREMIUM="$STRIPE_PRICE_PREMIUM" --project-ref anlivujgkjmajkcgbaxw
fi

if [ ! -z "$STRIPE_PRICE_ENTERPRISE" ]; then
    npx supabase secrets set STRIPE_PRICE_ENTERPRISE="$STRIPE_PRICE_ENTERPRISE" --project-ref anlivujgkjmajkcgbaxw
fi

echo ""
echo "✅ Stripe secrets configured successfully!"
echo ""
echo "Next steps:"
echo "1. Redeploy your Edge Functions: cd supabase && ./deploy-functions.sh"
echo "2. Configure Stripe webhook endpoint: https://dashboard.stripe.com/test/webhooks"
echo "   Endpoint URL: https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/stripe-webhook"
echo "   Events to listen: checkout.session.completed, payment_intent.succeeded"
echo ""
