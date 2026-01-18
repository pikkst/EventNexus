#!/bin/bash

# Deploy B2B Outreach Tracking System
# This script deploys the webhook Edge Function and applies database schema updates

set -e  # Exit on error

echo "🚀 Deploying B2B Outreach Email Tracking System..."
echo ""

# Check if we're in the correct directory
if [ ! -f "supabase/functions/resend-webhook/index.ts" ]; then
    echo "❌ Error: Run this script from the EventNexus project root"
    exit 1
fi

# Step 1: Apply database schema updates
echo "📊 Step 1: Applying database schema updates..."
supabase db push

if [ $? -ne 0 ]; then
    echo "❌ Database migration failed!"
    exit 1
fi
echo "✅ Database schema updated successfully"
echo ""

# Step 2: Deploy webhook Edge Function
echo "🔧 Step 2: Deploying resend-webhook Edge Function..."
supabase functions deploy resend-webhook

if [ $? -ne 0 ]; then
    echo "❌ Edge Function deployment failed!"
    exit 1
fi
echo "✅ Edge Function deployed successfully"
echo ""

# Step 3: Display webhook URL
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 Webhook URL:"
echo "   https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/resend-webhook"
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Configure Resend Webhook:"
echo "   → Visit: https://resend.com/settings/webhooks"
echo "   → Click 'Add Webhook'"
echo "   → Endpoint URL: https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/resend-webhook"
echo "   → Select events:"
echo "     ✅ email.sent"
echo "     ✅ email.delivered"
echo "     ✅ email.opened"
echo "     ✅ email.clicked"
echo "     ✅ email.bounced"
echo "     ✅ email.complained"
echo ""
echo "2. Test the webhook:"
echo "   → Send a test email from Admin Dashboard → B2B Outreach"
echo "   → Open the email in your inbox"
echo "   → Check 'Email Campaigns' tab for status update"
echo ""
echo "3. Monitor webhook logs:"
echo "   → Run: supabase functions logs resend-webhook --follow"
echo ""
echo "📚 Full documentation:"
echo "   docs/B2B_OUTREACH_TRACKING_SETUP.md"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
