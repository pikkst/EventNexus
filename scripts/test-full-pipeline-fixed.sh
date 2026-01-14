#!/bin/bash
# Test the full EventScout AI pipeline with fixes
# Address caching + auto-publishing

echo "🚀 Testing Full Pipeline with Fixes"
echo "===================================="
echo ""

# Get Põltsamaa city_id
CITY_ID="3251de4e-c68b-4bba-bddb-700d03dd47a8"
CITY_NAME="Põltsamaa"

echo "📍 Target City: $CITY_NAME (ID: $CITY_ID)"
echo ""

# Call ensure-free-events which triggers discover-events-ai
echo "⏳ Step 1: Calling ensure-free-events..."
RESPONSE=$(curl -s -X POST \
  "https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/ensure-free-events" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFubGl2dWpna2ptYWprY2diYXh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5OTY0OTQsImV4cCI6MjA4MTU3MjQ5NH0.5SzkZg_PMqgdMClS1ftg4ZT_Ddyq1zOi-ZOLe1yuRgY" \
  -H "Content-Type: application/json" \
  -d "{\"city_id\": \"$CITY_ID\", \"target_free_events\": 5}")

echo "$RESPONSE" | jq '.'

echo ""
echo "⏳ Waiting 90 seconds for pipeline to complete..."
sleep 90

echo ""
echo "📊 Checking Results..."
echo ""

# Check discover-events-ai logs
echo "🔍 Step 2: Checking discover-events-ai logs..."
curl -s "https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/discover-events-ai" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZXYuanciLCJyb2xlIjoiYW5vbiIsImV4cCI6MTk4MzgxMjk5Nn0.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" 2>&1 | grep -E "(Discovered|Inserted|Published)" | head -10

echo ""
echo "🔍 Step 3: Checking publish-event logs..."
curl -s "https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/publish-event" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZXYuanciLCJyb2xlIjoiYW5vbiIsImV4cCI6MTk4MzgxMjk5Nn0.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" 2>&1 | grep -E "(Geocoded|Published|Cache hit)" | head -20

echo ""
echo "✅ Pipeline Test Complete!"
echo ""
echo "📊 Check the map at: https://www.eventnexus.eu"
echo "📊 Check database: events table should have 8 entries"
