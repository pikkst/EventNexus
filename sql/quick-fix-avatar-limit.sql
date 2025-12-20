-- Quick fix: Increase avatars bucket size limit to 10MB
UPDATE storage.buckets
SET file_size_limit = 10485760  -- 10MB
WHERE id = 'avatars';

-- Verify
SELECT 
  id,
  name,
  (file_size_limit / 1024 / 1024)::text || 'MB' as size_limit,
  CASE WHEN public THEN '✅ Public' ELSE '⚠️ Private' END as access
FROM storage.buckets
WHERE id = 'avatars';
