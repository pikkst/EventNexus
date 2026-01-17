#!/bin/bash

# Test Google Analytics Data API directly
# This tests if Service Account has proper access to GA4

echo "════════════════════════════════════════════════════════════════════════"
echo "         Testing Google Analytics Data API Access"
echo "════════════════════════════════════════════════════════════════════════"
echo ""

# Check environment
PROPERTY_ID="517523733"

echo "Property ID: $PROPERTY_ID"
echo ""

# Get secrets from Supabase
echo "📥 Fetching Service Account credentials from Supabase..."
SA_EMAIL=$(npx supabase secrets list | grep GA_SERVICE_ACCOUNT_EMAIL | awk '{print $3}')
echo "Service Account: $SA_EMAIL"
echo ""

if [ -z "$SA_EMAIL" ]; then
  echo "❌ GA_SERVICE_ACCOUNT_EMAIL not found in Supabase secrets"
  exit 1
fi

# Test with a simple API call using Supabase Edge Function
echo "🔧 Testing via analytics-bridge Edge Function..."
RESPONSE=$(curl -s -X POST \
  'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/analytics-bridge' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFubGl2dWpna2ptYWprY2diYXh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5OTY0OTQsImV4cCI6MjA4MTU3MjQ5NH0.5SzkZg_PMqgdMClS1ftg4ZT_Ddyq1zOi-ZOLe1yuRgY' \
  -d '{"metricType":"traffic","days":30,"timezone":"Europe/Tallinn"}')

echo "Response: $RESPONSE"
echo ""

if [ "$RESPONSE" = "[]" ]; then
  echo "⚠️  Empty array returned - possible reasons:"
  echo ""
  echo "1. GA4 Property ($PROPERTY_ID) has no data yet"
  echo "   → Visit: https://analytics.google.com/analytics/web/#/p${PROPERTY_ID}/reports/intelligenthome"
  echo "   → Check if any data is visible"
  echo ""
  echo "2. Service Account needs GA4 access"
  echo "   → Visit: https://analytics.google.com/analytics/web/#/a517523733p${PROPERTY_ID}/admin/property-access-management"
  echo "   → Add: $SA_EMAIL with Viewer role"
  echo ""
  echo "3. Google Analytics Data API not enabled"
  echo "   → Visit: https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com?project=gen-lang-client-0442564203"
  echo "   → Click 'Enable'"
  echo ""
  echo "4. Wrong property ID"
  echo "   → Current: $PROPERTY_ID"
  echo "   → Verify in GA4 Admin → Property Settings"
elif echo "$RESPONSE" | grep -q "error"; then
  echo "❌ Error returned:"
  echo "$RESPONSE" | jq .
  echo ""
  echo "Common errors:"
  echo "- 403: Service Account lacks GA4 access"
  echo "- 401: Authentication failed"
  echo "- 400: Invalid property ID or metrics"
else
  echo "✅ SUCCESS! Data received:"
  echo "$RESPONSE" | jq .
fi

echo ""
echo "════════════════════════════════════════════════════════════════════════"
