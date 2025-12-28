#!/bin/bash

# Quick database test script
# This tests if the admin grant credits function works

echo "🔍 Testing credit system in database..."
echo ""
echo "Step 1: Check if user exists and current credits"
echo "Step 2: Try to grant credits using the function"
echo ""
echo "Please run these queries in Supabase SQL Editor:"
echo ""
echo "1. Find user and admin IDs:"
echo "   SELECT id, email, credits FROM public.users WHERE email = 'huntersest@gmail.com';"
echo "   SELECT id, email FROM public.users WHERE role = 'admin' LIMIT 1;"
echo ""
echo "2. Test the grant function (replace the UUIDs with actual values):"
echo "   SELECT public.admin_grant_credits("
echo "     'USER_UUID_HERE'::uuid,"
echo "     500,"
echo "     'Direct database test',"
echo "     'ADMIN_UUID_HERE'::uuid"
echo "   );"
echo ""
echo "3. Verify the result:"
echo "   SELECT id, email, credits FROM public.users WHERE email = 'huntersest@gmail.com';"
echo ""
echo "4. Check transactions:"
echo "   SELECT * FROM public.credit_transactions ORDER BY created_at DESC LIMIT 5;"
