# Enterprise Media Upload System - Implementation Guide

## Overview
Complete file upload system for Enterprise tier with storage buckets, RLS policies, Edge Functions, and client-side utilities. Supports images, videos, and logos with automatic compression, validation, and quota management.

## Architecture

### Components
1. **Storage Buckets**: Supabase Storage buckets with RLS policies
2. **Edge Functions**: Serverless upload handlers with validation
3. **Database Functions**: Storage quota and usage tracking
4. **Client Services**: Upload functions in `dbService.ts`
5. **Utilities**: Compression and validation in `storageUtils.ts`

### Storage Buckets

| Bucket | Purpose | Max Size | Tier | File Types |
|--------|---------|----------|------|------------|
| `enterprise-media` | Hero videos, agency reels | 500 MB | Enterprise | Images, Videos |
| `event-highlights` | Event showcase media | 500 MB | Pro+ | Images, Videos |
| `team-avatars` | Team member photos | 10 MB | Premium+ | Images |
| `partner-logos` | Partner/sponsor logos | 5 MB | Premium+ | Images, SVG |
| `media-logos` | Press outlet logos | 5 MB | Enterprise | Images, SVG |
| `testimonial-avatars` | Customer photos | 5 MB | Premium+ | Images |

### Storage Quotas by Tier

| Tier | Total Quota | Buckets Access |
|------|-------------|----------------|
| Free | 100 MB | None (profile avatars only) |
| Pro | 1 GB | event-highlights |
| Premium | 10 GB | event-highlights, team-avatars, partner-logos, testimonial-avatars |
| Enterprise | 50 GB | All buckets |

## Installation & Setup

### Step 1: Run SQL Migration

Copy and run the SQL migration in Supabase SQL Editor:

```bash
# Location: supabase/migrations/20241227_enterprise_media_storage.sql
```

This creates:
- Storage buckets with file size limits and MIME type restrictions
- RLS policies for tier-based access control
- Database functions for quota management
- Media tracking table for analytics

**Important SQL Functions:**
- `get_user_storage_quota(user_id)` - Returns quota in bytes
- `get_user_storage_usage(user_id)` - Returns current usage
- `can_user_upload(user_id, file_size)` - Checks if upload allowed

### Step 2: Deploy Edge Functions

```bash
# Make script executable
chmod +x scripts/deploy-media-functions.sh

# Deploy both Edge Functions
./scripts/deploy-media-functions.sh
```

Or manually:
```bash
# Deploy single upload function
supabase functions deploy upload-media --project-ref anlivujgkjmajkcgbaxw

# Deploy batch upload function
supabase functions deploy upload-media-batch --project-ref anlivujgkjmajkcgbaxw
```

### Step 3: Verify Deployment

Check in Supabase Dashboard:
1. **Storage** → Verify 6 buckets created
2. **Database** → Check `media_uploads` table exists
3. **Edge Functions** → Confirm both functions deployed
4. **SQL Editor** → Test quota functions:

```sql
-- Test quota function
SELECT get_user_storage_quota('user-id-here');

-- Test usage function
SELECT get_user_storage_usage('user-id-here');

-- Test upload check
SELECT can_user_upload('user-id-here', 10485760); -- 10 MB
```

## Client-Side Usage

### Import Functions

```typescript
import {
  uploadEnterpriseMedia,
  uploadEventHighlight,
  uploadTeamAvatar,
  uploadPartnerLogo,
  uploadMediaLogo,
  uploadTestimonialAvatar,
  uploadMediaBatch,
  getUserStorageInfo,
  getUserMediaUploads,
  deleteMediaFile
} from '@/services/dbService';

import {
  validateFile,
  compressImage,
  generateThumbnail,
  getVideoThumbnail,
  formatBytes,
  getStoragePercentage
} from '@/services/storageUtils';
```

### Upload Examples

#### Single File Upload

