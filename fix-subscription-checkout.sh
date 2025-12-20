#!/bin/bash
# Fix subscription checkout by setting Stripe price IDs
# Run this to configure Stripe price IDs for subscription checkout

set -e

echo "🔧 Setting Stripe Price IDs as Supabase Edge Function secrets..."
echo ""

# Pro tier price ID
echo "Setting STRIPE_PRICE_PRO..."
npx supabase secrets set STRIPE_PRICE_PRO="price_1SgXusJ9WsSrj5gMbJdADsvy" --project-ref anlivujgkjmajkcgbaxw

# Premium tier price ID
echo "Setting STRIPE_PRICE_PREMIUM..."
npx supabase secrets set STRIPE_PRICE_PREMIUM="price_1SgXwZJ9WsSrj5gMehBiDgWp" --project-ref anlivujgkjmajkcgbaxw

# Enterprise tier price ID
echo "Setting STRIPE_PRICE_ENTERPRISE..."
npx supabase secrets set STRIPE_PRICE_ENTERPRISE="price_1SgXxRJ9WsSrj5gMLhDEB26O" --project-ref anlivujgkjmajkcgbaxw

echo ""
echo "✅ Price IDs configured!"
echo ""
echo "🚀 Redeploying create-checkout Edge Function..."
npx supabase functions deploy create-checkout --no-verify-jwt --project-ref anlivujgkjmajkcgbaxw

echo ""
echo "✅ Done! Users can now purchase subscriptions."
echo ""
echo "🧪 Test at: https://www.eventnexus.eu/#/pricing"
