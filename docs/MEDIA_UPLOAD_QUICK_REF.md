# Media Upload System - Quick Reference

## 🚀 Quick Start

### 1. Deploy (One-Time Setup)
```bash
# Run SQL migration in Supabase SQL Editor
# File: supabase/migrations/20241227_enterprise_media_storage.sql

# Deploy Edge Functions
./scripts/deploy-media-functions.sh
```

### 2. Import & Use
```typescript
import { uploadEnterpriseMedia, getUserStorageInfo } from '@/services/dbService';
import { validateFile, compressImage, formatBytes } from '@/services/storageUtils';
```

## 📦 Storage Buckets

| Bucket | Tier | Max Size | Types |
|--------|------|----------|-------|
| `enterprise-media` | Enterprise | 500MB | Images, Videos |
| `event-highlights` | Pro+ | 500MB | Images, Videos |
| `team-avatars` | Premium+ | 10MB | Images |
| `partner-logos` | Premium+ | 5MB | Images, SVG |
| `media-logos` | Enterprise | 5MB | Images, SVG |
| `testimonial-avatars` | Premium+ | 5MB | Images |

## 💾 Storage Quotas

- **Free**: 100 MB
- **Pro**: 1 GB
- **Premium**: 10 GB
- **Enterprise**: 50 GB

## 🔧 Upload Functions

```typescript
// Single uploads
uploadEnterpriseMedia(userId, file, purpose?)
uploadEventHighlight(userId, file, eventId?)
uploadTeamAvatar(userId, file, memberId?)
uploadPartnerLogo(userId, file, partnerId?)
uploadMediaLogo(userId, file, outletName?)
uploadTestimonialAvatar(userId, file, testimonialId?)

// Batch upload
uploadMediaBatch(userId, files[], bucket, purpose?)

// Storage management
getUserStorageInfo(userId) // Returns { used, quota, percentage }
getUserMediaUploads(userId, filters?) // Get upload history
deleteMediaFile(userId, filePath, bucket) // Delete file
```

## 🛠️ Utility Functions

```typescript
// Validation
validateFile(file, bucket) // Returns { valid, error? }

// Compression
compressImage(file, maxWidth, maxHeight, quality)
getCompressionPreset(bucket) // Get recommended settings

// Thumbnails
generateThumbnail(file, size)
getVideoThumbnail(file, timeInSeconds)

// Formatting
formatBytes(bytes) // "1.5 MB"
getStoragePercentage(used, quota) // 75
```

## 📝 Common Patterns

### Upload with Validation & Compression
```typescript
const handleUpload = async (file: File) => {
  // Validate
  const validation = validateFile(file, 'enterprise-media');
  if (!validation.valid) {
    alert(validation.error);
    return;
  }

  // Compress if image
  const processed = file.type.startsWith('image/')
    ? await compressImage(file, 1920, 1080, 0.9)
    : file;

  // Upload
  const url = await uploadEnterpriseMedia(user.id, processed, 'hero');
  
  if (url) {
    // Update state
    console.log('Uploaded:', url);
  }
};
```

### Storage Indicator
```typescript
const { used, quota, percentage } = await getUserStorageInfo(userId);

<div>
  <p>{formatBytes(used)} / {formatBytes(quota)}</p>
  <div className="progress-bar" style={{ width: `${percentage}%` }} />
</div>
```

### File Input with Preview
```typescript
const [preview, setPreview] = useState<string | null>(null);

const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  // Show preview
  setPreview(createPreviewUrl(file));
  
  // Upload
  const url = await uploadEnterpriseMedia(user.id, file);
  
  // Clean up preview
  if (preview) revokePreviewUrl(preview);
};
```

## 🔐 Permissions

```typescript
// Tier permissions
const tierBuckets = {
  free: [],
  pro: ['event-highlights'],
  premium: ['event-highlights', 'team-avatars', 'partner-logos', 'testimonial-avatars'],
  enterprise: ['enterprise-media', 'event-highlights', 'team-avatars', 'partner-logos', 'media-logos', 'testimonial-avatars']
};
```

## 🐛 Error Handling

```typescript
try {
  const url = await uploadEnterpriseMedia(userId, file);
  if (!url) throw new Error('Upload failed');
} catch (error) {
  if (error.message.includes('quota exceeded')) {
    // Show upgrade modal
  } else if (error.message.includes('not allowed')) {
    // Show tier restriction
  } else {
    // Generic error
    alert('Upload failed');
  }
}
```

## 📊 Compression Presets

```typescript
// Recommended settings by bucket
COMPRESSION_PRESETS = {
  'enterprise-media': { maxWidth: 1920, maxHeight: 1080, quality: 0.9 },
  'event-highlights': { maxWidth: 1920, maxHeight: 1080, quality: 0.85 },
  'team-avatars': { maxWidth: 400, maxHeight: 400, quality: 0.85 },
  'partner-logos': { maxWidth: 800, maxHeight: 800, quality: 0.9 },
}
```

## 🔍 Database Queries

```sql
-- Check user storage
SELECT get_user_storage_usage('user-id');
SELECT get_user_storage_quota('user-id');

-- Recent uploads
SELECT * FROM media_uploads 
WHERE user_id = 'user-id' 
ORDER BY uploaded_at DESC LIMIT 10;

-- Storage by bucket
SELECT bucket_id, COUNT(*), SUM(file_size) 
FROM media_uploads 
GROUP BY bucket_id;
```

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| "Storage quota exceeded" | Upgrade tier or delete old files |
| "Tier cannot upload" | User needs higher subscription |
| "File too large" | Compress or reduce size |
| "MIME type not allowed" | Check bucket allowed types |
| Edge function error | Check deployment and logs |

## 📞 Support

- Docs: `/docs/MEDIA_UPLOAD_GUIDE.md`
- Email: support@mail.eventnexus.eu
- Logs: `supabase functions logs upload-media`

---

**Quick Deploy Command:**
```bash
./scripts/deploy-media-functions.sh
```

**Test Upload:**
```typescript
const url = await uploadEnterpriseMedia(user.id, file, 'test');
console.log('Uploaded to:', url);
```
