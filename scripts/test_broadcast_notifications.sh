#!/bin/bash
# Test Admin Broadcast Notification System
# Verifies that admin can send notifications to all users

echo "🔔 Testing Admin Broadcast Notifications..."
echo "==========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check notifications table exists
echo "1️⃣ Checking notifications table..."
RESULT=$(psql "$SUPABASE_DB_URL" -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications';" 2>&1)
if [[ $RESULT =~ "1" ]]; then
    echo -e "${GREEN}✅ Table exists${NC}"
else
    echo -e "${RED}❌ Table not found${NC}"
fi
echo ""

# 2. Check RLS policies
echo "2️⃣ Checking RLS policies for notifications..."
POLICIES=$(psql "$SUPABASE_DB_URL" -t -c "SELECT COUNT(*) FROM pg_policies WHERE tablename = 'notifications';" 2>&1)
echo "Found $POLICIES policies"
psql "$SUPABASE_DB_URL" -c "SELECT policyname, cmd FROM pg_policies WHERE tablename = 'notifications';"
echo ""

# 3. Check service_role permissions
echo "3️⃣ Checking service_role permissions..."
psql "$SUPABASE_DB_URL" -c "SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_schema = 'public' AND table_name = 'notifications' AND grantee = 'service_role';"
echo ""

# 4. Count users by role
echo "4️⃣ Counting users by role..."
psql "$SUPABASE_DB_URL" -c "SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY count DESC;"
echo ""

# 5. Check recent notifications
echo "5️⃣ Recent notifications (last 5)..."
psql "$SUPABASE_DB_URL" -c "SELECT n.title, u.email as recipient, n.type, n.timestamp FROM notifications n JOIN users u ON u.id = n.user_id ORDER BY n.timestamp DESC LIMIT 5;"
echo ""

# 6. Test broadcast to small group (if test mode)
if [ "$1" == "--test" ]; then
    echo "6️⃣ Creating test broadcast notification..."
    TEST_RESULT=$(psql "$SUPABASE_DB_URL" -t -c "
        INSERT INTO notifications (user_id, title, message, type, \"isRead\", timestamp)
        SELECT id, 'Test Broadcast', 'System test message', 'system', false, NOW()
        FROM users LIMIT 3;
        SELECT COUNT(*) FROM notifications WHERE title = 'Test Broadcast';
    " 2>&1)
    echo "Test notifications created: $TEST_RESULT"
    echo ""
fi

echo "==========================================="
echo -e "${GREEN}✅ Diagnostic complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Run: sql/fix_notifications_permissions.sql in Supabase SQL Editor"
echo "2. Test broadcast from Admin Dashboard → Command Center"
echo "3. Verify users receive notifications"
echo ""
echo "To run with test data: $0 --test"
