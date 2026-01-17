#!/bin/bash
# Test Admin Inbox Integration
# Checks database, Edge Function, and webhook configuration

echo "🔍 Testing Admin Inbox Integration..."
echo "===================================="
echo ""

# 1. Check if admin_inbox table exists
echo "1️⃣ Checking admin_inbox table..."
npx supabase db execute "SELECT COUNT(*) as message_count FROM admin_inbox;" 2>&1 | grep -q "message_count" && echo "✅ Table exists" || echo "❌ Table not found"
echo ""

# 2. Check RLS policies
echo "2️⃣ Checking RLS policies..."
npx supabase db execute "SELECT COUNT(*) FROM pg_policies WHERE tablename = 'admin_inbox';" 2>&1 | grep -q "1" && echo "✅ RLS policies configured" || echo "⚠️  No RLS policies found"
echo ""

# 3. Test receive-email Edge Function
echo "3️⃣ Testing receive-email Edge Function..."
FUNCTION_URL="https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/receive-email"
echo "Webhook URL: $FUNCTION_URL"
echo ""

# 4. Check if function is deployed
echo "4️⃣ Checking if function is deployed..."
npx supabase functions list | grep -q "receive-email" && echo "✅ Function deployed" || echo "❌ Function not deployed"
echo ""

# 5. Query recent messages
echo "5️⃣ Checking recent messages..."
npx supabase db execute "SELECT id, from_email, subject, status, created_at FROM admin_inbox ORDER BY created_at DESC LIMIT 5;" 2>&1
echo ""

# 6. Check function logs for errors
echo "6️⃣ Recent function logs (last 10 entries)..."
npx supabase functions logs receive-email --limit 10
echo ""

echo "===================================="
echo "✅ Diagnostic complete!"
echo ""
echo "Next steps if emails not appearing:"
echo "1. Check Resend Dashboard → Webhooks → Logs"
echo "2. Verify webhook URL is: $FUNCTION_URL"
echo "3. Check inbound route matches: *@mail.eventnexus.eu"
echo "4. Send test email to: support@mail.eventnexus.eu"
echo "5. Check function logs: npx supabase functions logs receive-email --tail"
