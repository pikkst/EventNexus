# Beta Invitation System - Setup & Usage Guide

## Overview
Complete beta testing program with:
- 1000 credits given to each beta tester who signs up
- Admin panel to manage invitation codes
- Public signup page with code redemption
- Automatic credit distribution
- Beta tester flag on users for targeting and support (`users.is_beta_tester`)
- Direct bug/feedback channel routed to Admin Inbox
- Beta testers keep all standard user/organizer capabilities (no admin rights)

## Features Added

### 1. **Public Beta Signup Page** (`/beta` or `/beta-signup`)
- Beautiful, responsive landing page
- Signup form with email, password, and beta code
- Automatic 1000 credits on successful signup
- Email confirmation workflow

### 2. **Admin Beta Manager** 
Location: Admin Panel → "Beta Invitations"
- Generate batch invitation codes
- Set expiry dates (1-365 days)
- View all codes and their status
- Track redemptions and credits distributed
- Download codes as CSV
- Revoke/cancel codes

### 3. **Database Schema**
Table: `public.beta_invitations`
```sql
- id (UUID) - primary key
- code (TEXT) - unique invitation code
- email (TEXT) - optional
- used_by (UUID) - user who redeemed
- redeemed_at (TIMESTAMP)
- status (TEXT) - 'active', 'used', 'expired'
- created_at (TIMESTAMP)
- expires_at (TIMESTAMP)
```

Additional column in `public.users`:
```sql
- is_beta_tester BOOLEAN DEFAULT false
```

## How to Use

### For Admins: Generate Invitation Codes

1. Go to Admin Panel → "Beta Invitations"
2. Set number of codes to generate (1-1000)
3. Set expiry days (1-365)
4. Click "Generate Codes"
5. Copy codes individually or download as CSV
6. Share codes via Facebook, email, etc.

### For Users: Redeem Beta Code

1. Visit `https://www.eventnexus.eu/#/beta`
2. Click "Join Now" tab
3. Enter email, password, and beta code
4. Submit form
5. Confirm email address
6. Receive 1000 credits instantly!
7. Your account is tagged as a beta tester and unlocks the in-app "Beta Tester Report" tool (Profile → right column)

### For Beta Testers: Send Bug Reports / Feedback

1. Go to Profile (must be logged in)
2. In the right column, open "Report a bug or idea"
3. Fill type (Bug/Feedback/Feature), priority, subject, description
4. Add optional repro steps, console logs/errors, and screenshot/recording URL (all included for admins)
5. Submit → Message is inserted into `admin_inbox` with beta tag and details

### For Marketing: Facebook Posts

Ready-made copy in: `docs/FACEBOOK_BETA_INVITATION.md`
- 4 post templates
- Hashtag recommendations
- Story templates
- Paid ad copy
- Email subject lines

## API Functions

### In `services/dbService.ts`:

```typescript
// Generate batch codes
generateBetaInvitations(count: number, expiryDays: number) 
→ string[] (array of codes)

// Redeem a code
redeemBetaInvitation(userId: string, code: string, creditsAmount?: number)
→ { success: boolean, message: string }

// Get all codes (admin only)
getBetaInvitations()
→ BetaInvitation[]

// Get stats
getBetaStats()
→ { total, active, used, expired, creditsDistributed }

// Revoke a code
revokeBetaInvitation(invitationId: string)
→ boolean
```

## Example: Generate & Share

```bash
# 1. Admin generates 50 codes expiring in 60 days
Admin Panel → Beta Invitations → Set count to 50, days to 60 → Generate

# 2. Download as CSV
Click "Export CSV"

# 3. Share codes via Facebook
Use templates from docs/FACEBOOK_BETA_INVITATION.md

# 4. User redeems
User goes to /beta → fills form → gets 1000 credits
```

## Credits System

- **1000 credits per beta tester** (configurable in `redeemBetaInvitation()`)
- Credits stored in `users.credits_balance` column
- Beta tester flag stored in `users.is_beta_tester` (set automatically on redemption)
- Automatically added when code is redeemed
- Works with existing credit system

## Important Notes

⚠️ **Before Going Live:**
1. Run SQL migrations:
	- `20251225_create_beta_invitations.sql`
	- `20251226000001_add_beta_tester_flag.sql`
2. Update `redeemBetaInvitation()` if changing credit amount
3. Test signup flow end-to-end
4. Confirm emails work
5. Send a test bug report from a beta tester account and verify it appears in Admin Inbox

📱 **URLs:**
- Beta page: `https://www.eventnexus.eu/#/beta`
- Signup: `https://www.eventnexus.eu/#/beta-signup`
- Admin: `https://www.eventnexus.eu/#/admin` (Beta Invitations tab)

🔒 **Security:**
- RLS policies prevent non-admins from managing codes
- Codes are unique UUIDs
- One code per user (checked on redemption)
- Expiry dates enforced

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Code not working | Check status (active/used/expired) in admin panel |
| No credits received | Verify email confirmed in Supabase auth |
| Can't generate codes | Check admin role and RLS policies |
| CSV export empty | Generate codes first, then export |

## Next Steps

1. ✅ Run SQL migration
2. ✅ Generate first batch of codes
3. ✅ Share Facebook posts
4. ✅ Monitor signups in admin panel
5. ✅ Award bonuses for best testers (optional)

