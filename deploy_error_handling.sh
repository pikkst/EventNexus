#!/bin/bash

# Deploy Error Handling & Analytics SQL to Supabase
# This adds comprehensive error handling, fallback mechanisms,
# campaign tracking, and ROI analytics

echo "🚀 Deploying Error Handling & Analytics SQL to Supabase..."
echo ""

# SQL file
SQL_FILE="/workspaces/EventNexus/sql/autonomous_operations_error_handling.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "❌ Error: SQL file not found: $SQL_FILE"
  exit 1
fi

echo "📝 SQL file found: $SQL_FILE"
echo ""
echo "🔧 Please deploy manually in Supabase SQL Editor:"
echo ""
echo "1. Go to: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/sql/new"
echo "2. Copy content from: sql/autonomous_operations_error_handling.sql"
echo "3. Click 'Run'"
echo ""
echo "📊 This will create:"
echo "   ✓ autonomous_operation_errors table"
echo "   ✓ campaign_performance_metrics table"
echo "   ✓ social_media_post_tracking table"
echo "   ✓ log_autonomous_error() function"
echo "   ✓ record_campaign_performance() function"
echo "   ✓ track_social_media_post() function"
echo "   ✓ update_post_status() function"
echo "   ✓ get_campaign_analytics() function"
echo "   ✓ get_top_performing_campaigns() function"
echo ""
echo "🧪 After deployment, test with:"
echo "   1. Check tables exist in Supabase"
echo "   2. Test error logging from Admin Dashboard"
echo "   3. Create a campaign and monitor its performance"
echo ""
echo "📄 Documentation: ERROR_HANDLING_ANALYTICS_IMPLEMENTATION.md"
