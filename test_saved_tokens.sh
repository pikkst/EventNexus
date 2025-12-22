#!/bin/bash

# Get tokens from database and test them
echo "🔍 Fetching tokens from database..."

# You need to run this in Supabase SQL Editor and paste the tokens here
# For now, let's test if we can retrieve them

echo ""
echo "📋 Run this in Supabase SQL Editor to get the actual tokens:"
echo ""
echo "SELECT platform, account_id, access_token FROM social_media_accounts WHERE user_id = (SELECT id FROM auth.users WHERE email = 'huntersest@gmail.com') ORDER BY platform;"
echo ""
echo "Then paste the Facebook token here and run:"
echo ""
echo "FB_TOKEN='<paste_token_here>'"
echo "curl -X GET \"https://graph.facebook.com/v18.0/864504226754704/feed?limit=1&access_token=\$FB_TOKEN\""
echo ""
echo "If you get 'Invalid OAuth access token' - the token is wrong"
echo "If you get feed data - the token works!"
