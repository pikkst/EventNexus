#!/bin/bash
# Test process-scheduled-payouts Edge Function manually

echo "🚀 Testing Stripe payout process..."
echo ""

curl -X POST \
  'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/process-scheduled-payouts' \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFubGl2dWpna2ptYWprY2diYXh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5OTY0OTQsImV4cCI6MjA4MTU3MjQ5NH0.5SzkZg_PMqgdMClS1ftg4ZT_Ddyq1zOi-ZOLe1yuRgY" \
  -H "Content-Type: application/json" \
  -d '{}' \
  | jq

echo ""
echo "✓ Payout processing completed"
