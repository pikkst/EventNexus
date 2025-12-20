# User Profile Features Guide

Comprehensive guide to user profile functionality in EventNexus.

## 🎯 Overview

The user profile system provides complete account management including avatar uploads, subscription management, ticket viewing, and profile editing.

## ✨ Implemented Features

### 1. Avatar Upload System

**Functionality:**
- Upload profile pictures directly from profile page
- Automatic image processing and storage
- Real-time preview after upload
- Secure storage with public read access

**How to Use:**
1. Navigate to profile page (`/profile`)
2. Click "Edit Profile" button
3. Click on avatar image
4. Select image file from computer
5. Image uploads and saves automatically

**Technical Details:**
- **Storage**: Supabase Storage bucket named `avatars`
- **File Types**: JPG, PNG, WebP, GIF
- **Max Size**: 5MB per file
- **Path Structure**: `avatars/{user_id}/{filename}`
- **Access**: Public read, user-only write

**Validation:**
- File type checking (images only)
- Size limit enforcement (5MB max)
- Upload progress indicator
- Error handling with user feedback

### 2. Real Ticket System

**Features:**
- Display actual tickets from database
- No mock or test data
- Empty state when no tickets
- Detailed ticket information

**Displayed Information:**
- Event name and category
- Event date and time
- Event location (address)
- Ticket purchase date
- QR code for validation

**Data Source:**
```typescript
// Fetches real tickets from database
const tickets = await getUserTickets(user.id);
```

### 3. Subscription Management

**Free Tier Features:**
- Display current subscription tier
- Show tier benefits and limits
- "Upgrade Plan" button for free users
- Navigation to pricing page

**Upgrade Flow:**
1. User on Free tier sees "Upgrade Plan" button
2. Click navigates to `/pricing` page
3. User selects desired subscription tier
4. Stripe payment processing initiated
5. Subscription activated upon payment

**Tier Display:**
- Current tier badge
- Features included in tier
- Usage statistics
- Upgrade/manage options

### 4. Profile Editing

**Editable Fields:**
- Display name
- Email address (requires verification)
- Bio/description
- Avatar image
- Location
- Social links (if implemented)

**Save Mechanism:**
```typescript
await updateUser(user.id, updatedData);
```

## 🔧 Technical Implementation

### Modified Files

#### 1. `components/UserProfile.tsx`

**Avatar Upload:**
```typescript
const handleAvatarUpload = async (file: File) => {
  // Validate file type and size
  if (!file.type.startsWith('image/')) {
    setError('Please upload an image file');
    return;
  }
  
  if (file.size > 5 * 1024 * 1024) {
    setError('File size must be less than 5MB');
    return;
  }
  
  // Upload to Supabase Storage
  const avatarUrl = await uploadAvatar(user.id, file);
  
  // Update user profile
  await updateUser(user.id, { avatar_url: avatarUrl });
};
```

**Ticket Loading:**
```typescript
useEffect(() => {
  const loadTickets = async () => {
    const userTickets = await getUserTickets(user.id);
    setTickets(userTickets);
  };
  loadTickets();
}, [user.id]);
```

#### 2. `services/dbService.ts`

**Avatar Upload Function:**
```typescript
export async function uploadAvatar(userId: string, file: File): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        upsert: true,
        contentType: file.type
      });
    
    if (uploadError) throw uploadError;
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);
    
    return publicUrl;
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return null;
  }
}
```

**Get User Tickets:**
```typescript
export async function getUserTickets(userId: string): Promise<Ticket[]> {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        event:events(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return [];
  }
}
```

## ⚙️ Database Setup

### Storage Bucket Configuration

Create the `avatars` storage bucket in Supabase:

