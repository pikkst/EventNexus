#!/bin/bash
# ============================================
# SET ALL STRIPE SECRETS IN SUPABASE
# ============================================
# This script sets all required Stripe API keys and price IDs
# in Supabase Edge Function secrets
# ============================================

set -e

PROJECT_REF="anlivujgkjmajkcgbaxw"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  STRIPE SECRETS SETUP FOR EVENTNEXUS                           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "⚠️  You need your Stripe API keys from:"
echo "   https://dashboard.stripe.com/test/apikeys"
echo ""
echo "📋 Required keys:"
echo "   1. Secret key (sk_test_...)"
echo "   2. Webhook signing secret (whsec_...)"
echo "   3. Price IDs (already have these)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if user wants to proceed
read -p "Press ENTER to continue, or CTRL+C to cancel..." dummy

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  STRIPE SECRET KEY (sk_test_...)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -sp "Enter your Stripe SECRET key (sk_test_...): " STRIPE_SECRET_KEY
echo ""

if [[ ! "$STRIPE_SECRET_KEY" =~ ^sk_test_ ]]; then
  echo "❌ Error: Secret key must start with 'sk_test_'"
  exit 1
fi

echo "✓ Setting STRIPE_SECRET_KEY..."
npx supabase secrets set STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" --project-ref "$PROJECT_REF"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  STRIPE WEBHOOK SECRET (whsec_...)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Get this from:"
echo "https://dashboard.stripe.com/test/webhooks"
echo "Endpoint: https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/stripe-webhook"
echo ""
read -sp "Enter your Stripe WEBHOOK secret (whsec_...): " STRIPE_WEBHOOK_SECRET
echo ""

if [[ ! "$STRIPE_WEBHOOK_SECRET" =~ ^whsec_ ]]; then
  echo "❌ Error: Webhook secret must start with 'whsec_'"
  exit 1
fi

echo "✓ Setting STRIPE_WEBHOOK_SECRET..."
npx supabase secrets set STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET" --project-ref "$PROJECT_REF"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  STRIPE PRICE IDs (already configured)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# These are already set from previous fix
STRIPE_PRICE_PRO="price_1SgXusJ9WsSrj5gMbJdADsvy"
STRIPE_PRICE_PREMIUM="price_1SgXwZJ9WsSrj5gMehBiDgWp"
STRIPE_PRICE_ENTERPRISE="price_1SgXxRJ9WsSrj5gMLhDEB26O"

echo "✓ Setting STRIPE_PRICE_PRO ($STRIPE_PRICE_PRO)..."
npx supabase secrets set STRIPE_PRICE_PRO="$STRIPE_PRICE_PRO" --project-ref "$PROJECT_REF"

echo "✓ Setting STRIPE_PRICE_PREMIUM ($STRIPE_PRICE_PREMIUM)..."
npx supabase secrets set STRIPE_PRICE_PREMIUM="$STRIPE_PRICE_PREMIUM" --project-ref "$PROJECT_REF"

echo "✓ Setting STRIPE_PRICE_ENTERPRISE ($STRIPE_PRICE_ENTERPRISE)..."
npx supabase secrets set STRIPE_PRICE_ENTERPRISE="$STRIPE_PRICE_ENTERPRISE" --project-ref "$PROJECT_REF"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  REDEPLOY EDGE FUNCTIONS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Redeploying create-checkout..."
npx supabase functions deploy create-checkout --no-verify-jwt --project-ref "$PROJECT_REF"

echo ""
echo "Redeploying stripe-webhook..."
npx supabase functions deploy stripe-webhook --no-verify-jwt --project-ref "$PROJECT_REF"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  ✅ ALL STRIPE SECRETS CONFIGURED!                             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Summary:"
echo "  ✓ STRIPE_SECRET_KEY          (sk_test_...)"
echo "  ✓ STRIPE_WEBHOOK_SECRET      (whsec_...)"
echo "  ✓ STRIPE_PRICE_PRO           ($STRIPE_PRICE_PRO)"
echo "  ✓ STRIPE_PRICE_PREMIUM       ($STRIPE_PRICE_PREMIUM)"
echo "  ✓ STRIPE_PRICE_ENTERPRISE    ($STRIPE_PRICE_ENTERPRISE)"
echo ""
echo "🚀 Edge Functions redeployed:"
echo "  ✓ create-checkout"
echo "  ✓ stripe-webhook"
echo ""
echo "🧪 Test at: https://www.eventnexus.eu/#/pricing"
echo ""