```typescript
// Upload enterprise media (hero video/image)
const handleHeroUpload = async (file: File) => {
  // Validate file
  const validation = validateFile(file, 'enterprise-media');
  if (!validation.valid) {
    alert(validation.error);
    return;
  }

  // Compress if image
  const processedFile = file.type.startsWith('image/') 
    ? await compressImage(file, 1920, 1080, 0.9)
    : file;

  // Upload
  const url = await uploadEnterpriseMedia(user.id, processedFile, 'hero');
  
  if (url) {
    // Update user branding
    onUpdateUser({
      branding: {
        ...user.branding,
        pageConfig: {
          ...user.branding?.pageConfig,
          heroMedia: url,
          heroType: file.type.startsWith('video/') ? 'video' : 'image'
        }
      }
    });
  }
};
```

#### Event Highlight with Thumbnail

```typescript
const handleEventHighlight = async (file: File, eventId: string) => {
  // Upload main file
  const url = await uploadEventHighlight(user.id, file, eventId);
  
  if (!url) return;

  // Generate thumbnail
  const thumbnail = file.type.startsWith('video/')
    ? await getVideoThumbnail(file, 1)
    : await generateThumbnail(file, 400);

  // Update branding
  const highlights = user.branding?.eventHighlights || [];
  highlights.push({
    id: Date.now().toString(),
    eventId,
    title: 'New Highlight',
    description: '',
    imageUrl: file.type.startsWith('image/') ? url : thumbnail,
    videoUrl: file.type.startsWith('video/') ? url : undefined,
    stats: { attendance: 0, rating: 0 },
    date: new Date().toISOString()
  });

  onUpdateUser({
    branding: { ...user.branding, eventHighlights: highlights }
  });
};
```

#### Batch Upload (Multiple Logos)

```typescript
const handlePartnerLogosUpload = async (files: File[]) => {
  // Validate all files
  const validFiles = files.filter(file => {
    const validation = validateFile(file, 'partner-logos');
    return validation.valid;
  });

  if (validFiles.length === 0) {
    alert('No valid files to upload');
    return;
  }

  // Upload batch
  const results = await uploadMediaBatch(
    user.id,
    validFiles,
    'partner-logos',
    'partner'
  );

  // Process results
  const partners = user.branding?.partners || [];
  
  results.forEach(result => {
    if (result.success) {
      partners.push({
        id: Date.now().toString(),
        name: result.fileName,
        logo: result.url,
        website: '',
        description: ''
      });
    }
  });

  onUpdateUser({
    branding: { ...user.branding, partners }
  });
};
```

### Storage Management

#### Display Storage Info

```typescript
const StorageIndicator = ({ userId }: { userId: string }) => {
  const [storageInfo, setStorageInfo] = useState(null);

  useEffect(() => {
    const loadStorage = async () => {
      const info = await getUserStorageInfo(userId);
      setStorageInfo(info);
    };
    loadStorage();
  }, [userId]);

  if (!storageInfo) return null;

  const percentage = getStoragePercentage(storageInfo.used, storageInfo.quota);

  return (
    <div className="storage-indicator">
      <div className="flex justify-between mb-2">
        <span>Storage Used</span>
        <span>{formatBytes(storageInfo.used)} / {formatBytes(storageInfo.quota)}</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all ${
            percentage > 90 ? 'bg-red-500' : 
            percentage > 75 ? 'bg-yellow-500' : 'bg-indigo-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
```

#### Media Gallery with Delete

```typescript
const MediaGallery = ({ userId, bucket }: { userId: string, bucket: string }) => {
  const [media, setMedia] = useState([]);

  const loadMedia = async () => {
    const files = await getUserMediaUploads(userId, { bucket });
    setMedia(files);
  };

  const handleDelete = async (filePath: string) => {
    const success = await deleteMediaFile(userId, filePath, bucket);
    if (success) {
      loadMedia(); // Refresh
    }
  };

  useEffect(() => {
    loadMedia();
  }, [userId, bucket]);

  return (
    <div className="grid grid-cols-3 gap-4">
      {media.map(file => (
        <div key={file.id} className="relative group">
          <img src={file.public_url} className="w-full h-40 object-cover rounded-lg" />
          <button 
            onClick={() => handleDelete(file.file_path)}
            className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100"
          >
            Delete
          </button>
          <div className="text-xs text-slate-400 mt-1">
            {formatBytes(file.file_size)}
          </div>
        </div>
      ))}
    </div>
  );
};
```