```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to update their own avatars
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow anyone to view avatars
CREATE POLICY "Public avatar access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### Run Setup Script

Execute in Supabase SQL Editor:
```bash
\i sql/setup-avatar-storage.sql
```

Or manually:
1. Open Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and execute the SQL from `setup-avatar-storage.sql`
4. Verify in Storage → Buckets that `avatars` exists

## 🧪 Testing Guide

### Test Avatar Upload

1. Login as test user
2. Navigate to `/profile`
3. Click "Edit Profile"
4. Click avatar image
5. Select test image file
6. Verify upload progress indicator
7. Confirm avatar updates in UI
8. Check Supabase Storage for uploaded file

### Test Ticket Display

1. Create test event
2. Purchase ticket for event
3. Navigate to `/profile`
4. Verify ticket appears in "My Tickets" section
5. Check ticket details match event data
6. Test empty state (delete all tickets)

### Test Upgrade Flow

1. Login as Free tier user
2. Navigate to `/profile`
3. Locate "Nexus Pro" card
4. Click "Upgrade Plan" button
5. Verify navigation to `/pricing`
6. Select subscription tier
7. Complete test payment (Stripe test mode)
8. Verify subscription updates in profile

## 🔒 Security Features

### Avatar Upload Security
- ✅ File type validation (images only)
- ✅ File size limit (5MB max)
- ✅ User can only upload own avatar
- ✅ Public read access for display
- ✅ Secure path structure with user ID

### Data Access Security
- ✅ RLS policies protect user data
- ✅ Users only see own tickets
- ✅ Users only update own profile
- ✅ Admin override via service role
- ✅ JWT authentication required

### Storage Policies
- ✅ Folder-based isolation (`avatars/{user_id}/`)
- ✅ Authenticated upload only
- ✅ Public read for avatar display
- ✅ User-scoped update/delete

## 🐛 Troubleshooting

### Avatar Upload Fails

**Symptoms:**
- Upload button doesn't work
- Error message displayed
- Image doesn't appear

**Solutions:**
1. Check Supabase Storage bucket exists
2. Verify storage policies are set
3. Confirm file size under 5MB
4. Test with different image format
5. Check browser console for errors
6. Verify user authentication

### Tickets Not Displaying

**Symptoms:**
- Empty tickets section
- Loading indefinitely
- Error message

**Solutions:**
1. Verify user has purchased tickets
2. Check `tickets` table in database
3. Confirm RLS policies allow read
4. Test with different user account
5. Check console for API errors

### Upgrade Button Not Working

**Symptoms:**
- Button doesn't navigate
- Stays on profile page
- No error message

**Solutions:**
1. Verify routing configuration
2. Check if `/pricing` route exists
3. Test navigation manually
4. Clear browser cache
5. Check console for routing errors

### Profile Changes Not Saving

**Symptoms:**
- Edit form submits but data unchanged
- Page reloads without update
- Error message on save

**Solutions:**
1. Check database connection
2. Verify RLS policies allow update
3. Confirm user is authenticated
4. Test with simpler field update
5. Check console for API errors
6. Verify `updateUser` function works

## 📝 Future Enhancements

### Planned Features
- 📋 Social media link integration
- 📋 Email notification preferences
- 📋 Two-factor authentication
- 📋 Account deletion workflow
- 📋 Export personal data (GDPR)
- 📋 Activity history timeline
- 📋 Badge and achievement system

### UI Improvements
- 📋 Drag-and-drop avatar upload
- 📋 Image cropping tool
- 📋 Avatar preview before upload
- 📋 Profile completion percentage
- 📋 Quick edit inline forms

## 🔗 Related Documentation

- [EMAIL_VERIFICATION_SETUP.md](EMAIL_VERIFICATION_SETUP.md) - Email setup
- [STRIPE_SETUP.md](STRIPE_SETUP.md) - Payment integration
- [DEPLOYMENT.md](DEPLOYMENT.md) - Full deployment guide
- [SUPABASE_AUTH_CONFIG.md](SUPABASE_AUTH_CONFIG.md) - Auth configuration

## 📞 Support

For issues or questions:
- **Email**: huntersest@gmail.com
- **File Issues**: GitHub repository
- **Check Logs**: Browser console and Supabase logs

---

**Status:** ✅ Fully Implemented  
**Last Updated:** December 2024  
**Language:** English Only
