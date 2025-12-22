#!/bin/bash
# Get long-lived Page access token for EventNexus Facebook Page

# Your Facebook App credentials
APP_ID="1527493881796179"
# Note: You need to add APP_SECRET here manually
APP_SECRET="YOUR_APP_SECRET_HERE"

# Your long-lived USER access token (from https://developers.facebook.com/tools/explorer/)
# Select "EventNexus" app, Get Token -> Get User Access Token
# Then copy it here:
USER_TOKEN="YOUR_USER_TOKEN_HERE"

echo "🔄 Step 1: Exchange short-lived USER token for long-lived USER token..."
LONG_USER_TOKEN_RESPONSE=$(curl -s "https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=$APP_ID&client_secret=$APP_SECRET&fb_exchange_token=$USER_TOKEN")
echo "$LONG_USER_TOKEN_RESPONSE"

LONG_USER_TOKEN=$(echo $LONG_USER_TOKEN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$LONG_USER_TOKEN" ]; then
  echo "❌ Failed to get long-lived user token"
  exit 1
fi

echo ""
echo "✅ Got long-lived USER token"
echo ""

echo "🔄 Step 2: Get Page access tokens..."
PAGE_TOKENS_RESPONSE=$(curl -s "https://graph.facebook.com/v18.0/me/accounts?access_token=$LONG_USER_TOKEN")
echo "$PAGE_TOKENS_RESPONSE"

# Extract EventNexus page token
PAGE_TOKEN=$(echo $PAGE_TOKENS_RESPONSE | grep -o '"access_token":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$PAGE_TOKEN" ]; then
  echo "❌ No page tokens found"
  exit 1
fi

echo ""
echo "✅ Got PAGE token: $PAGE_TOKEN"
echo ""
echo "📋 Copy this token and insert into database!"
echo ""
echo "SQL to run:"
echo ""
echo "UPDATE social_media_accounts"
echo "SET access_token = '$PAGE_TOKEN', updated_at = NOW()"
echo "WHERE user_id = 'f2ecf6c6-14c1-4dbd-894b-14ee6493d807' AND platform = 'facebook';"
