# EventNexus Storage Setup Guide

## 📦 What Users Can Upload

EventNexus supports 3 types of file uploads:

| Upload Type | Component | Storage Location | Processing |
|------------|-----------|------------------|------------|
| **Avatar** | UserProfile.tsx | `avatars/{userId}-{timestamp}.jpg` | 10MB → ~500KB (800×800px) |
| **Banner** | UserProfile.tsx | `banners/{userId}-banner-{timestamp}.jpg` | 10MB → ~800KB (1200×400px) |
| **AI Images** | geminiService.ts | `ai-generated/{timestamp}-{random}.png` | Direct from Gemini API |

## 🗄️ Required Storage Buckets

### 1. `avatars` bucket
- **Purpose:** User profile pictures AND banners
- **Access:** Public (everyone can view)
- **Size Limit:** 10MB per file
- **Folders:**
  - `avatars/` - Profile pictures
  - `banners/` - Profile banners
- **Setup:** Run `sql/setup-avatar-storage.sql`

### 2. `event-images` bucket
- **Purpose:** AI-generated marketing materials
- **Access:** Public (everyone can view)
- **Size Limit:** No limit
- **Folders:**
  - `ai-generated/` - AI flyers, ads, images
- **Setup:** Run `sql/setup-ai-image-storage.sql`

## ⚙️ Setup Instructions

### Step 1: Check Current Status
```sql
-- Run in Supabase SQL Editor
\i sql/check-storage-setup.sql
```

This will show:
- ✅ Which buckets exist
- 🔒 Which policies are configured
- ⚡ What actions are needed

### Step 2: Create Avatars Bucket (if needed)
```sql
-- Run in Supabase SQL Editor
\i sql/setup-avatar-storage.sql
```

Creates:
- `avatars` bucket with 10MB limit
- RLS policies for avatar uploads
- Public read access

### Step 3: Create Event Images Bucket (if needed)
```sql
-- Run in Supabase SQL Editor
\i sql/setup-ai-image-storage.sql
```

Creates:
- `event-images` bucket (public)
- RLS policies for AI image uploads
- Authenticated user write access

### Step 4: Add Banner Support (if needed)
```sql
-- Run in Supabase SQL Editor
\i sql/fix-storage-for-banners.sql
```

Adds:
- Banner-specific RLS policies
- Increases size limit to 10MB
- Separate policies for `banners/` folder

## 🔍 Verification

After setup, verify everything works:

```sql
-- Check buckets
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id IN ('avatars', 'event-images');

-- Should return:
-- avatars       | avatars       | true | 10485760
-- event-images  | event-images  | true | NULL
```

```sql
-- Check policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'storage' 
ORDER BY policyname;

-- Should include:
-- ✅ Users can upload their own avatar (INSERT)
-- ✅ Users can upload their own banner (INSERT)
-- ✅ Authenticated users can upload event images (INSERT)
-- ✅ Anyone can view avatars (SELECT)
-- ✅ Anyone can view banners (SELECT)
-- ✅ Public Access to event images (SELECT)
```

## 🎯 How It Works

### Avatar Upload Flow
1. User selects image in UserProfile.tsx
2. `handleAvatarUpload()` validates file (max 10MB)
3. `compressAndResizeImage()` resizes to 800×800px
4. Compresses to ~500KB JPEG
5. `uploadAvatar()` uploads to `avatars/{userId}-{timestamp}.jpg`
6. Returns public URL
7. Updates user profile

### Banner Upload Flow
1. User selects banner in UserProfile.tsx
2. `handleBannerUpload()` validates file (max 10MB)
3. `compressAndResizeBanner()` resizes to 1200×400px
4. Compresses to ~800KB JPEG
5. `uploadBanner()` uploads to `banners/{userId}-banner-{timestamp}.jpg`
6. Returns public URL
7. Updates user branding

### AI Image Upload Flow
1. Enterprise user requests AI image
2. `generateAdImage()` calls Gemini API
3. Receives base64 PNG from Gemini
4. Converts to Blob
5. Uploads to `ai-generated/{timestamp}-{random}.png`
6. Returns permanent public URL
7. Used in Success Manager chat

## 🔐 Security

All uploads are protected by RLS policies:

- ✅ **Avatars:** Users can only upload/update/delete their own
- ✅ **Banners:** Users can only upload/update/delete their own
- ✅ **AI Images:** Only authenticated users can upload
- ✅ **Public Read:** Everyone can view all images (public buckets)

User ID verification:
- Avatar path: `avatars/{userId}-timestamp.jpg`
- Banner path: `banners/{userId}-banner-timestamp.jpg`
- RLS checks: `auth.uid()::text = (string_to_array(...))[1]`

## 🐛 Troubleshooting

### "Failed to upload avatar"
1. Check bucket exists: `SELECT * FROM storage.buckets WHERE id = 'avatars';`
2. Run setup: `sql/setup-avatar-storage.sql`
3. Check user is authenticated: `SELECT auth.uid();`

### "Failed to upload banner"
1. Check banner policies exist: `sql/check-storage-setup.sql`
2. Run fix: `sql/fix-storage-for-banners.sql`
3. Verify 10MB limit: `SELECT file_size_limit FROM storage.buckets WHERE id = 'avatars';`

### "AI image not working"
1. Check event-images bucket: `SELECT * FROM storage.buckets WHERE id = 'event-images';`
2. Run setup: `sql/setup-ai-image-storage.sql`
3. Check Gemini API key: `process.env.GEMINI_API_KEY`

### Images not displaying
1. Check bucket is public: `SELECT public FROM storage.buckets WHERE id = 'avatars';`
2. Check RLS policies allow SELECT: `sql/check-storage-setup.sql`
3. Verify public URL format: `https://.../storage/v1/object/public/...`

## 📝 File Limits

| Type | Max Upload | After Compression | Dimensions |
|------|-----------|------------------|------------|
| Avatar | 10MB | ~500KB | 800×800px |
| Banner | 10MB | ~800KB | 1200×400px |
| AI Image | - | Variable | 1024×1024px |

Compression is automatic - users don't need to manually resize images!

## 🚀 Quick Start Checklist

- [ ] Run `sql/setup-avatar-storage.sql` in Supabase
- [ ] Run `sql/setup-ai-image-storage.sql` in Supabase
- [ ] Run `sql/fix-storage-for-banners.sql` in Supabase
- [ ] Run `sql/check-storage-setup.sql` to verify
- [ ] Test avatar upload in UserProfile
- [ ] Test banner upload in UserProfile
- [ ] Test AI image generation in Enterprise Success Manager
- [ ] Confirm all images display correctly

## 📖 Related Files

- `services/dbService.ts` - `uploadAvatar()`, `uploadBanner()`
- `services/geminiService.ts` - AI image upload
- `components/UserProfile.tsx` - Avatar & banner upload UI
- `components/EnterpriseSuccessManager.tsx` - AI image generation
- `sql/check-storage-setup.sql` - Verification script
- `sql/fix-storage-for-banners.sql` - Banner policies fix
