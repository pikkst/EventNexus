#!/bin/bash

# Test Autonomous Operations Setup
# Checks if database tables and functions exist

echo "🔍 Testing Autonomous Operations Setup..."
echo ""

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
  echo "❌ Missing Supabase credentials in .env.local"
  exit 1
fi

# Test 1: Check if autonomous_actions table exists
echo "📊 Test 1: Checking autonomous_actions table..."
RESPONSE=$(curl -s -X POST \
  "${VITE_SUPABASE_URL}/rest/v1/rpc/check_table_exists" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"table_name": "autonomous_actions"}' 2>&1)

echo "Response: $RESPONSE"

# Test 2: Try to query autonomous_actions table directly
echo ""
echo "📊 Test 2: Querying autonomous_actions table..."
ACTIONS=$(curl -s -X GET \
  "${VITE_SUPABASE_URL}/rest/v1/autonomous_actions?select=*&limit=5" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}")

if echo "$ACTIONS" | grep -q "code"; then
  echo "❌ Table query failed:"
  echo "$ACTIONS"
else
  echo "✅ Table exists and is accessible"
  echo "Recent actions count: $(echo "$ACTIONS" | grep -o '\[' | wc -l)"
fi

# Test 3: Check autonomous_rules table
echo ""
echo "📊 Test 3: Checking autonomous_rules table..."
RULES=$(curl -s -X GET \
  "${VITE_SUPABASE_URL}/rest/v1/autonomous_rules?select=*&limit=5" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}")

if echo "$RULES" | grep -q "code"; then
  echo "❌ Table query failed:"
  echo "$RULES"
else
  echo "✅ Rules table exists"
  echo "Active rules: $(echo "$RULES" | grep -c '"is_active":true')"
fi

# Test 4: Check optimization_opportunities table
echo ""
echo "📊 Test 4: Checking optimization_opportunities table..."
OPPS=$(curl -s -X GET \
  "${VITE_SUPABASE_URL}/rest/v1/optimization_opportunities?select=*&limit=5" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}")

if echo "$OPPS" | grep -q "code"; then
  echo "❌ Table query failed:"
  echo "$OPPS"
else
  echo "✅ Opportunities table exists"
fi

echo ""
echo "✅ Basic connectivity tests complete!"
echo ""
echo "📝 Next Steps:"
echo "1. If tables don't exist, run: sql/create_autonomous_operations.sql in Supabase SQL Editor"
echo "2. Check Supabase Dashboard → Database → Tables for autonomous_* tables"
echo "3. Verify RLS policies are enabled for admin access"