## File Validation & Compression

### Automatic Compression

Images are automatically compressed before upload:

```typescript
const preset = getCompressionPreset('team-avatars');
// { maxWidth: 400, maxHeight: 400, quality: 0.85 }

const compressed = await compressImage(file, preset.maxWidth, preset.maxHeight, preset.quality);
```

### Pre-Upload Validation

```typescript
const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  // Validate
  const validation = validateFile(file, 'enterprise-media');
  if (!validation.valid) {
    alert(validation.error);
    return;
  }

  // Check quota
  const canUpload = hasEnoughQuota(currentUsage, file.size, quota);
  if (!canUpload) {
    alert('Storage quota exceeded. Please upgrade your plan.');
    return;
  }

  // Proceed with upload
  handleUpload(file);
};
```

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Storage quota exceeded" | User reached tier limit | Upgrade subscription or delete old files |
| "Subscription tier cannot upload" | User accessing restricted bucket | Check tier permissions |
| "File size exceeds limit" | File too large for bucket | Compress or reduce file size |
| "MIME type not allowed" | Wrong file format | Convert to allowed format |
| "No authorization header" | Missing auth token | Ensure user is logged in |

### Error Handling Pattern

```typescript
try {
  const url = await uploadEnterpriseMedia(userId, file, 'hero');
  if (!url) {
    throw new Error('Upload failed');
  }
  // Success handling
} catch (error) {
  console.error('Upload error:', error);
  
  if (error.message.includes('quota exceeded')) {
    // Show upgrade prompt
    setShowUpgradeModal(true);
  } else if (error.message.includes('not allowed')) {
    // Show tier restriction message
    alert('This feature requires an Enterprise subscription');
  } else {
    // Generic error
    alert('Upload failed. Please try again.');
  }
}
```

## Security & Permissions

### RLS Policies

All storage buckets have Row Level Security enabled:

1. **Upload**: Users can only upload to their own folder (`{user_id}/filename`)
2. **Read**: All uploads are publicly readable (for display on profile pages)
3. **Update/Delete**: Users can only modify their own files
4. **Tier Check**: Upload checks subscription tier before allowing

### File Path Structure

```
bucket-name/
  ├── user-id-1/
  │   ├── 1703701234567-abc123.jpg
  │   ├── 1703701234568-def456.mp4
  │   └── ...
  ├── user-id-2/
  │   └── ...
```

### Best Practices

1. **Always validate** before upload (client-side)
2. **Compress images** to save quota
3. **Show progress** for large files
4. **Handle errors** gracefully
5. **Clean up** unused files periodically
6. **Track usage** to warn users before quota exceeded
7. **Use thumbnails** for previews instead of full files

## Testing

### Test Upload Function

```typescript
// Test in browser console
const testUpload = async () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*,video/*';
  
  input.onchange = async (e) => {
    const file = e.target.files[0];
    console.log('Testing upload:', file.name);
    
    const url = await uploadEnterpriseMedia('user-id', file, 'test');
    console.log('Upload result:', url);
  };
  
  input.click();
};
```

### Verify in Supabase

1. **Storage** → Check files appear in bucket
2. **Database** → Query `media_uploads` table
3. **Edge Functions** → Check logs for errors

```sql
-- Check recent uploads
SELECT * FROM media_uploads 
WHERE user_id = 'user-id-here' 
ORDER BY uploaded_at DESC 
LIMIT 10;

-- Check storage usage
SELECT 
  user_id,
  bucket_id,
  COUNT(*) as file_count,
  SUM(file_size) as total_size
FROM media_uploads
GROUP BY user_id, bucket_id;
```

