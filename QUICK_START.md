# EventNexus - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Apply SQL Migrations ⚡
1. Go to: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw
2. Click **SQL Editor**
3. Copy and run each file in order:
   ```
   supabase/migrations/20250101000001_complete_schema.sql
   supabase/migrations/20250101000002_realtime_setup.sql
   supabase/migrations/20250101000003_analytics_functions.sql
   ```

### Step 2: Deploy Edge Functions 🚢
```bash
npx supabase login
cd /workspaces/EventNexus
./supabase/deploy-functions.sh
```

### Step 3: Run Application 🎉
```bash
npm install
npm run dev
```

Visit: http://localhost:3000

## 📚 Documentation

- **Full Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Backend Docs**: [supabase/README.md](supabase/README.md)
- **Changes**: [MOCK_REMOVAL_SUMMARY.md](MOCK_REMOVAL_SUMMARY.md)
- **Complete Summary**: [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)

## 🔧 Environment Variables

Create `.env.local`:
```env
VITE_SUPABASE_URL=https://anlivujgkjmajkcgbaxw.supabase.co
VITE_SUPABASE_ANON_KEY=your_key_here
GEMINI_API_KEY=your_key_here
```

## 🧪 Testing

```bash
# Test Edge Functions
./supabase/test-functions.sh

# Check deployment
npx supabase functions list

# View logs
npx supabase functions logs proximity-radar
```

## ✅ Verification Checklist

- [ ] SQL migrations applied (check in Supabase dashboard)
- [ ] Edge Functions deployed (run `npx supabase functions list`)
- [ ] App runs locally (`npm run dev`)
- [ ] Can login/signup
- [ ] Events display on map
- [ ] Notifications work

## 🐛 Troubleshooting

**Edge Functions fail to deploy:**
```bash
# Make sure you're logged in
npx supabase login

# Check project link
npx supabase projects list
```

**RLS errors:**
- Make sure you're logged in to the app
- Check user role in Supabase dashboard
- See [DEPLOYMENT.md](DEPLOYMENT.md) troubleshooting section

**Database errors:**
- Verify SQL migrations ran successfully
- Check for syntax errors in SQL Editor
- Ensure PostGIS extension is enabled

## 📞 Need Help?

- **Email**: huntersest@gmail.com
- **Full Docs**: See [DEPLOYMENT.md](DEPLOYMENT.md)

---

**Zero Mock Data** | **Production Ready** | **English Only**
