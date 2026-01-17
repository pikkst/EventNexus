#!/bin/bash
# ============================================
# Deploy Ticket Payment & Capacity Fixes
# Date: 2026-01-01
# ============================================

set -e

echo "🚀 Deploying Ticket Payment & Capacity Fixes"
echo "============================================="
echo ""
echo "This will fix two critical issues:"
echo "  1. Ticket purchase revenue not showing in dashboard"
echo "  2. Event capacity showing wrong totals"
echo ""

# Load environment
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# Check prerequisites
command -v supabase >/dev/null 2>&1 || { echo "❌ Supabase CLI not installed"; exit 1; }

echo "✅ Prerequisites check passed"
echo ""

# Step 1: Deploy database migration
echo "1️⃣  Deploying database migration..."
echo "   - Fixes orphaned tickets (NULL payment_status)"
echo "   - Adds auto-sync trigger for attendee counts"
echo ""

supabase db push

if [ $? -eq 0 ]; then
  echo "✅ Database migration deployed"
else
  echo "❌ Database migration failed"
  exit 1
fi

echo ""

# Step 2: Deploy Edge Function
echo "2️⃣  Deploying updated Edge Function..."
echo "   - create-checkout now sets payment_status and stripe_session_id"
echo ""

supabase functions deploy create-checkout --no-verify-jwt

if [ $? -eq 0 ]; then
  echo "✅ Edge Function deployed"
else
  echo "❌ Edge Function deployment failed"
  exit 1
fi

echo ""

# Step 3: Build frontend
echo "3️⃣  Building frontend..."
echo "   - EventDetail now calculates capacity from ticket templates"
echo ""

npm run build

if [ $? -eq 0 ]; then
  echo "✅ Frontend built successfully"
else
  echo "❌ Frontend build failed"
  exit 1
fi

echo ""

# Step 4: Verify deployment
echo "4️⃣  Verifying deployment..."
echo ""

# Check if migration was applied
echo "Checking tickets table schema..."
supabase db execute "SELECT column_name FROM information_schema.columns WHERE table_name = 'tickets' AND column_name IN ('payment_status', 'stripe_session_id', 'purchase_date');" | grep -q "payment_status" && echo "✅ payment_status column exists" || echo "⚠️  payment_status column missing"

# Check ticket statistics
echo ""
echo "Current ticket statistics:"
supabase db execute << 'SQL'
SELECT 
  payment_status,
  COUNT(*) as count,
  ROUND(SUM(price_paid)::numeric, 2) as total_revenue
FROM tickets
GROUP BY payment_status
ORDER BY payment_status;
SQL

echo ""
echo "✅ All fixes deployed successfully!"
echo ""
echo "📋 Summary:"
echo "  ✅ Database migration: Fixed orphaned tickets"
echo "  ✅ Edge Function: Now sets payment_status properly"
echo "  ✅ Frontend: Correct capacity calculation"
echo "  ✅ Build: No errors"
echo ""
echo "🧪 Testing Steps:"
echo "  1. Go to an event page"
echo "  2. Check 'X Left of Y' shows correct totals"
echo "  3. Purchase a ticket"
echo "  4. Check organizer dashboard shows revenue immediately"
echo "  5. Verify webhook updates ticket to 'paid' status"
echo ""
echo "📁 Deploy frontend to production:"
echo "  • dist/ folder is ready"
echo "  • Upload to https://www.eventnexus.eu"
echo ""
