#!/bin/bash

# Setup Cron Schedule for process-event-reports via Supabase API
# This script sets up scheduled execution every hour

PROJECT_ID="anlivujgkjmajkcgbaxw"
FUNCTION_NAME="process-event-reports"
CRON_SCHEDULE="0 * * * *"  # Every hour

# Get the function ID
echo "📋 Fetching function details..."

FUNCTION_ID=$(curl -s \
  https://api.supabase.com/v1/projects/$PROJECT_ID/functions \
  -H "Authorization: Bearer $(cat ~/.supabase/access-token)" \
  | jq -r ".functions[] | select(.name == \"$FUNCTION_NAME\") | .id" 2>/dev/null)

if [ -z "$FUNCTION_ID" ]; then
  echo "❌ Error: Could not find function ID for $FUNCTION_NAME"
  exit 1
fi

echo "✅ Found function ID: $FUNCTION_ID"

# Unfortunately, Supabase doesn't expose cron configuration via public API
# The schedule must be set via:
# 1. Supabase Dashboard: https://supabase.com/dashboard/project/$PROJECT_ID/functions/$FUNCTION_NAME
# 2. Click the function and look for Schedule/Cron option
# 3. Or contact Supabase support for API-based scheduling

echo ""
echo "⚠️  Cron scheduling requires manual setup in Supabase Dashboard:"
echo ""
echo "1. Go to: https://supabase.com/dashboard/project/$PROJECT_ID/functions"
echo "2. Click on: process-event-reports"
echo "3. Look for 'Schedule' or 'Cron' button"
echo "4. Enter schedule: $CRON_SCHEDULE"
echo "5. Save"
echo ""
echo "Schedule format: 0 * * * * (Every hour)"
echo ""
echo "Alternative: Use Cron Jobs from external service like:"
echo "- EasyCron (https://www.easycron.com/)"
echo "- Setcronjob (https://setcronj.com/)"
echo ""
echo "Cron URL: https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/process-event-reports"
