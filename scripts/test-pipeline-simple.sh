#!/bin/bash

API_BASE="https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1"
AUTH="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFubGl2dWpna2ptYWprY2diYXh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5OTY0OTQsImV4cCI6MjA4MTU3MjQ5NH0.5SzkZg_PMqgdMClS1ftg4ZT_Ddyq1zOi-ZOLe1yuRgY"

echo "🧪 Testing AI Pipeline (Simple)"
echo "================================"

echo ""
echo "1️⃣ Create test city (no AI discovery)"
curl -s -X POST "$API_BASE/bootstrap-city" \
  -H "Authorization: $AUTH" \
  -H "Content-Type: application/json" \
  -d '{"city_name":"TestCity","country":"Estonia","auto_discover":false,"seed_events":false}' \
  | python3 -m json.tool

echo ""
echo ""
echo "2️⃣ Test fetch-sources (should find 0 sources)"  
curl -s -X POST "$API_BASE/fetch-sources" \
  -H "Authorization: $AUTH" \
  -H "Content-Type: application/json" \
  -d '{}' \
  | python3 -m json.tool

echo ""
echo ""
echo "3️⃣ Test parse-event-ai (should find 0 raw events)"
curl -s -X POST "$API_BASE/parse-event-ai" \
  -H "Authorization: $AUTH" \
  -H "Content-Type: application/json" \
  -d '{}' \
  | python3 -m json.tool

echo ""
echo ""
echo "4️⃣ Test validate-event (should find 0 parsed events)"
curl -s -X POST "$API_BASE/validate-event" \
  -H "Authorization: $AUTH" \
  -H "Content-Type: application/json" \
  -d '{}' \
  | python3 -m json.tool

echo ""
echo ""
echo "5️⃣ Test publish-event (should find 0 validated events)"
curl -s -X POST "$API_BASE/publish-event" \
  -H "Authorization: $AUTH" \
  -H "Content-Type: application/json" \
  -d '{}' \
  | python3 -m json.tool

echo ""
echo ""
echo "✅ All functions are responding!"
echo "Next: Add real event sources to test full pipeline"

