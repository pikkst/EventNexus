#!/bin/bash

# Test EventNexus Edge Functions
# Run after deploying functions

echo "🧪 Testing EventNexus Edge Functions"
echo "===================================="
echo ""

# Check if jq is installed for JSON parsing
if ! command -v jq &> /dev/null; then
    echo "⚠️  Warning: jq not installed. Install for better JSON output: sudo apt install jq"
fi

# Get token (you need to replace this with actual token)
echo "📝 You need a valid JWT token to test these functions."
echo "Get it from: Supabase Dashboard > Settings > API > Project API keys > anon key"
echo "Or login and get user token from browser DevTools > Application > Local Storage"
echo ""

read -p "Enter your Supabase JWT token (or press Enter to skip): " TOKEN

if [ -z "$TOKEN" ]; then
    echo "⚠️  Skipping authenticated tests. Please provide a token to test."
    exit 0
fi

BASE_URL="https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1"

echo ""
echo "==================================="
echo "1️⃣  Testing proximity-radar"
echo "==================================="

curl -X POST "$BASE_URL/proximity-radar" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "latitude": 59.437,
    "longitude": 24.7536
  }' | jq '.' 2>/dev/null || echo "(raw response)"

echo ""
echo ""
echo "==================================="
echo "2️⃣  Testing platform-stats"
echo "==================================="
echo "Note: Requires admin user token"

curl -X POST "$BASE_URL/platform-stats" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.' 2>/dev/null || echo "(raw response)"

echo ""
echo ""
echo "==================================="
echo "3️⃣  Testing infrastructure-stats"
echo "==================================="
echo "Note: Requires admin user token"

curl -X POST "$BASE_URL/infrastructure-stats" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.' 2>/dev/null || echo "(raw response)"

echo ""
echo ""
echo "==================================="
echo "4️⃣  Testing validate-ticket"
echo "==================================="
echo "Note: You need a valid ticket ID from database"

read -p "Enter a ticket ID to test (or press Enter to skip): " TICKET_ID

if [ ! -z "$TICKET_ID" ]; then
    curl -X POST "$BASE_URL/validate-ticket" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"ticketId\": \"$TICKET_ID\"}" | jq '.' 2>/dev/null || echo "(raw response)"
else
    echo "⏭️  Skipped"
fi

echo ""
echo ""
echo "✅ Testing complete!"
echo ""
echo "📊 Check function logs:"
echo "  npx supabase functions logs proximity-radar"
echo "  npx supabase functions logs platform-stats"
echo "  npx supabase functions logs infrastructure-stats"
echo "  npx supabase functions logs validate-ticket"
echo ""
