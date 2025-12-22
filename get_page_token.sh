#!/bin/bash

# Get PAGE ACCESS TOKEN from USER TOKEN
# Replace YOUR_USER_TOKEN with the token from Graph API Explorer

USER_TOKEN="EAAVtP2I4llMBQUFOTy1SdAOTYsZB57AaDxid30Ugo2grynxRouJeGVkZAKGNHwbz6sa9xIKemeLTuCuGQnvRhj0kpf6XlDxeFd6ZA71KzzWiFK7BlfpuGZBBLrK2HW2l1PVZAZA8sDTNSFEfXbSU5cJzV0WoUcyE5DsLWOGmp3IcBwL8Phc1oby6VQwxIdVwZAZAhpjucFBJmo0ifGRp6XtY0jZCQXELLeuWoy00ZAGF0CUygyR6TuXLZAVWfHt1VoVcRwIVKyZB883NC1YZD"

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
curl -X GET "https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=1527493881796179&client_secret=6d56544a86f98e40365d560139e489c1&fb_exchange_token=$USER_TOKEN"
echo ""
