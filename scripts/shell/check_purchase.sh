#!/bin/bash
# Quick check: Verify recent ticket purchase in database

echo "🔍 Checking recent ticket purchase..."
echo "Session ID: cs_test_a1uQ496vmrhMoGKMUTt9cpcuUCqHZ8E2lcrRln2gSemCflDkTppu5nOnrn"
echo ""

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "⚠️  Supabase CLI not found. Run query manually in Supabase SQL Editor:"
    echo ""
    cat check_recent_purchase.sql
    exit 0
fi

echo "Running query..."
supabase db execute -f check_recent_purchase.sql

echo ""
echo "📊 Expected results:"
echo "  • payment_status: 'pending' (initially)"
echo "  • stripe_session_id: cs_test_a1uQ496vmrhMoGKMUTt9cpcuUCqHZ8E2lcrRln2gSemCflDkTppu5nOnrn"
echo "  • stripe_payment_id: NULL (will be set by webhook)"
echo "  • status: 'valid'"
echo ""
echo "After payment completes, webhook will update:"
echo "  • payment_status: 'pending' → 'paid'"
echo "  • stripe_payment_id: will be set"
echo "  • qr_code: will be regenerated with secure hash"
