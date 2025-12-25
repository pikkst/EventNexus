# EventNexus - Supabase Backend

Backend assets live here: migrations, Edge Functions, and project config. Apply migrations in timestamp order and deploy functions after updating secrets.

## Directory Layout

```
supabase/
├── README.md
├── config.toml                  # Supabase CLI project config
├── deploy-functions.sh          # Deploy all Edge Functions
├── test-functions.sh            # Smoke tests for functions
├── migrations/                  # Ordered SQL migrations (timestamped)
├── functions/                   # Edge Functions source
├── supabase/                    # Supabase CLI metadata
└── .temp/                       # Supabase CLI scratch (keep in repo root)
```

## Migrations (run in timestamp order)

- Guardrails: `00000000000000_check_database_state.sql`, `00000000000001_safe_migration.sql`.
- Core platform: `20250101000001_complete_schema.sql`, `20250101000002_realtime_setup.sql`, `20250101000003_analytics_functions.sql`.
- Social + AI: `20250120000001_social_media_integration.sql`, `20250122000000_add_social_tracking_to_user_campaigns.sql`.
- Payments & subscriptions: `20251219160500_add_stripe_subscription_id.sql`, `20251219162600_fix_subscription_status_constraint.sql`, `20251219163000_subscription_payments_table.sql`, `20251219163200_fix_revenue_by_tier_subscriptions.sql`, `20251223000002_fix_stripe_public_key_access.sql`.
- Engagement & content: `20251220000001_add_followed_organizers.sql`, `20251222000001_add_event_likes.sql`, `20251222000002_free_tier_credit_system.sql`, `20251222000003_event_image_storage.sql`.
- Ticketing: `20250220000000_ticket_system_enhancement.sql`, `20251225000001_allow_ticket_scan_updates.sql`.
- Infrastructure fixes: `20241221000003_fix_system_config_rls.sql`, `20241221000004_system_config_complete.sql`, `20250119000005_setup_avatars_storage.sql`.

> Apply all migrations sequentially; do not skip earlier files. For RLS or key fixes, re-run the specific migration if policies drift.

## Edge Functions (functions/)

- Payments & subscriptions: `create-checkout`, `verify-checkout`, `cancel-subscription`, `stripe-webhook`, `verify-connect-onboarding`, `create-connect-account`, `get-connect-dashboard-link`, `process-scheduled-payouts`, `request-refund`.
- Campaigns & social: `campaign-auto-poster`, `autonomous-operations`, `facebook-data-deletion`, `facebook-deauthorize`, `facebook-webhook`, `instagram-data-deletion`, `instagram-deauthorize`, `instagram-webhook`.
- Events, tickets, notifications: `proximity-radar`, `validate-ticket`, `receive-email`, `send-email-reply`, `brand-monitoring`.
- Ops & analytics: `platform-stats`, `infrastructure-stats`, `diagnostic-scan`.

Deploy everything with the helper script:

```bash
chmod +x supabase/deploy-functions.sh
./supabase/deploy-functions.sh
```

Or deploy an individual function:

```bash
supabase functions deploy proximity-radar --project-ref anlivujgkjmajkcgbaxw
```

## Secrets & Configuration

- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_PREMIUM`, `STRIPE_PRICE_ENTERPRISE`.
- Connect onboarding: `STRIPE_ACCOUNT_LINK_RETURN_URL`, `STRIPE_ACCOUNT_LINK_REFRESH_URL` (if configured).
- Email (if used): service credentials for `receive-email` / `send-email-reply`.
- Ensure PostGIS and realtime are enabled in the project before running proximity features.

## Testing & Verification

- Quick smoke: `./supabase/test-functions.sh` (adjust executable bit if needed).
- Logs: `supabase functions logs <function> --project-ref anlivujgkjmajkcgbaxw`.
- Policy checks: use the SQL in `sql/stripe/CHECK_STRIPE_CONFIG.sql` and other `sql/manual-checks/*` scripts for targeted verification.

## Support

For operational issues email: huntersest@gmail.com
