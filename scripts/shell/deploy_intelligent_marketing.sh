#!/bin/bash

# Deploy Intelligent Autonomous Marketing Edge Function
# Uses npx supabase CLI to deploy the function

echo "🚀 Deploying Intelligent Autonomous Marketing Edge Function..."
echo ""

# Check if we're in the right directory
if [ ! -d "supabase/functions/intelligent-autonomous-marketing" ]; then
  echo "❌ Error: supabase/functions/intelligent-autonomous-marketing directory not found"
  echo "Make sure you're in the EventNexus root directory"
  exit 1
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "⚠️  Warning: .env.local not found"
  echo "Make sure your Supabase credentials are configured"
fi

# Deploy the Edge Function
echo "📦 Deploying function to Supabase..."
npx supabase functions deploy intelligent-autonomous-marketing \
  --project-ref anlivujgkjmajkcgbaxw

# Check if deployment was successful
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Edge Function deployed successfully!"
  echo ""
  echo "📝 Next steps:"
  echo "1. Test the function:"
  echo "   npx supabase functions invoke intelligent-autonomous-marketing --project-ref anlivujgkjmajkcgbaxw"
  echo ""
  echo "2. View logs:"
  echo "   npx supabase functions logs intelligent-autonomous-marketing --project-ref anlivujgkjmajkcgbaxw"
  echo ""
  echo "3. Set up cron job in Supabase Dashboard:"
  echo "   - Go to Edge Functions → Cron Jobs"
  echo "   - Schedule: 0 9 * * * (daily at 9 AM)"
  echo "   - Function: intelligent-autonomous-marketing"
  echo ""
else
  echo ""
  echo "❌ Deployment failed!"
  echo "Check the error message above and try again"
  exit 1
fi
