# Event Memories Storage Bucket Setup Guide

## ⚠️ IMPORTANT: IGNORE THE SQL FILE!

**`event-memories-storage.sql` CANNOT be run in SQL Editor!**

```
ERROR: 42501: must be owner of relation objects
```

This error occurs because `storage.objects` table is owned by the Supabase service role, not the postgres user. You **cannot** create storage policies via SQL Editor like regular RLS policies.

### ✅ If you already created the bucket via Dashboard → YOU'RE DONE!

**The SQL file is obsolete. Delete it or ignore it. Only use Supabase Dashboard for storage setup.**

## ✅ Correct Setup Method: Supabase Dashboard

### Step 1: Create Storage Bucket (via Dashboard)

1. Go to **Supabase Dashboard**
2. Navigate to **Storage** (left sidebar)
3. Click **"New bucket"**
4. Configure:
   ```
   Name: event-memories
   Public bucket: ✅ YES (check the box)
   File size limit: 10485760 (10 MB)
   Allowed MIME types: 
     - image/jpeg
     - image/png
     - image/gif
     - image/webp
     - image/heic
     - video/mp4
     - video/quicktime
     - video/webm
   ```
5. Click **"Create bucket"**

### Step 2: Configure Storage Policies (via Dashboard)

After bucket is created, click on the bucket name → **Policies** tab:

#### Policy 1: Public Read
```
Policy name: Public memories are viewable by anyone
Allowed operation: SELECT
Target roles: public
USING expression: (bucket_id = 'event-memories')
```
Click **"Review"** → **"Save policy"**

#### Policy 2: Authenticated Upload
```
Policy name: Users can upload their own memories
Allowed operation: INSERT
Target roles: authenticated
WITH CHECK expression:
  bucket_id = 'event-memories' 
  AND (storage.foldername(name))[1] = auth.uid()::text
```
Click **"Review"** → **"Save policy"**

#### Policy 3: Update Own Files
```
Policy name: Users can update their own memories
Allowed operation: UPDATE
Target roles: authenticated
USING expression:
  bucket_id = 'event-memories' 
  AND (storage.foldername(name))[1] = auth.uid()::text
```
Click **"Review"** → **"Save policy"**

#### Policy 4: Delete Own Files
```
Policy name: Users can delete their own memories
Allowed operation: DELETE
Target roles: authenticated
USING expression:
  bucket_id = 'event-memories' 
  AND (storage.foldername(name))[1] = auth.uid()::text
```
Click **"Review"** → **"Save policy"**

---

## 🚀 Quick Setup (Alternative: Dashboard Only)

If you prefer the simplest method:

1. **Storage** → **New bucket** → Name: `event-memories`
2. ✅ Check **"Public bucket"**
3. Set **File size limit**: `10485760`
4. Add allowed MIME types (list above)
5. **Create bucket**
6. Bucket is ready! (Public buckets allow read by default)

For user upload restrictions:
- Click bucket → **Policies** → **New policy**
- Use the policy templates above

---

## 🧪 Verification

After setup, test in browser console:

```javascript
// Test 1: Check bucket exists
const { data: buckets } = await supabase.storage.listBuckets();
console.log('Buckets:', buckets);
// Should see: [{ id: 'event-memories', name: 'event-memories', public: true }]

// Test 2: Upload test file
const file = new File(['test'], 'test.txt', { type: 'text/plain' });
const { data, error } = await supabase.storage
  .from('event-memories')
  .upload(`${userId}/test-event-id/test.txt`, file);
console.log('Upload result:', { data, error });

// Test 3: Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('event-memories')
  .getPublicUrl(`${userId}/test-event-id/test.txt`);
console.log('Public URL:', publicUrl);
// Should return: https://[project-ref].supabase.co/storage/v1/object/public/event-memories/...
```

---

## 📁 Folder Structure

Files will be organized as:
```
event-memories/
  └── {user_id}/
      └── {event_id}/
          ├── photo_1.jpg
          ├── photo_2.png
          └── video_1.mp4
```

Example:
```
550e8400-e29b-41d4-a716-446655440000/abc-123-event-id/sunset_photo.jpg
```

This structure ensures:
- ✅ Users can only upload to their own folders
- ✅ Easy to find all memories for an event
- ✅ Easy to delete all user's memories
- ✅ Unique filenames per user/event combo

---

## ✅ Success Criteria

After setup, verify:
- ✅ Bucket appears in Storage dashboard
- ✅ Public access enabled (green "Public" badge)
- ✅ File size limit shows 10 MB
- ✅ Policies show 4 entries (or default public read)
- ✅ Test upload works (see verification above)

---

## 🔧 Troubleshooting

### Error: "new row violates row-level security policy"
**Solution:** Check policy USING/WITH CHECK expressions. Ensure `auth.uid()` matches folder structure.

### Error: "Payload too large"
**Solution:** File exceeds 10MB limit. Client-side validation should prevent this.

### Error: "Invalid MIME type"
**Solution:** File type not in allowed list. Update bucket settings to add MIME type.

### Upload works but can't read file
**Solution:** Check public read policy exists. For public bucket, this should be automatic.

### Can't delete file
**Solution:** User may not own the file. Check folder name matches `auth.uid()`.

---

## 📝 Summary

**DO:**
✅ Create bucket via Supabase Dashboard  
✅ Enable public access  
✅ Set file size limit to 10MB  
✅ Add MIME types for images/videos  
✅ Create policies via Dashboard UI  

**DON'T:**
❌ Don't create storage policies via SQL Editor  
❌ Don't skip MIME type restrictions  
❌ Don't make bucket private (breaks public viewing)  
❌ Don't forget to test upload after setup  

**Setup time:** 5-10 minutes via Dashboard  
**Status:** Storage bucket is the ONLY thing blocking Event Memories feature!
