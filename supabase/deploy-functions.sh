#!/bin/bash

# EventNexus - Supabase Edge Functions Deployment Script
# This script deploys all Edge Functions to your Supabase project
# Uses npx to run Supabase CLI without global installation

set -e  # Exit on error

echo "🚀 EventNexus Edge Functions Deployment"
echo "========================================"

# Check if logged in
echo "📝 Checking Supabase authentication..."
if ! npx supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase."
    echo "Please run: npx supabase login"
    exit 1
fi

echo "✅ Authenticated"

# Set project reference (update with your project ID)
PROJECT_REF="anlivujgkjmajkcgbaxw"

echo ""
echo "📦 Deploying Edge Functions to project: $PROJECT_REF"
echo ""

# Deploy each function
echo "1️⃣ Deploying proximity-radar..."
npx supabase functions deploy proximity-radar --project-ref $PROJECT_REF

echo ""
echo "2️⃣ Deploying platform-stats..."
npx supabase functions deploy platform-stats --project-ref $PROJECT_REF

echo ""
echo "3️⃣ Deploying infrastructure-stats..."
npx supabase functions deploy infrastructure-stats --project-ref $PROJECT_REF

echo ""
echo "4️⃣ Deploying diagnostic-scan..."
npx supabase functions deploy diagnostic-scan --project-ref $PROJECT_REF

echo ""
echo "5️⃣ Deploying validate-ticket..."
npx supabase functions deploy validate-ticket --project-ref $PROJECT_REF

echo ""
echo "✅ All Edge Functions deployed successfully!"
echo ""
echo "🔗 Function URLs:"
echo "   proximity-radar: https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/proximity-radar"
echo "   platform-stats: https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/platform-stats"
echo "   infrastructure-stats: https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/infrastructure-stats"
echo "   diagnostic-scan: https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/diagnostic-scan"
echo "   validate-ticket: https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/validate-ticket"
echo ""
echo "📚 Next steps:"
echo "   1. Apply SQL migrations in Supabase SQL Editor"
echo "   2. Test each function using the provided URLs"
echo "   3. Update your .env.local with function URLs if needed"
echo ""
