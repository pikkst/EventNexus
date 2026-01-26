#!/bin/bash
# Setup Resend Inbound Email Route
# This creates a route that forwards all incoming emails to the webhook

# Get RESEND_API_KEY from environment or prompt
if [ -z "$RESEND_API_KEY" ]; then
  echo "Please enter your Resend API Key:"
  read -r RESEND_API_KEY
fi

echo "Creating inbound route for mail.eventnexus.eu..."

curl -X POST 'https://api.resend.com/inbound-routes' \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "domain": "mail.eventnexus.eu",
    "pattern": "*@mail.eventnexus.eu",
    "forward_to": "https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/receive-email"
  }'

echo ""
echo ""
echo "✅ Inbound route created!"
echo ""
echo "Test by sending email to: villu@mail.eventnexus.eu"
