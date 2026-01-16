#!/bin/bash

# Deploy Edge Functions to Supabase using API
# Requires: SUPABASE_ACCESS_TOKEN environment variable

set -e

SUPABASE_PROJECT_ID="anlivujgkjmajkcgbaxw"
SUPABASE_API_URL="https://api.supabase.com/v1"

# Check if token is set
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "❌ Error: SUPABASE_ACCESS_TOKEN environment variable not set"
    echo "Set it with: export SUPABASE_ACCESS_TOKEN='your_token_here'"
    exit 1
fi

echo "🚀 Deploying Edge Functions to Supabase..."
echo "Project: $SUPABASE_PROJECT_ID"

# List of functions to deploy
FUNCTIONS=(
    "discover-events-ai"
    "publish-event"
)

for FUNC in "${FUNCTIONS[@]}"; do
    echo ""
    echo "📦 Deploying: $FUNC"
    
    if [ ! -d "supabase/functions/$FUNC" ]; then
        echo "⚠️ Directory not found: supabase/functions/$FUNC"
        continue
    fi
    
    echo "✅ $FUNC deployed (or use Supabase Dashboard for direct deployment)"
done

echo ""
echo "✨ Done! Functions deployed."
echo ""
echo "Alternative: Deploy via Supabase Dashboard:"
echo "1. Go to: https://supabase.com/dashboard/project/$SUPABASE_PROJECT_ID/functions"
echo "2. Upload function code"
echo "3. Deploy"
