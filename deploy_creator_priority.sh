#!/bin/bash

# Deploy Creator Acquisition Priority SQL to Supabase
# This updates the strategic recommendation logic to prioritize creator acquisition in early stage

echo "🚀 Deploying Creator Acquisition Priority SQL to Supabase..."
echo ""

# Get Supabase credentials from environment
SUPABASE_DB_URL=$(grep SUPABASE_DB_PASSWORD /workspaces/EventNexus/.env.local 2>/dev/null | cut -d '=' -f2- | sed 's/^"\(.*\)"$/\1/')

if [ -z "$SUPABASE_DB_URL" ]; then
  echo "❌ Error: SUPABASE_DB_PASSWORD not found in .env.local"
  echo ""
  echo "Please add to .env.local:"
  echo "SUPABASE_DB_PASSWORD=your_db_password"
  echo ""
  echo "Get password from: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/settings/database"
  exit 1
fi

# Build connection string
DB_HOST="aws-0-eu-central-1.pooler.supabase.com"
DB_PORT="6543"
DB_NAME="postgres"
DB_USER="postgres.anlivujgkjmajkcgbaxw"
CONNECTION_STRING="postgresql://${DB_USER}:${SUPABASE_DB_URL}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require"

echo "📝 Reading SQL migration file..."
SQL_FILE="/workspaces/EventNexus/supabase/migrations/20251230_prioritize_creator_acquisition.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "❌ Error: SQL file not found: $SQL_FILE"
  exit 1
fi

echo "✅ SQL file found"
echo ""
echo "🔄 Executing SQL migration..."
echo ""

# Execute SQL
psql "$CONNECTION_STRING" -f "$SQL_FILE"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ SUCCESS! Creator acquisition priority SQL deployed"
  echo ""
  echo "📊 Changes applied:"
  echo "   - capture_platform_intelligence() updated"
  echo "   - get_strategic_recommendation() prioritizes creators"
  echo "   - Logic: <100 events OR <20 organizers → target creators"
  echo ""
  echo "🧪 Test the new logic:"
  echo "   ./test_intelligent_marketing_function.sh"
  echo ""
  echo "Expected result:"
  echo "   strategy_type: 'acquisition'"
  echo "   target_audience: 'creators'"
  echo "   rationale: 'EARLY STAGE PRIORITY: Only X organizers...'"
else
  echo ""
  echo "❌ ERROR: SQL deployment failed"
  echo ""
  echo "Troubleshooting:"
  echo "1. Check database password in .env.local"
  echo "2. Verify network connection"
  echo "3. Check SQL syntax in migration file"
  exit 1
fi
