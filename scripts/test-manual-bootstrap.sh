#!/bin/bash
# Quick manual bootstrap test for one city

# Get first pending city
CITY_NAME="Paris"
COUNTRY="France"

echo "🚀 Testing manual bootstrap for: $CITY_NAME, $COUNTRY"

# Call bootstrap-city Edge Function
curl -X POST \
  "$VITE_SUPABASE_URL/functions/v1/bootstrap-city" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"city_name\": \"$CITY_NAME\",
    \"country\": \"$COUNTRY\",
    \"auto_discover\": true,
    \"seed_events\": true
  }"

echo ""
echo "✅ Check Supabase logs for results"
