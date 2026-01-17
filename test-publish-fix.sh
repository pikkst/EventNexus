#!/bin/bash
# Test script for AI Pipeline publish-event fix
# Usage: ./test-ai-pipeline.sh <city_id> <city_name> <country>

set -e

if [ $# -lt 3 ]; then
  echo "Usage: ./test-ai-pipeline.sh <city_id> <city_name> <country>"
  echo "Example: ./test-ai-pipeline.sh 89b570ca-d156-47ab-9a8f-ac0b646be717 Tornio Finland"
  exit 1
fi

CITY_ID=$1
CITY_NAME=$2
COUNTRY=$3

# Load environment
if [ ! -f .env.local ]; then
  echo "❌ .env.local not found"
  exit 1
fi

# Parse .env.local
SUPABASE_URL=$(grep '^VITE_SUPABASE_URL=' .env.local | cut -d'=' -f2 | tr -d '"')
SUPABASE_KEY=$(grep '^VITE_SUPABASE_ANON_KEY=' .env.local | cut -d'=' -f2 | tr -d '"')

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
  echo "❌ Missing Supabase environment variables"
  exit 1
fi

echo "🔍 Testing EventScout AI Pipeline for $CITY_NAME, $COUNTRY"
echo "📍 City ID: $CITY_ID"
echo ""

# Step 1: Call discover-events-ai
echo "🚀 Step 1: Running EventScout AI discovery..."
DISCOVER_RESPONSE=$(curl -s -X POST "$SUPABASE_URL/functions/v1/discover-events-ai" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"city_id\": \"$CITY_ID\",
    \"city_name\": \"$CITY_NAME\",
    \"country\": \"$COUNTRY\",
    \"target_events\": 5
  }")

echo "$DISCOVER_RESPONSE" | jq '.' 2>/dev/null || echo "$DISCOVER_RESPONSE"
echo ""

# Extract results
EVENTS_FOUND=$(echo "$DISCOVER_RESPONSE" | jq -r '.results.events_found // 0' 2>/dev/null || echo "0")
EVENTS_INSERTED=$(echo "$DISCOVER_RESPONSE" | jq -r '.results.events_inserted // 0' 2>/dev/null || echo "0")
EVENTS_PUBLISHED=$(echo "$DISCOVER_RESPONSE" | jq -r '.results.events_published // 0' 2>/dev/null || echo "0")
PUBLISH_ERROR=$(echo "$DISCOVER_RESPONSE" | jq -r '.results.publish_error // ""' 2>/dev/null)

echo "📊 Results:"
echo "  ✓ Found: $EVENTS_FOUND events"
echo "  ✓ Inserted: $EVENTS_INSERTED events"
echo "  ✓ Published: $EVENTS_PUBLISHED events"

if [ -n "$PUBLISH_ERROR" ] && [ "$PUBLISH_ERROR" != "null" ] && [ "$PUBLISH_ERROR" != "" ]; then
  echo "  ❌ Publish error: $PUBLISH_ERROR"
else
  echo "  ✅ No publish errors"
fi

# Step 2: Check database
echo ""
echo "📊 Step 2: Checking database..."
echo "SELECT COUNT(*) as parsed_count FROM parsed_events WHERE city_id = '$CITY_ID';" | \
  PGPASSWORD="$SUPABASE_KEY" psql -h "$(echo $SUPABASE_URL | cut -d/ -f3).supabase.co" -U postgres -d postgres 2>/dev/null || echo "(Database check skipped)"

echo ""
echo "✅ Test complete!"
echo ""
echo "If events are still not publishing:"
echo "1. Check Supabase Edge Function logs"
echo "2. Verify city_id exists in city_configs table"
echo "3. Check parsed_events table for unprocessed events"
