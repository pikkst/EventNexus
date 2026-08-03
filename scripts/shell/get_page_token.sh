#!/bin/bash

# Get PAGE ACCESS TOKEN from USER TOKEN
# Replace YOUR_USER_TOKEN with the token from Graph API Explorer

USER_TOKEN="REPLACE_WITH_BACKEND_SECRET"

echo "🔄 Getting PAGE ACCESS TOKEN for EventNexus..."
echo ""

# Try method 1: Direct page query
echo "Method 1: Direct page query"
curl -X GET "https://graph.facebook.com/v18.0/864504226754704?fields=access_token&access_token=$USER_TOKEN"
echo ""
echo ""

# Try method 2: Query via page object
echo "Method 2: Via accounts edge"
curl -X GET "https://graph.facebook.com/v18.0/122161929416394717/accounts?access_token=$USER_TOKEN"
echo ""
echo ""

# Try method 3: Inspect token endpoint
echo "Method 3: Token inspection"
curl -X GET "https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=REPLACE_WITH_FACEBOOK_APP_ID&client_secret=REPLACE_WITH_BACKEND_SECRET&fb_exchange_token=$USER_TOKEN"
echo ""
