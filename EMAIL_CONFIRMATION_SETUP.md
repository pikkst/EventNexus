# Email Confirmation Setup

## Problem Fixed
Users were being redirected to a 404 page after confirming their email. This has been resolved.

## What Changed

### 1. Signup Flow
- Users now receive a confirmation email after registration
- They cannot log in until their email is confirmed
- Success message shows: "Registration successful! Please check your email to confirm your account before logging in."

### 2. Email Confirmation Redirect
- After clicking the email confirmation link, users are redirected to: `https://pikkst.github.io/EventNexus/#/profile`
- The auth state listener automatically logs them in and loads their profile

### 3. Login Protection
- Login now checks if email is confirmed
- Unconfirmed users see: "Please confirm your email address before logging in. Check your inbox for the confirmation link."

## Supabase Configuration Required

To complete the setup, configure the following in your Supabase dashboard:

### Email Templates
1. Go to: **Authentication → Email Templates**
2. Select **Confirm signup** template
3. Set the confirmation URL to: `https://pikkst.github.io/EventNexus/`

### Site URL Settings
1. Go to: **Authentication → URL Configuration**
2. Set **Site URL** to: `https://pikkst.github.io/EventNexus/`
3. Add to **Redirect URLs**:
   - `https://pikkst.github.io/EventNexus/`
   - `https://pikkst.github.io/EventNexus/#/profile`
   - `http://localhost:3000` (for local development)
   - `http://localhost:3000/#/profile` (for local development)

### Enable Email Confirmation
1. Go to: **Authentication → Providers → Email**
2. Ensure **Enable email confirmations** is checked
3. Save changes

## Testing

### Local Development
1. Start the dev server: `npm run dev`
2. Register a new account
3. Check your email for the confirmation link
4. Click the link - you should be redirected to `http://localhost:3000/#/profile`
5. You should be automatically logged in

### Production
1. Deploy to GitHub Pages
2. Register a new account
3. Check your email for the confirmation link
4. Click the link - you should be redirected to `https://pikkst.github.io/EventNexus/#/profile`
5. You should be automatically logged in

## How It Works

### Registration
```typescript
// User registers
signUpUser(email, password) → 
  - Creates auth user
  - Sends confirmation email with redirect URL
  - Shows success message
  - Switches to login mode after 5 seconds

// Database trigger automatically creates user profile in public.users table
```

### Email Confirmation
```typescript
// User clicks email link
→ Redirected to app with auth token in URL
→ onAuthStateChange listener fires
→ User profile loaded from database
→ User automatically logged in
→ Redirected to profile page
```

### Login
```typescript
// User tries to login
signInUser(email, password) →
  - Checks credentials
  - Checks email_confirmed_at
  - If not confirmed: shows error message
  - If confirmed: logs user in
```

## Troubleshooting

### Users still seeing 404
1. Check Supabase **URL Configuration** has correct redirect URLs
2. Verify **Email Templates** have correct confirmation URL
3. Clear browser cache and cookies
4. Try in incognito/private window

### Email not sending
1. Check Supabase **Email Provider** settings
2. Verify email service is not blocked by spam filters
3. Check Supabase logs for email delivery errors

### Auth state not persisting
1. Check browser localStorage is enabled
2. Verify Supabase auth token is being stored
3. Check console for auth errors
4. Ensure `onAuthStateChange` listener is properly set up

## Important Notes

- Email confirmation is now **required** for all new users
- Existing users with unconfirmed emails will need to confirm before next login
- The auth state listener handles automatic login after email confirmation
- HashRouter (#) is used, so URLs include the hash symbol
- All redirect URLs must match exactly in Supabase configuration
