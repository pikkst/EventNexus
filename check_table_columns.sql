-- Check existing table structures to identify column mismatches
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'campaign_analytics', 'campaign_insights', 'campaign_schedule',
    'campaign_social_content', 'campaign_ab_tests', 'social_media_posts',
    'affiliate_earnings', 'feature_usage', 'retention_tracking',
    'utm_sessions', 'platform_metrics', 'error_logs', 'monitoring_stats',
    'brand_monitoring_history', 'brand_monitoring_notes'
  )
ORDER BY table_name, ordinal_position;