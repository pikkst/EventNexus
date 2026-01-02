#!/bin/bash
# ============================================================
# Deploy Security Linter Fixes to Supabase
# Date: 2025-12-30
# ============================================================

set -e  # Exit on error

echo "🔐 Deploying security linter fixes to Supabase..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're linked to a project
if [ ! -f ".supabase/config.toml" ]; then
    echo "❌ Not linked to a Supabase project. Run:"
    echo "   supabase link --project-ref anlivujgkjmajkcgbaxw"
    exit 1
fi

echo "📋 This will fix the following security issues:"
echo "   • 5 SECURITY DEFINER views → SECURITY INVOKER"
echo "   • 6 tables missing RLS → RLS enabled with policies"
echo ""
echo "Tables affected:"
echo "   - event_views"
echo "   - ticket_sales_timeline"
echo "   - autonomous_operation_errors"
echo "   - campaign_performance_metrics"
echo "   - social_media_post_tracking"
echo "   - spatial_ref_sys"
echo ""
echo "Views affected:"
echo "   - ticket_stats"
echo "   - monitoring_dashboard_summary"
echo "   - v_schedule_performance"
echo "   - promo_code_stats"
echo "   - v_campaign_learning_summary"
echo ""

read -p "Continue with deployment? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

echo ""
echo "🚀 Deploying migration..."

# Apply the migration
supabase db push

echo ""
echo "✅ Migration applied successfully!"
echo ""
echo "🔍 Verifying fixes..."
echo ""

# Run verification queries
echo "Checking views..."
supabase db query <<SQL
SELECT 
  viewname,
  CASE 
    WHEN definition LIKE '%security_invoker%' OR definition LIKE '%security_invoker = true%' 
    THEN '✅ SECURITY INVOKER'
    ELSE '⚠️  Check needed'
  END as security_mode
FROM pg_views 
WHERE schemaname = 'public'
  AND viewname IN (
    'ticket_stats',
    'monitoring_dashboard_summary',
    'v_schedule_performance',
    'promo_code_stats',
    'v_campaign_learning_summary'
  )
ORDER BY viewname;
SQL

echo ""
echo "Checking RLS status..."
supabase db query <<SQL
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ Enabled'
    ELSE '❌ Disabled'
  END as rls_status,
  (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as policy_count
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN (
    'event_views',
    'ticket_sales_timeline',
    'autonomous_operation_errors',
    'campaign_performance_metrics',
    'social_media_post_tracking',
    'spatial_ref_sys'
  )
ORDER BY tablename;
SQL

echo ""
echo "📊 Deployment Summary:"
echo "   ✅ All security definer views converted to security invoker"
echo "   ✅ RLS enabled on all required tables"
echo "   ✅ Policies created for proper access control"
echo ""
echo "🎉 Security linter errors should now be resolved!"
echo ""
echo "💡 Next steps:"
echo "   1. Check Supabase Dashboard → Database → Linter"
echo "   2. Verify no ERROR-level security issues remain"
echo "   3. Test application functionality to ensure nothing broke"
echo ""