## Performance Optimization

### Tips for Large Files

1. **Compress before upload**: Use `compressImage()` for images
2. **Show progress**: Implement upload progress indicator
3. **Batch small files**: Use `uploadMediaBatch()` for multiple small files
4. **Chunk large videos**: Consider chunked upload for files >100MB
5. **Use WebP**: Convert to WebP format for better compression

### Recommended Settings

```typescript
// High-quality hero images
compressImage(file, 1920, 1080, 0.9);

// Team avatars (small, circular)
compressImage(file, 400, 400, 0.85);

// Partner logos (keep sharp)
compressImage(file, 800, 800, 0.95);

// Thumbnails (fast loading)
generateThumbnail(file, 200);
```

## Monitoring & Analytics

The `media_uploads` table tracks:
- Upload timestamps
- File sizes and types
- User attribution
- Purpose/context
- Processing status

Query for insights:

```sql
-- Storage by user
SELECT 
  u.email,
  u.subscription_tier,
  COUNT(m.id) as files,
  SUM(m.file_size) as total_bytes,
  ROUND(SUM(m.file_size)::numeric / 1024 / 1024, 2) as total_mb
FROM users u
LEFT JOIN media_uploads m ON m.user_id = u.id
GROUP BY u.id, u.email, u.subscription_tier
ORDER BY total_bytes DESC;

-- Popular buckets
SELECT 
  bucket_id,
  COUNT(*) as files,
  SUM(file_size) as total_bytes
FROM media_uploads
GROUP BY bucket_id;

-- Recent activity
SELECT 
  u.email,
  m.bucket_id,
  m.file_name,
  m.file_size,
  m.uploaded_at
FROM media_uploads m
JOIN users u ON u.id = m.user_id
WHERE m.uploaded_at > NOW() - INTERVAL '24 hours'
ORDER BY m.uploaded_at DESC;
```

## Troubleshooting

### Edge Function Not Working

```bash
# Check function logs
supabase functions logs upload-media --project-ref anlivujgkjmajkcgbaxw

# Redeploy
supabase functions deploy upload-media --project-ref anlivujgkjmajkcgbaxw --no-verify-jwt
```

### Storage Bucket Not Found

```sql
-- Check if buckets exist
SELECT * FROM storage.buckets;

-- Recreate if missing (re-run migration)
```

### RLS Policy Blocking Upload

```sql
-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'objects';

-- Temporarily disable for testing (NOT IN PRODUCTION)
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Re-enable after testing
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

### Quota Function Not Working

```sql
-- Test directly
SELECT can_user_upload('user-id', 10485760);

-- Check if functions exist
SELECT * FROM pg_proc WHERE proname LIKE '%storage%';
```

## Migration from Existing System

If you have existing uploads in the `avatars` bucket:

```sql
-- Copy existing data to new structure
INSERT INTO media_uploads (
  user_id, bucket_id, file_path, file_name, 
  file_size, mime_type, media_type, uploaded_at, public_url
)
SELECT 
  (storage.foldername(name))[1]::uuid as user_id,
  bucket_id,
  name as file_path,
  (storage.filename(name)) as file_name,
  size as file_size,
  'image/jpeg' as mime_type,
  'image' as media_type,
  created_at as uploaded_at,
  CONCAT('https://anlivujgkjmajkcgbaxw.supabase.co/storage/v1/object/public/', bucket_id, '/', name) as public_url
FROM storage.objects
WHERE bucket_id = 'avatars';
```

## Support

For issues or questions:
- Email: support@mail.eventnexus.eu
- GitHub Issues: EventNexus repository
- Supabase Support: https://supabase.com/support

---

**Last Updated**: December 27, 2024
**Version**: 1.0
**Status**: Production Ready ✅
