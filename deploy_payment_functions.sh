#!/bin/bash
# Deploy all critical Edge Functions for ticket payment flow

set -e

echo "🚀 Deploying Ticket Payment Edge Functions"
echo "=========================================="
echo ""

# Step 1: Deploy create-checkout (with updated payment_status logic)
echo "1️⃣  Deploying create-checkout..."
supabase functions deploy create-checkout --no-verify-jwt
echo "✅ create-checkout deployed"
echo ""

# Step 2: Deploy verify-checkout (for redirect callback)
echo "2️⃣  Deploying verify-checkout..."
supabase functions deploy verify-checkout --no-verify-jwt
echo "✅ verify-checkout deployed"
echo ""

# Step 3: Deploy stripe-webhook (for async payment confirmation)
echo "3️⃣  Deploying stripe-webhook..."
supabase functions deploy stripe-webhook --no-verify-jwt
echo "✅ stripe-webhook deployed"
echo ""

echo "✅ All Edge Functions deployed!"
echo ""
echo "📋 Payment Flow:"
echo "  1. User clicks 'Buy' → create-checkout creates tickets (pending)"
echo "  2. User completes payment → Stripe redirect"
echo "  3. verify-checkout confirms payment → updates to 'paid' ✅"
echo "  4. stripe-webhook (backup) → also updates if verify-checkout missed"
echo ""
echo "🧪 Test now:"
echo "  1. Buy a ticket"
echo "  2. Complete Stripe payment"
echo "  3. Should redirect back and show success"
echo "  4. Check dashboard - revenue should appear immediately"
echo ""
