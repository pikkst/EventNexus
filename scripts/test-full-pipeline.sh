#!/bin/bash
set -e

API_BASE="https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1"
AUTH_HEADER="Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFubGl2dWpna2ptYWprY2diYXh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5OTY0OTQsImV4cCI6MjA4MTU3MjQ5NH0.5SzkZg_PMqgdMClS1ftg4ZT_Ddyq1zOi-ZOLe1yuRgY"

echo "======================================"
echo "🚀 TESTING AI AGENT PIPELINE"
echo "======================================"

echo ""
echo "Step 1: Bootstrap Tallinn with AI discovery"
echo "--------------------------------------"
BOOTSTRAP_RESULT=$(curl -s -X POST "$API_BASE/bootstrap-city" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "city_name": "Tallinn",
    "country": "Estonia",
    "languages": ["et", "en"],
    "auto_discover": true,
    "seed_events": true
  }')

echo "$BOOTSTRAP_RESULT" | python3 -m json.tool
CITY_ID=$(echo "$BOOTSTRAP_RESULT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('city_id', ''))" 2>/dev/null || echo "")

if [ -z "$CITY_ID" ]; then
  echo "❌ Failed to get city_id, trying to continue..."
  sleep 5
fi

echo ""
echo "Waiting 10s for AI discovery to complete..."
sleep 10

echo ""
echo "Step 2: Manually fetch sources"
echo "--------------------------------------"
FETCH_RESULT=$(curl -s -X POST "$API_BASE/fetch-sources" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{}')

echo "$FETCH_RESULT" | python3 -m json.tool

echo ""
echo "Waiting 5s for content to be stored..."
sleep 5

echo ""
echo "Step 3: Parse events with AI"
echo "--------------------------------------"
PARSE_RESULT=$(curl -s -X POST "$API_BASE/parse-event-ai" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{}')

echo "$PARSE_RESULT" | python3 -m json.tool

echo ""
echo "Waiting 5s for parsing to complete..."
sleep 5

echo ""
echo "Step 4: Validate parsed events"
echo "--------------------------------------"
VALIDATE_RESULT=$(curl -s -X POST "$API_BASE/validate-event" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{}')

echo "$VALIDATE_RESULT" | python3 -m json.tool

echo ""
echo "Waiting 3s for validation..."
sleep 3

echo ""
echo "Step 5: Publish validated events to map"
echo "--------------------------------------"
PUBLISH_RESULT=$(curl -s -X POST "$API_BASE/publish-event" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{}')

echo "$PUBLISH_RESULT" | python3 -m json.tool

echo ""
echo "======================================"
echo "✅ PIPELINE TEST COMPLETE!"
echo "======================================"
echo ""
echo "Summary:"
echo "- Bootstrap: Check city_id above"
echo "- Fetch: Check fetched count"
echo "- Parse: Check events_extracted count"
echo "- Validate: Check validated count"
echo "- Publish: Check published count"

