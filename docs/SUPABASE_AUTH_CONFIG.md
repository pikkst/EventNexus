# Supabase Authentication Configuration

## GitHub Pages Deployment Setup

### Required GitHub Secrets
Add these secrets in your GitHub repository: **Settings → Secrets and variables → Actions**

1. **VITE_SUPABASE_URL**: `https://anlivujgkjmajkcgbaxw.supabase.co`
2. **VITE_SUPABASE_ANON_KEY**: Your Supabase anon/public key
3. **GEMINI_API_KEY**: Your Google Gemini API key

### Supabase Project Configuration

**IMPORTANT**: Configure these settings in your Supabase project dashboard:

#### 1. Authentication → URL Configuration
Add these URLs to **Site URL** and **Redirect URLs**:

- `http://localhost:3000` (for local development)
- `https://pikkst.github.io/EventNexus/` (for production)

Navigate to: **Project Settings → Authentication → URL Configuration**

#### 2. Email Templates
Ensure your email confirmation template redirects to:
```
{{ .SiteURL }}/#/profile
```

Or for GitHub Pages:
```
https://pikkst.github.io/EventNexus/#/profile
```

#### 3. Enable Email Confirmation
Navigate to: **Authentication → Providers → Email**

- ✅ Enable Email Confirmations
- Set confirmation redirect to: `https://pikkst.github.io/EventNexus/#/profile`

## Testing Authentication

### Local Development
1. Create `.env.local` in project root:
```env
VITE_SUPABASE_URL=https://anlivujgkjmajkcgbaxw.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
GEMINI_API_KEY=your_gemini_key_here
```

2. Run: `npm run dev`
3. Test login at `http://localhost:3000`

### Production (GitHub Pages)
1. Ensure GitHub secrets are configured (see above)
2. Push to `main` branch
3. Wait for GitHub Actions to build and deploy
4. Test at `https://pikkst.github.io/EventNexus/`

## Common Issues

### "Connection timeout" Error
- Check GitHub secrets are properly set
- Verify Supabase URL is accessible
- Check browser console for CORS errors

### "User profile not found" Error
- Email may not be confirmed
- Check Supabase SQL Editor: `SELECT * FROM auth.users;`
- Check user profile exists: `SELECT * FROM public.users;`

### Login Stuck/Infinite Loading
- Verify Supabase URL configuration
- Check GitHub Pages URL is added to Supabase allowed URLs
- Verify environment variables injected during build (check `dist/assets/index-*.js`)

### CORS Errors
Add your GitHub Pages URL to Supabase:
1. Go to **Project Settings → API**
2. Add `https://pikkst.github.io` to **CORS Allowed Origins**

## Debugging

### Check Environment Variables in Production
1. Open deployed site: `https://pikkst.github.io/EventNexus/`
2. Open browser console
3. Run: `console.log(import.meta.env)`
4. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are present

### Check Build Logs
1. Go to GitHub repository
2. Actions tab
3. Click latest workflow run
4. Check "Build" step output for errors

### Enable Console Logging
The `AuthModal.tsx` now includes detailed console logs:
- Authentication attempt
- User fetch
- Profile loading
- Error messages

Open browser DevTools → Console to see authentication flow.

## Admin Access

### Create Admin User
1. Register account normally
2. Run SQL in Supabase SQL Editor:
```sql
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

3. Log out and log back in
4. Access admin dashboard at `/admin`

---

**Last Updated**: 2025-12-19
**Environment**: Production (GitHub Pages)
**Supabase Project**: anlivujgkjmajkcgbaxw
