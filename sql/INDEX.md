# SQL Script Catalog

Categorized reference for SQL scripts. Run migrations in timestamp order; use hotfix and manual-checks sparingly and only when applicable.

## Core Schema & Setup
- [database-schema.sql](database-schema.sql)
- [check-and-update-schema.sql](check-and-update-schema.sql)
- [view-current-schema.sql](view-current-schema.sql)
- [setup-admin-user.sql](setup-admin-user.sql), [setup-admin-configs.sql](setup-admin-configs.sql)
- [setup-avatar-storage.sql](setup-avatar-storage.sql), [setup-ai-image-storage.sql](setup-ai-image-storage.sql)

## Checks & Diagnostics
- [manual-checks/](manual-checks) (ad-hoc state checks and verifications): includes `check_*` scripts, token checks, RLS/diagnostic scripts, and `verify_*` helpers.

## Hotfixes & Recovery
- [hotfixes/](hotfixes) targeted repairs: includes `create_user_campaigns.sql`, `fix_accounts_final.sql`, `fix_campaign_rls.sql`, `fix_instagram_account.sql`, `fix_oauth_config.sql`, `fix_oauth_credentials.sql`, `fix_social_media_rls.sql`, `insert_correct_tokens.sql`, `update_oauth_credentials.sql`
- RLS and auth fixes: [COMPREHENSIVE_RLS_FIX.sql](COMPREHENSIVE_RLS_FIX.sql), [NUCLEAR_FIX_ALL_RLS.sql](NUCLEAR_FIX_ALL_RLS.sql), [fix-rls-infinite-recursion.sql](fix-rls-infinite-recursion.sql), [diagnostic-rls-issues.sql](diagnostic-rls-issues.sql)
- User/profile recovery: [fix-missing-profile.sql](fix-missing-profile.sql), [RESET_USER_PROFILE.sql](RESET_USER_PROFILE.sql), [DELETE_USER_FOR_FRESH_START.sql](DELETE_USER_FOR_FRESH_START.sql), [CREATE_USER_PROFILE_NOW.sql](CREATE_USER_PROFILE_NOW.sql), [CREATE_PROFILE_13f2acc6.sql](CREATE_PROFILE_13f2acc6.sql)

## Stripe & Subscriptions
- [stripe/](stripe) (RLS and config checks): `CHECK_STRIPE_CONFIG.sql`, `FIX_STRIPE_PUBLIC_KEY_RLS.sql`
- Subscription fixes: [COMPLETE_SUBSCRIPTION_FIX.sql](COMPLETE_SUBSCRIPTION_FIX.sql), [SUBSCRIPTION_CHECKOUT_FIX.md](../docs/stripe/SUBSCRIPTION_CHECKOUT_FIX.md), [fix-premium-subscription.sql](fix-premium-subscription.sql), [fix-subscription-status-constraint.sql](fix-subscription-status-constraint.sql), [trigger-subscription-update.sql](trigger-subscription-update.sql), [update-financial-ledger-with-subscriptions.sql](update-financial-ledger-with-subscriptions.sql)
- Price and key helpers: [check_and_update_stripe_key.sql](check_and_update_stripe_key.sql), [add-stripe-subscription-id-column.sql](add-stripe-subscription-id-column.sql)

## Social / OAuth / Tokens
- [tokens/](tokens) (scopes and tokens): [update_oauth_scope_with_pages_list.sql](tokens/update_oauth_scope_with_pages_list.sql), [insert_instagram_token.sql](tokens/insert_instagram_token.sql), [manually_insert_tokens.sql](tokens/manually_insert_tokens.sql), [check_all_tokens.sql](tokens/check_all_tokens.sql), [check_current_tokens.sql](tokens/check_current_tokens.sql), [update_direct_page_token.sql](tokens/update_direct_page_token.sql), [update_fresh_page_token.sql](tokens/update_fresh_page_token.sql)
- [fix_social_media_rls.sql](hotfixes/fix_social_media_rls.sql), [add_user_campaigns_posting_columns.sql](add_user_campaigns_posting_columns.sql), [debug_social_posting.sql](debug_social_posting.sql)

## Campaigns, Branding, and AI
- [create_campaign_analytics.sql](create_campaign_analytics.sql), [create_ai_learning.sql](create_ai_learning.sql), [fix_ai_learning_errors.sql](fix_ai_learning_errors.sql)
- [brand-monitoring-enhancements.sql](brand-monitoring-enhancements.sql), [fix-brand-monitoring-status.sql](fix-brand-monitoring-status.sql)

## Analytics & Finance
- [fix-revenue-by-tier.sql](fix-revenue-by-tier.sql), [update-financial-ledger-with-subscriptions.sql](update-financial-ledger-with-subscriptions.sql), [update_direct_page_token.sql](tokens/update_direct_page_token.sql)
- [create_autonomous_operations.sql](create_autonomous_operations.sql), [create_smart_scheduling.sql](create_smart_scheduling.sql)

## Storage & Media
- [setup-avatar-storage.sql](setup-avatar-storage.sql), [fix-storage-for-banners.sql](fix-storage-for-banners.sql), [STORAGE_SETUP.md](STORAGE_SETUP.md)

## Utilities & Lists
- [list-all-tables.sql](list-all-tables.sql), [find-all-recursive-tables.sql](find-all-recursive-tables.sql), [find-recursive-policies.sql](find-recursive-policies.sql)
- [show-existing-fields.sql](show-existing-fields.sql)

## Seeds & Samples
- [seeds/seed-sample-campaign.sql](seeds/seed-sample-campaign.sql)

## Admin & Access
- [make-user-admin.sql](make-user-admin.sql), [verify-admin-access.sql](verify-admin-access.sql), [add-master-passkey.sql](add-master-passkey.sql)

For ad-hoc checks, prefer scripts under `manual-checks/`. For production repairs, prefer versioned migrations under `supabase/migrations/` before resorting to hotfixes.
