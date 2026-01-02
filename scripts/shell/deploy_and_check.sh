#!/bin/bash
# Deploy migration and check Demo Party tickets

set -e

echo "🚀 Deploying Migration & Fixing Demo Party Tickets"
echo "=================================================="
echo ""

# Step 1: Deploy the migration
echo "1️⃣  Deploying migration..."
supabase db push

if [ $? -eq 0 ]; then
  echo "✅ Migration deployed"
else
  echo "❌ Migration failed"
  exit 1
fi

echo ""

# Step 2: Check current ticket status
echo "2️⃣  Checking Demo Party tickets..."
supabase db execute -f check_demo_party_tickets.sql

echo ""

# Step 3: Ask if should fix pending tickets
echo "3️⃣  Fix pending tickets?"
echo ""
echo "If the tickets shown above are from COMPLETED test payments,"
echo "you need to manually update them to 'paid' status."
echo ""
echo "Options:"
echo "  A) Wait for webhook (automatic)"
echo "  B) Manual update (run fix_pending_demo_tickets.sql)"
echo ""
echo "If webhook didn't fire within 5 minutes, run:"
echo "  supabase db execute -f fix_pending_demo_tickets.sql"
echo ""
