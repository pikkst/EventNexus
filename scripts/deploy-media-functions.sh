#!/bin/bash
# Deploy Enterprise Media Upload Edge Functions to Supabase
# Run this script from the project root directory

set -e

echo "🚀 Deploying Enterprise Media Upload Edge Functions..."
echo ""

# Check if logged in
echo "📋 Checking Supabase login status..."
if ! npx supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run:"
    echo "   npx supabase login"
    exit 1
fi

echo "✅ Supabase CLI ready"
echo ""

# Deploy upload-media function
echo "📤 Deploying upload-media function..."
npx supabase functions deploy upload-media \
  --project-ref anlivujgkjmajkcgbaxw \
  --no-verify-jwt

if [ $? -eq 0 ]; then
    echo "✅ upload-media function deployed successfully"
else
    echo "❌ Failed to deploy upload-media function"
    exit 1
fi

echo ""

# Deploy upload-media-batch function
echo "📤 Deploying upload-media-batch function..."
npx supabase functions deploy upload-media-batch \
  --project-ref anlivujgkjmajkcgbaxw \
  --no-verify-jwt

if [ $? -eq 0 ]; then
    echo "✅ upload-media-batch function deployed successfully"
else
    echo "❌ Failed to deploy upload-media-batch function"
    exit 1
fi

echo ""
echo "🎉 All Edge Functions deployed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Run the SQL migration in Supabase SQL Editor:"
echo "   supabase/migrations/20241227_enterprise_media_storage.sql"
echo ""
echo "2. Test the functions:"
echo "   - Single upload: POST to /functions/v1/upload-media"
echo "   - Batch upload: POST to /functions/v1/upload-media-batch"
echo ""
echo "3. Configure CORS if needed in Supabase Dashboard"
echo ""
echo "✨ Deployment complete!"
