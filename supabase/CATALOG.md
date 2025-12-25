# Supabase Directory Catalog

Concise map of backend assets. Apply migrations in timestamp order; deploy functions after secrets are set.

## Quick Links
- Full guide: `README.md`
- Deploy helper: `deploy-functions.sh`
- Smoke tests: `test-functions.sh`

## Migrations (ordered)
- Guardrails: `00000000000000_check_database_state.sql`, `00000000000001_safe_migration.sql`
- Core platform: `20250101000001_complete_schema.sql`, `20250101000002_realtime_setup.sql`, `20250101000003_analytics_functions.sql`
- Social & AI: `20250120000001_social_media_integration.sql`, `20250122000000_add_social_tracking_to_user_campaigns.sql`
- Payments & subscriptions: `20251219160500_add_stripe_subscription_id.sql`, `20251219162600_fix_subscription_status_constraint.sql`, `20251219163000_subscription_payments_table.sql`, `20251219163200_fix_revenue_by_tier_subscriptions.sql`, `20251223000002_fix_stripe_public_key_access.sql`
- Engagement & media: `20251220000001_add_followed_organizers.sql`, `20251222000001_add_event_likes.sql`, `20251222000003_event_image_storage.sql`
- Ticketing: `20250220000000_ticket_system_enhancement.sql`, `20251225000001_allow_ticket_scan_updates.sql`
- Infrastructure fixes: `20241221000003_fix_system_config_rls.sql`, `20241221000004_system_config_complete.sql`, `20250119000005_setup_avatars_storage.sql`

## Edge Functions (functions/)
- Payments & subscriptions: `create-checkout`, `verify-checkout`, `cancel-subscription`, `stripe-webhook`, `verify-connect-onboarding`, `create-connect-account`, `get-connect-dashboard-link`, `process-scheduled-payouts`, `request-refund`
- Campaigns & social: `campaign-auto-poster`, `autonomous-operations`, `facebook-data-deletion`, `facebook-deauthorize`, `facebook-webhook`, `instagram-data-deletion`, `instagram-deauthorize`, `instagram-webhook`
- Events & notifications: `proximity-radar`, `validate-ticket`, `receive-email`, `send-email-reply`, `brand-monitoring`
- Ops & analytics: `platform-stats`, `infrastructure-stats`, `diagnostic-scan`

## Tooling & Metadata
- `config.toml` — Supabase CLI project config
- `.temp/` and `supabase/` — CLI metadata (project ref, pooler URL, versions)
- Scripts: `deploy-functions.sh` (deploy all), `test-functions.sh` (smoke tests)

## Usage Notes
- Always run migrations sequentially; rerun specific migration when repairing policies.
- After secret changes, redeploy affected Edge Functions.
- Check logs with `supabase functions logs <function> --project-ref anlivujgkjmajkcgbaxw`.
