#!/bin/bash

# EventNexus - Deploy Social Features Edge Functions
# This script deploys the three new social feature Edge Functions

set -e  # Exit on error

echo "🚀 EventNexus Social Features Edge Functions Deployment"
echo "========================================================"

# Set project reference
PROJECT_REF="anlivujgkjmajkcgbaxw"

echo ""
echo "📦 Deploying Edge Functions to project: $PROJECT_REF"
echo ""

# Check if logged in
echo "📝 Checking Supabase authentication..."
if ! npx supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase."
    echo "Please run: npx supabase login"
    exit 1
fi

echo "✅ Authenticated"
echo ""

# Deploy each function
echo "1️⃣ Deploying buddy-matching (AI friend matching algorithm)..."
npx supabase functions deploy buddy-matching --project-ref $PROJECT_REF
if [ $? -eq 0 ]; then
    echo "✅ buddy-matching deployed successfully"
else
    echo "❌ buddy-matching deployment failed"
    exit 1
fi

echo ""
echo "2️⃣ Deploying send-friend-request-notification..."
npx supabase functions deploy send-friend-request-notification --project-ref $PROJECT_REF
if [ $? -eq 0 ]; then
    echo "✅ send-friend-request-notification deployed successfully"
else
    echo "❌ send-friend-request-notification deployment failed"
    exit 1
fi

echo ""
echo "3️⃣ Deploying send-review-notification..."
npx supabase functions deploy send-review-notification --project-ref $PROJECT_REF
if [ $? -eq 0 ]; then
    echo "✅ send-review-notification deployed successfully"
else
    echo "❌ send-review-notification deployment failed"
    exit 1
fi

echo ""
echo "================================================"
echo "✅ All Social Feature Edge Functions Deployed!"
echo "================================================"
echo ""
echo "📝 Next Steps:"
echo "1. Set environment variables in Supabase Dashboard:"
echo "   - SUPABASE_URL=https://anlivujgkjmajkcgbaxw.supabase.co"
echo "   - SUPABASE_SERVICE_ROLE_KEY=<your-key>"
echo "   - RESEND_API_KEY=<your-key>"
echo ""
echo "2. Apply database triggers migration:"
echo "   Run: supabase/migrations/20260117000003_social_notification_triggers.sql"
echo ""
echo "3. Test functions:"
echo "   - buddy-matching: curl -X POST ... (see docs/SOCIAL_FEATURES_EDGE_FUNCTIONS.md)"
echo ""
echo "📚 Documentation: docs/SOCIAL_FEATURES_EDGE_FUNCTIONS.md"
