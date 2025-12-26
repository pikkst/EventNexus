# Quick Setup: Production Transition Feature

## TL;DR - 3 Steps to Deploy

### Step 1: Run SQL Migration (Supabase Dashboard)

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `sql/production_transition.sql`
3. Paste into editor
4. Click **Run**
5. Wait for completion ✅

### Step 2: Deploy Edge Function

```bash
# From project root
cd /workspaces/EventNexus
supabase functions deploy production-transition
```

Or manually:
```bash
# Navigate to function directory
cd supabase/functions/production-transition

# Deploy with Supabase CLI
supabase functions deploy
```

### Step 3: Use in Admin Dashboard

1. Log in as admin
2. Go to **System Health** tab (Infrastructure section)
3. Click **Go Live Production** button (red, rocket icon)
4. Unlock Master Security when prompted
5. Read warnings
6. Type exactly: `TRANSITION_TO_PRODUCTION`
7. Click **Go Live Now**
8. Done! ✅

## What Gets Changed

| Setting | Before | After |
|---------|--------|-------|
| **Environment** | Development | Production |
| **Stripe Mode** | Test (Sandbox) | Live |
| **Beta Features** | Enabled | Disabled |
| **Sandbox Mode** | Enabled | Disabled |
| **Beta Testers** | Active | Archived |
| **Safeguards** | Basic | Advanced (2FA, backups, DDoS) |

## Important ⚠️

- **One-way transition** - Cannot be undone automatically
- **Stripe goes live** - Real transactions start immediately
- **No beta features** - All beta users lose access
- **Audit logged** - All changes recorded with admin details
- **Master lock required** - Extra security gate

## Rollback (Emergency Only)

If you need to revert (this is manual):

```sql
-- Step 1: Revert environments
UPDATE environment_config SET is_active = true WHERE environment = 'development';
UPDATE environment_config SET is_active = false WHERE environment = 'production';

-- Step 2: Re-enable beta features
UPDATE system_config
SET value = jsonb_build_object('beta_features_enabled', true, 'sandbox_enabled', true)
WHERE key = 'platform_mode';

-- Step 3: Manually switch Stripe back in Stripe Dashboard
```

## Verify It Worked

```sql
-- Check environment
SELECT * FROM get_current_environment();

-- Should show: environment='production', stripe_mode='live'

-- Check transition history
SELECT * FROM production_transition_log ORDER BY transition_date DESC LIMIT 1;
```

## Troubleshooting

### "Admin access required" error
- ✅ Log in as admin user
- ✅ Check database - confirm role = 'admin'

### "Master controls must be locked" error
- ✅ Click lock icon in admin dashboard to activate Master Security
- ✅ Authenticate with biometric/password

### "Transition failed" error
- ✅ Check Supabase logs: `supabase functions logs production-transition`
- ✅ Verify all required fields in environment_config
- ✅ Check RLS policies for admin user

### Can't type confirmation text
- ✅ Must be uppercase: `TRANSITION_TO_PRODUCTION`
- ✅ Copy-paste to avoid typos
- ✅ Exact match required (no extra spaces)

## Files Changed/Created

### New Files
- `sql/production_transition.sql` - Database migration
- `supabase/functions/production-transition/index.ts` - Edge Function
- `docs/PRODUCTION_TRANSITION.md` - Full documentation

### Modified Files
- `services/dbService.ts` - Added 3 new functions
- `components/AdminCommandCenter.tsx` - Added UI button & modal
- `supabase/config.toml` - Added function config

## Support

If issues occur:
1. Check [PRODUCTION_TRANSITION.md](./PRODUCTION_TRANSITION.md) for full docs
2. Review Edge Function logs: `supabase functions logs production-transition`
3. Check SQL migration: `SELECT * FROM production_transition_log;`
4. Contact: huntersest@gmail.com

---

**Status**: ✅ Ready for production transition
