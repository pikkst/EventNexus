#!/bin/bash

# EventNexus - Google Analytics Service Account Secrets Setup
# This script sets GA4 Service Account credentials for analytics-bridge Edge Function

echo "════════════════════════════════════════════════════════════════════════"
echo "         Google Analytics Service Account Secrets Setup"
echo "════════════════════════════════════════════════════════════════════════"
echo ""

# Check if Service Account JSON file exists
if [ ! -f "ga-service-account.json" ]; then
  echo "⚠️  ga-service-account.json not found!"
  echo ""
  echo "Please download your Service Account JSON key and save it as:"
  echo "  ga-service-account.json"
  echo ""
  echo "Steps:"
  echo "1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts"
  echo "2. Find your EventNexus GA Service Account"
  echo "3. Actions → Manage keys → Add key → Create new key → JSON"
  echo "4. Save as ga-service-account.json in this directory"
  echo ""
  exit 1
fi

echo "✓ Found ga-service-account.json"
echo ""

# Extract values from JSON
GA_SERVICE_ACCOUNT_EMAIL=$(cat ga-service-account.json | grep -o '"client_email": *"[^"]*"' | sed 's/"client_email": *"\(.*\)"/\1/')
GA_PRIVATE_KEY=$(cat ga-service-account.json | grep -o '"private_key": *"[^"]*"' | sed 's/"private_key": *"\(.*\)"/\1/')

if [ -z "$GA_SERVICE_ACCOUNT_EMAIL" ] || [ -z "$GA_PRIVATE_KEY" ]; then
  echo "❌ Failed to extract credentials from JSON file"
  exit 1
fi

echo "📧 Service Account Email: $GA_SERVICE_ACCOUNT_EMAIL"
echo ""

# Set secrets in Supabase
echo "🔧 Setting secrets in Supabase..."
echo ""

npx supabase secrets set GA_SERVICE_ACCOUNT_EMAIL="$GA_SERVICE_ACCOUNT_EMAIL"
npx supabase secrets set GA_PRIVATE_KEY="$GA_PRIVATE_KEY"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Secrets set successfully!"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  NEXT STEPS:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "1. Grant GA4 access to Service Account:"
  echo "   https://analytics.google.com/analytics/web/#/a517523733p517523733/admin/property-access-management"
  echo "   → Add users → $GA_SERVICE_ACCOUNT_EMAIL"
  echo "   → Role: Viewer"
  echo ""
  echo "2. Test in dashboard:"
  echo "   Analytics → Overview/Traffic/Conversions tabs"
  echo "   Should now show REAL GA4 data instead of empty arrays"
  echo ""
  echo "3. Clean up (optional):"
  echo "   rm ga-service-account.json  # Delete local JSON file"
  echo ""
  echo "════════════════════════════════════════════════════════════════════════"
else
  echo ""
  echo "❌ Failed to set secrets"
  echo "Try manually in Supabase Dashboard:"
  echo "https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/settings/functions"
fi
