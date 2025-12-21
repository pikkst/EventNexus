-- List all tables in public schema (excluding PostGIS)
SELECT 
    tablename,
    'exists' as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename NOT LIKE 'pg_%'
AND tablename NOT IN ('spatial_ref_sys', 'geometry_columns', 'geography_columns', 'raster_columns', 'raster_overviews')
ORDER BY tablename;
