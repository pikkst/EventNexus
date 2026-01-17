#!/bin/bash
# ============================================
# Fix Ticket Payment Tracking Issue
# Date: 2026-01-01
# Purpose: Deploy fixes for tickets not showing revenue data
# ============================================

set -e

echo "🔧 Fixing Ticket Payment Tracking Issue"
echo "========================================"
echo ""

# Load environment
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# Check prerequisites
if [ -z "$SUPABASE_PROJECT_REF" ]; then
  echo "❌ Error: SUPABASE_PROJECT_REF not set"
  echo "Add to .env.local: SUPABASE_PROJECT_REF=anlivujgkjmajkcgbaxw"
  exit 1
fi

echo "📊 Project: $SUPABASE_PROJECT_REF"
echo ""

# Step 1: Deploy the migration to fix orphaned tickets
echo "1️⃣ Deploying migration to fix orphaned tickets..."
supabase db push

if [ $? -eq 0 ]; then
  echo "✅ Migration deployed successfully"
else
  echo "❌ Migration failed"
  exit 1
fi

echo ""

# Step 2: Deploy updated create-checkout Edge Function
echo "2️⃣ Deploying updated create-checkout Edge Function..."
supabase functions deploy create-checkout --no-verify-jwt

if [ $? -eq 0 ]; then
  echo "✅ Edge Function deployed successfully"
else
  echo "❌ Edge Function deployment failed"
  exit 1
fi

echo ""

# Step 3: Verify the fix
echo "3️⃣ Verifying fix..."
echo "Running verification query..."

supabase db execute << 'SQL'
SELECT 
  'Total Tickets' as metric,
  COUNT(*) as count,
  COALESCE(SUM(price_paid), 0) as total_revenue
FROM tickets
UNION ALL
SELECT 
  'Paid Tickets' as metric,
  COUNT(*) as count,
  COALESCE(SUM(price_paid), 0) as total_revenue
FROM tickets
WHERE payment_status = 'paid'
UNION ALL
SELECT 
  'Pending Tickets' as metric,
  COUNT(*) as count,
  COALESCE(SUM(price_paid), 0) as total_revenue
FROM tickets
WHERE payment_status = 'pending'
ORDER BY metric DESC;
SQL

echo ""
echo "✅ All fixes deployed successfully!"
echo ""
echo "📝 Summary of Changes:"
echo "  • Fixed create-checkout to set payment_status='pending' initially"
echo "  • Added stripe_session_id to tickets on creation"
echo "  • Fixed orphaned tickets (NULL payment_status → 'paid' if valid)"
echo "  • Added trigger to auto-sync event attendee counts"
echo "  • Updated all events with correct attendee counts"
echo ""
echo "🔄 Next Steps:"
echo "  1. Test by purchasing a ticket"
echo "  2. Check dashboard shows revenue immediately"
echo "  3. Verify webhook updates ticket to 'paid' status"
echo ""
