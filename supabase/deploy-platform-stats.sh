#!/bin/bash

# Deploy platform-stats Edge Function
# This function provides public platform statistics to all authenticated users

echo "🚀 Deploying platform-stats Edge Function..."

cd /workspaces/EventNexus

npx supabase functions deploy platform-stats \
  --project-ref anlivujgkjmajkcgbaxw \
  --no-verify-jwt

echo "✅ Deployment complete!"
echo ""
echo "Test with:"
echo "curl -X POST 'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/platform-stats' \\"
echo "  -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "  -H 'Content-Type: application/json'"
