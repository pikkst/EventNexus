#!/bin/bash

# Test Intelligent Autonomous Marketing Edge Function

echo "🧪 Testing Intelligent Autonomous Marketing Edge Function..."
echo ""

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
  echo "❌ Missing Supabase credentials in .env.local"
  exit 1
fi

# Extract base URL
SUPABASE_URL="${VITE_SUPABASE_URL}"
FUNCTION_URL="${SUPABASE_URL}/functions/v1/intelligent-autonomous-marketing"

echo "📍 Function URL: ${FUNCTION_URL}"
echo ""
echo "🚀 Invoking function..."
echo ""

# Invoke the function
RESPONSE=$(curl -s -X POST "${FUNCTION_URL}" \
  -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -w "\n%{http_code}")

# Extract HTTP status code
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "📊 HTTP Status: ${HTTP_CODE}"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Function executed successfully!"
  echo ""
  echo "📄 Response:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
elif [ "$HTTP_CODE" = "500" ]; then
  echo "❌ Function error (500)"
  echo ""
  echo "📄 Error details:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
  echo "⚠️  Unexpected status code: ${HTTP_CODE}"
  echo ""
  echo "📄 Response:"
  echo "$BODY"
fi

echo ""
echo "📝 View detailed logs:"
echo "1. Go to: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/functions"
echo "2. Click on 'intelligent-autonomous-marketing'"
echo "3. View 'Invocations' tab for execution history"
echo ""
echo "Or run: npx supabase functions logs intelligent-autonomous-marketing"
