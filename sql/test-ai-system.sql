-- Test AI Agent System
-- Check if tables exist and have data

SELECT 'city_configs' as table_name, COUNT(*) as count FROM public.city_configs
UNION ALL
SELECT 'event_sources', COUNT(*) FROM public.event_sources
UNION ALL
SELECT 'ai_agents', COUNT(*) FROM public.ai_agents
UNION ALL
SELECT 'raw_events', COUNT(*) FROM public.raw_events
UNION ALL
SELECT 'parsed_events', COUNT(*) FROM public.parsed_events
UNION ALL
SELECT 'ai_decision_log', COUNT(*) FROM public.ai_decision_log
ORDER BY table_name;

-- Show city configs
SELECT city_name, country, bootstrap_status, active 
FROM public.city_configs;

-- Show AI agents
SELECT name, ai_provider, model, active 
FROM public.ai_agents
LIMIT 10;
