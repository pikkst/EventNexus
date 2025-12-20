-- ============================================================
-- EventNexus Storage Verification Script
-- ============================================================
-- Purpose: Check if all required storage buckets and policies exist
-- Run in: Supabase SQL Editor
-- ============================================================

-- 1. CHECK STORAGE BUCKETS
-- ============================================================
SELECT 
  '📦 STORAGE BUCKETS' as section,
  '' as detail;

SELECT 
  id as bucket_id,
  name,
  CASE WHEN public THEN '✅ Public' ELSE '❌ Private' END as access,
  COALESCE((file_size_limit / 1024 / 1024)::text || 'MB', 'No limit') as size_limit,
  COALESCE(array_length(allowed_mime_types, 1)::text, '0') || ' mime types' as mime_types,
  created_at
FROM storage.buckets
WHERE id IN ('avatars', 'event-images')
ORDER BY id;

-- 2. CHECK STORAGE POLICIES
-- ============================================================
SELECT 
  '🔒 STORAGE POLICIES' as section,
  '' as detail;

SELECT 
  schemaname || '.' || tablename as table_name,
  policyname as policy_name,
  CASE 
    WHEN cmd = 'SELECT' THEN '👁️ SELECT'
    WHEN cmd = 'INSERT' THEN '➕ INSERT'
    WHEN cmd = 'UPDATE' THEN '✏️ UPDATE'
    WHEN cmd = 'DELETE' THEN '🗑️ DELETE'
    ELSE cmd
  END as command,
  CASE 
    WHEN roles @> ARRAY['public'::name] THEN '🌐 Public'
    WHEN roles @> ARRAY['authenticated'::name] THEN '🔐 Authenticated'
    ELSE '⚠️ ' || array_to_string(roles, ', ')
  END as for_role
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
ORDER BY policyname;

-- 3. CHECK FOLDER STRUCTURE
-- ============================================================
SELECT 
  '📁 UPLOAD LOCATIONS' as section,
  '' as detail;

SELECT 
  'avatars bucket' as bucket,
  'avatars/' as folder,
  'User profile pictures' as purpose,
  '~500KB compressed' as size,
  '✅ Required' as status
UNION ALL
SELECT 
  'avatars bucket' as bucket,
  'banners/' as folder,
  'User profile banners' as purpose,
  '~800KB compressed' as size,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'objects' 
        AND policyname LIKE '%banner%'
    ) THEN '✅ Has policies'
    ELSE '⚠️ No specific policies'
  END as status
UNION ALL
SELECT 
  'event-images bucket' as bucket,
  'ai-generated/' as folder,
  'AI-generated marketing images' as purpose,
  'Variable size' as size,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM storage.buckets WHERE id = 'event-images'
    ) THEN '✅ Bucket exists'
    ELSE '❌ Bucket missing'
  END as status;

-- 4. WHAT USERS CAN UPLOAD
-- ============================================================
SELECT 
  '📤 USER UPLOAD CAPABILITIES' as section,
  '' as detail;

SELECT 
  'Avatar Image' as upload_type,
  'UserProfile.tsx → handleAvatarUpload()' as component,
  'avatars/{userId}-{timestamp}.jpg' as path,
  '10MB max → ~500KB compressed' as processing,
  '800×800px max' as dimensions,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM storage.buckets WHERE id = 'avatars'
    ) THEN '✅ Ready'
    ELSE '❌ Missing bucket'
  END as status
UNION ALL
SELECT 
  'Banner Image' as upload_type,
  'UserProfile.tsx → handleBannerUpload()' as component,
  'banners/{userId}-banner-{timestamp}.jpg' as path,
  '10MB max → ~800KB compressed' as processing,
  '1200×400px max' as dimensions,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM storage.buckets WHERE id = 'avatars'
    ) THEN '✅ Ready'
    ELSE '❌ Missing bucket'
  END as status
UNION ALL
SELECT 
  'AI Generated Image' as upload_type,
  'geminiService.ts → generateAdImage()' as component,
  'ai-generated/{timestamp}-{random}.png' as path,
  'Direct from Gemini API' as processing,
  '1024×1024px' as dimensions,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM storage.buckets WHERE id = 'event-images'
    ) THEN '✅ Ready'
    ELSE '❌ Missing bucket'
  END as status;

-- 5. REQUIRED ACTIONS
-- ============================================================
SELECT 
  '⚡ REQUIRED ACTIONS' as section,
  '' as detail;

-- Check if avatars bucket exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars')
    THEN '✅ Avatars bucket exists'
    ELSE '❌ RUN: sql/setup-avatar-storage.sql'
  END as action,
  'Required for avatar and banner uploads' as reason;

-- Check if event-images bucket exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'event-images')
    THEN '✅ Event-images bucket exists'
    ELSE '❌ RUN: sql/setup-ai-image-storage.sql'
  END as action,
  'Required for AI-generated images' as reason;

-- Check if banner policies exist
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'objects' 
        AND policyname LIKE '%banner%'
    )
    THEN '✅ Banner-specific policies exist'
    ELSE '⚠️ RECOMMENDED: Add banner-specific RLS policies'
  END as action,
  'Banners currently use avatar bucket policies' as reason;

-- Check file size limits
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM storage.buckets 
      WHERE id = 'avatars' 
        AND (file_size_limit IS NULL OR file_size_limit >= 10485760)
    )
    THEN '✅ File size limit allows 10MB uploads'
    ELSE '⚠️ RECOMMENDED: Increase avatars bucket limit to 10MB'
  END as action,
  'Current code allows 10MB uploads before compression' as reason;

-- 6. SUMMARY
-- ============================================================
SELECT 
  '📊 SUMMARY' as section,
  '' as detail;

SELECT 
  (SELECT COUNT(*) FROM storage.buckets WHERE id IN ('avatars', 'event-images'))::text || '/2' as buckets_ready,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage')::text as total_policies,
  CASE 
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars')
      AND EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'event-images')
    THEN '✅ ALL STORAGE READY'
    ELSE '⚠️ SETUP REQUIRED'
  END as overall_status;
