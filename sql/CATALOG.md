# SQL Directory Catalog

Compact catalog of SQL assets. Use this with INDEX.md when you need the exact script.

## Quick Orientation
- **Primary entrypoints:** `check-and-update-schema.sql` (incremental upgrade), `database-schema.sql` (fresh start), `view-current-schema.sql` (state snapshot)
- **Production order:** prefer `supabase/migrations/` first; use hotfixes only for incident recovery.

## Root Scripts (high-touch)
- `check-and-update-schema.sql` — incremental schema upgrade
- `database-schema.sql` — base schema for clean setups
- `view-current-schema.sql` — schema + RLS snapshot
- `setup-admin-user.sql` / `setup-admin-configs.sql` — bootstrap admin
- `setup-avatar-storage.sql` / `setup-ai-image-storage.sql` — storage policies

## Diagnostics & Verification
- `manual-checks/` — ad-hoc health checks (RLS, triggers, storage, tokens)
- `list-all-tables.sql`, `find-all-recursive-tables.sql`, `find-recursive-policies.sql`, `show-existing-fields.sql`

## Hotfix & Recovery
- `hotfixes/` — focused fixes: OAuth/Instagram (`fix_oauth_config.sql`, `fix_instagram_account.sql`), campaign RLS (`fix_campaign_rls.sql`), token repair (`insert_correct_tokens.sql`), user campaign schema (`create_user_campaigns.sql`)
- RLS/auth repair: `COMPREHENSIVE_RLS_FIX.sql`, `NUCLEAR_FIX_ALL_RLS.sql`, `fix-rls-infinite-recursion.sql`
- Profile/user recovery: `fix-missing-profile.sql`, `RESET_USER_PROFILE.sql`, `DELETE_USER_FOR_FRESH_START.sql`, `CREATE_USER_PROFILE_NOW.sql`

## Stripe & Subscription
- `stripe/` — Stripe config & policy checks (`CHECK_STRIPE_CONFIG.sql`, `FIX_STRIPE_PUBLIC_KEY_RLS.sql`)
- Subscription helpers: `COMPLETE_SUBSCRIPTION_FIX.sql`, `fix-subscription-status-constraint.sql`, `trigger-subscription-update.sql`, `update-financial-ledger-with-subscriptions.sql`, `add-stripe-subscription-id-column.sql`

## Social / Tokens / Campaigns
- `tokens/` — token state + updates (`check_all_tokens.sql`, `insert_instagram_token.sql`, `update_oauth_scope_with_pages_list.sql`, `update_direct_page_token.sql`)
- Social posting + analytics: `add_user_campaigns_posting_columns.sql`, `debug_social_posting.sql`, `create_campaign_analytics.sql`, `create_ai_learning.sql`, `fix_ai_learning_errors.sql`
- Brand monitoring: `brand-monitoring-enhancements.sql`, `fix-brand-monitoring-status.sql`

## Seeds & Admin Utilities
- `seeds/seed-sample-campaign.sql` — sample campaign data
- Access helpers: `make-user-admin.sql`, `verify-admin-access.sql`, `add-master-passkey.sql`

## Usage Notes
- Run `manual-checks/*` scripts read-only first when diagnosing.
- Prefer timestamped migrations in `supabase/migrations/` for forward changes; resort to hotfixes only when migrations cannot be re-run.
