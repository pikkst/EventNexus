#!/bin/bash

# Deploy Stripe Connect Edge Functions to Supabase
# Run this after making changes to verify-connect-onboarding or create-connect-account

echo "🚀 Deploying Stripe Connect Edge Functions..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Deploy verify-connect-onboarding
echo ""
echo "📦 Deploying verify-connect-onboarding..."
supabase functions deploy verify-connect-onboarding --project-ref anlivujgkjmajkcgbaxw

if [ $? -eq 0 ]; then
    echo "✅ verify-connect-onboarding deployed successfully"
else
    echo "❌ Failed to deploy verify-connect-onboarding"
    exit 1
fi

# Deploy create-connect-account
echo ""
echo "📦 Deploying create-connect-account..."
supabase functions deploy create-connect-account --project-ref anlivujgkjmajkcgbaxw

if [ $? -eq 0 ]; then
    echo "✅ create-connect-account deployed successfully"
else
    echo "❌ Failed to deploy create-connect-account"
    exit 1
fi

echo ""
echo "🎉 All Stripe Connect functions deployed!"
echo ""
echo "📝 Next steps:"
echo "   1. Test the flow: Go to /profile → Set Up Payouts"
echo "   2. Check logs: Supabase Dashboard → Edge Functions → Logs"
echo "   3. Look for emoji indicators: 🔄 ✅ ❌"
echo ""
