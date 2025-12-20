#!/bin/bash
# Stripe Connect Integration Deployment Script

echo "🚀 Deploying Stripe Connect Integration..."
echo ""

# Check if we're in the right directory
if [ ! -d "supabase/functions" ]; then
    echo "❌ Error: Must run from project root (EventNexus/)"
    exit 1
fi

echo "📦 Deploying Edge Functions..."
echo ""

# Deploy get-connect-dashboard-link function
echo "→ Deploying get-connect-dashboard-link..."
npx supabase functions deploy get-connect-dashboard-link --no-verify-jwt

if [ $? -eq 0 ]; then
    echo "✅ get-connect-dashboard-link deployed"
else
    echo "❌ Failed to deploy get-connect-dashboard-link"
    exit 1
fi

echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "Next steps:"
echo "1. Verify environment variables in Supabase Dashboard:"
echo "   - STRIPE_SECRET_KEY (must be from Connect-enabled account)"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "   - PLATFORM_URL"
echo ""
echo "2. Test the integration:"
echo "   - Visit https://eventnexus.eu/#/dashboard"
echo "   - Go to Payouts tab"
echo "   - Click 'Start Setup' to test onboarding"
echo ""
echo "3. Check function logs:"
echo "   npx supabase functions logs get-connect-dashboard-link"
echo ""
