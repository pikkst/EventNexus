# EventNexus Database Scripts

SQL scripts for managing the EventNexus Supabase database schema. See [INDEX.md](INDEX.md) for a categorized list.

## Directory Layout
- `manual-checks/` - One-off validation scripts that inspect current state.
- `hotfixes/` - Targeted fixes and recovery scripts captured from incidents.
- `stripe/` - Stripe-specific policies and verification queries.

## 📋 Available Scripts

### 1. `check-and-update-schema.sql` ⭐ **RUN THIS FIRST**

**Purpose:** Complete database schema update for Pro and Premium tier features.

**What it does:**
- ✅ Checks your current database structure
- ✅ Adds missing columns to existing tables
- ✅ Creates new tables for analytics and affiliate features
- ✅ Sets up proper indexes for performance
- ✅ Enables Row Level Security (RLS)
- ✅ Creates triggers for auto-updating data

**Features added:**
- `is_featured` column for Premium map placement
- `custom_branding` columns for branded tickets
- `subscription_tier` for tier management
- `event_analytics` table for advanced analytics
- `affiliate_referrals` and `affiliate_earnings` tables
- `payout_history` table for organizer payments
- Stripe integration columns
- Auto-copying branding to tickets
- Auto-generating affiliate codes

**How to use:**
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Paste the entire script
4. Click "Run"
5. Check the output logs for confirmation

### 2. `view-current-schema.sql`

**Purpose:** Quick overview of your current database structure.

**What it shows:**
- All tables in your database
- Column structures for each table
- Row counts
- Subscription tier distribution
- Featured events count
- Index information
- RLS policies
- Premium feature column checks
- Sample data (first 5 rows)

**How to use:**
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Paste the script
4. Click "Run"
5. Scroll through results to see your database structure

### 3. `database-schema.sql`

**Purpose:** Initial database schema (if starting fresh).

**Use this if:**
- Setting up EventNexus for the first time
- Need to recreate the database from scratch

**Note:** If you already have data, use `check-and-update-schema.sql` instead.

---

## 🚀 Quick Start Guide

### For Existing Database (Recommended)

```bash
1. Run: view-current-schema.sql
   → See what you currently have

2. Run: check-and-update-schema.sql
   → Add missing Pro/Premium features

3. Run: view-current-schema.sql (again)
   → Verify everything was added correctly
```

### For New Database

```bash
1. Run: database-schema.sql
   → Create base schema

2. Run: check-and-update-schema.sql
   → Add all Pro/Premium features

3. Run: view-current-schema.sql
   → Verify setup
```

---

## 📊 Database Tables Overview

### Core Tables
- **users** - User profiles, subscriptions, Stripe info, affiliate codes
- **events** - Events with featured flag and custom branding
- **tickets** - Tickets with custom branding copied from events
- **notifications** - User notifications

### Premium Feature Tables
- **event_analytics** - Track views, clicks, conversions, demographics
- **affiliate_referrals** - Referral tracking for 15% commission program
- **affiliate_earnings** - Individual commission payments
- **payout_history** - Organizer payout records

---

## 🔐 Row Level Security (RLS)

All tables have RLS enabled with policies:

- **users**: Can view/update own profile
- **events**: Organizers manage their events, public can view
- **tickets**: Users see own tickets, organizers see event tickets
- **analytics**: Organizers see their event analytics
- **affiliates**: Users see their own referrals and earnings

---

## 🎯 Key Features by Tier

### Free Tier
- Basic event browsing
- 3 events max
- No dashboard access

### Pro Tier ($19.99)
- 20 events max
- Dashboard with analytics
- AI features
- Public profile
- 3% platform fee

### Premium Tier ($49.99) ⭐
- 100 events max
- **Featured map placement** (`is_featured = true`)
- **Custom branding** on tickets
- **Advanced analytics** (demographics, traffic)
- **Affiliate program** (15% recurring commission)
- 2.5% platform fee

### Enterprise Tier ($149.99)
- Unlimited events
- All Premium features
- White-labeling
- 1.5% platform fee

---

## 🔧 Triggers and Functions

### Auto-Generated Data

1. **Branding Copy to Tickets**
   - When ticket created → copies event's `custom_branding`
   - Also copies `event_name` and `event_location`

2. **Affiliate Code Generation**
   - When user upgrades to Premium/Enterprise
   - Format: `REF-XXXXXXXX` (8 random chars)

3. **Affiliate Earnings Update**
   - When earning status → 'paid'
   - Updates total_earned in affiliate_referrals

4. **Updated_at Timestamps**
   - Auto-updates `updated_at` on row changes

---

## 📝 Sample Queries

### Check a user's subscription tier
```sql
SELECT name, email, subscription_tier, role 
FROM users 
WHERE email = 'user@example.com';
```

### View featured events (Premium)
```sql
SELECT name, category, price, is_featured, custom_branding
FROM events 
WHERE is_featured = true;
```

### Check affiliate referrals
```sql
SELECT 
    r.referrer_id,
    u.name as referrer_name,
    r.status,
    r.total_earned,
    COUNT(e.*) as earnings_count
FROM affiliate_referrals r
JOIN users u ON u.id = r.referrer_id
LEFT JOIN affiliate_earnings e ON e.referral_id = r.id
GROUP BY r.referrer_id, u.name, r.status, r.total_earned;
```

### View analytics for an event
```sql
SELECT 
    date,
    views,
    clicks,
    conversions,
    revenue,
    traffic_sources,
    demographics
FROM event_analytics 
WHERE event_id = 'your-event-uuid'
ORDER BY date DESC;
```

---

## ⚠️ Important Notes

1. **Backup First**: Always backup your database before running update scripts
2. **Test Environment**: Test in development/staging before production
3. **RLS Policies**: Make sure auth.uid() is available (user must be logged in)
4. **Indexes**: The script creates performance indexes automatically
5. **Data Migration**: Existing data is preserved, new columns get defaults

---

## 🐛 Troubleshooting

### Script fails with "column already exists"
- This is normal if you've run parts of the script before
- The script uses `IF NOT EXISTS` checks
- Safe to re-run

### RLS policies block access
- Check if user is authenticated: `SELECT auth.uid()`
- Verify user owns the resource
- For testing, you can temporarily disable RLS (not recommended for production)

### Missing tables after running script
- Check Supabase logs for errors
- Verify you have table creation permissions
- Make sure you're in the correct project

### Triggers not firing
- Check if functions exist: `\df` in psql
- Verify trigger is attached: `SELECT * FROM pg_trigger WHERE tgname LIKE '%branding%'`
- Check function permissions

---

## 📞 Support

For issues or questions:
- Check [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) for full deployment guide
- Email: huntersest@gmail.com
- Create an issue on GitHub

---

## 🔄 Migration History

- **2025-12-20**: Initial Pro/Premium tier feature support
  - Added is_featured, custom_branding columns
  - Created analytics and affiliate tables
  - Added Stripe integration fields
  - Set up auto-update triggers

---

**Built with ❤️ for EventNexus**
