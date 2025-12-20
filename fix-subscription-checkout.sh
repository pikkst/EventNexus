#!/bin/bash
# Fix subscription checkout by setting Stripe price IDs
# Run this to configure Stripe price IDs for subscription checkout

set -e

echo "🔧 Setting Stripe Price IDs as Supabase Edge Function secrets..."
echo ""

# Pro tier price ID
echo "Setting STRIPE_PRICE_PRO..."
npx supabase secrets set STRIPE_PRICE_PRO="price_1Sg328J9WsSrj5gMhitFUhiC" --project-ref anlivujgkjmajkcgbaxw

# Premium tier price ID
echo "Setting STRIPE_PRICE_PREMIUM..."
npx supabase secrets set STRIPE_PRICE_PREMIUM="price_1Sg37QJ9WsSrj5gMkhkHUFf2" --project-ref anlivujgkjmajkcgbaxw

# Enterprise tier price ID
echo "Setting STRIPE_PRICE_ENTERPRISE..."
npx supabase secrets set STRIPE_PRICE_ENTERPRISE="price_1Sg3AoJ9WsSrj5gMUue2YjTZ" --project-ref anlivujgkjmajkcgbaxw

echo ""
echo "✅ Price IDs configured!"
echo ""
echo "🚀 Redeploying create-checkout Edge Function..."
npx supabase functions deploy create-checkout --no-verify-jwt --project-ref anlivujgkjmajkcgbaxw

echo ""
echo "✅ Done! Users can now purchase subscriptions."
echo ""
echo "🧪 Test at: https://www.eventnexus.eu/#/pricing"
