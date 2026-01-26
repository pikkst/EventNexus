-- Check event_template_selections structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'event_template_selections'
ORDER BY ordinal_position;
