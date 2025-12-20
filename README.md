<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# EventNexus - Intelligent Event Discovery Platform

🎯 **Production-ready event platform** with AI-powered features, geospatial search, real-time notifications, and integrated payment processing.

## ✨ Key Features

### 🗺️ Event Discovery & Management
- **Geospatial Search** - PostGIS-powered location-based event discovery with radius filtering
- **Proximity Radar** - Real-time Edge Function notifications for nearby events
- **Advanced Categories** - 12+ event categories with custom filtering
- **Multi-tier Events** - Support for free and premium events

### 🎫 Ticketing System
- **QR Code Generation** - Secure ticket generation with unique QR codes
- **Real-time Scanner** - Mobile-optimized ticket validation
- **Refund Management** - Automated refund processing
- **Attendance Tracking** - Real-time check-in monitoring

### 💳 Payment Integration
- **Stripe Connect** - Full payment processing for event organizers
- **Subscription Management** - Multi-tier platform subscriptions (Free, Pro, Agency)
- **Revenue Analytics** - Detailed financial tracking and reporting
- **Automated Payouts** - Direct payments to organizers

### 🤖 AI-Powered Features
- **Marketing Campaign Generator** - AI-generated campaigns with Gemini 3 Flash
- **Ad Image Generation** - Imagen 3 Fast for marketing visuals
- **Smart Taglines** - Auto-generated event taglines
- **Multilingual Support** - AI translation for event descriptions
- **NexusBot** - Context-aware chatbot with streaming responses

### 📊 Admin & Analytics
- **Command Center** - Comprehensive admin dashboard
- **Platform Statistics** - Real-time metrics and KPIs
- **Revenue Reports** - Financial analytics by tier
- **User Management** - Role-based access control (Admin, Agency, Organizer, Attendee)
- **System Health Monitoring** - Live platform health checks

### 🔐 Security & Compliance
- **Row Level Security** - PostgreSQL RLS on all tables
- **GDPR Compliance** - Cookie consent and data privacy controls
- **Master Authentication** - Admin passkey system
- **JWT Authentication** - Secure user sessions
- **Encrypted Storage** - Secure avatar and media uploads

## 🚀 Quick Start

**Prerequisites:** Node.js 20+, Supabase account, Stripe account (for payments), Google AI Studio API key

### 1. Clone and Install
```bash
git clone https://github.com/pikkst/EventNexus.git
cd EventNexus
npm install
```

### 2. Environment Setup

Create `.env.local` in project root:
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://anlivujgkjmajkcgbaxw.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# AI Integration
GEMINI_API_KEY=your_gemini_api_key_here

# Stripe (via Supabase Secrets)
# Set in Supabase Dashboard → Project Settings → Edge Functions → Secrets
# STRIPE_SECRET_KEY
# STRIPE_WEBHOOK_SECRET
```

### 3. Database Setup

Run SQL migrations in order in Supabase SQL Editor:
```bash
# Core schema
sql/database-schema.sql

# Admin setup
sql/setup-admin-user.sql
sql/setup-admin-configs.sql

# Storage
sql/setup-avatar-storage.sql

# RLS policies
sql/fix-users-rls.sql
sql/check-rls-policies.sql
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for complete guide.

### 4. Deploy Edge Functions
```bash
cd supabase
./deploy-functions.sh
```

Functions:
- `proximity-radar` - Geospatial notifications
- `stripe-create-payment-intent` - Payment processing
- `stripe-webhook` - Payment event handling

### 5. Run Development Server
```bash
npm run dev
# Opens at http://localhost:3000
```

### 6. Build for Production
```bash
npm run build
npm run preview
```

Deploys to GitHub Pages automatically via Actions.

## 📁 Project Structure

```
EventNexus/
├── components/            # React components
│   ├── AdminCommandCenter.tsx      # Admin dashboard
│   ├── AgencyProfile.tsx           # Agency management
│   ├── AuthModal.tsx               # Authentication UI
│   ├── ChatBot.tsx                 # AI chatbot (NexusBot)
│   ├── Dashboard.tsx               # User dashboard
│   ├── EventCreationFlow.tsx       # Multi-step event creation
│   ├── EventDetail.tsx             # Event details & booking
│   ├── HomeMap.tsx                 # Leaflet map integration
│   ├── TicketScanner.tsx           # QR code scanner
│   ├── UserProfile.tsx             # User profile management
│   └── ...                         # Other UI components
│
├── services/              # API & external integrations
│   ├── dbService.ts       # Supabase database operations
│   ├── geminiService.ts   # Google Gemini AI integration
│   ├── stripeService.ts   # Stripe payment processing
│   └── supabase.ts        # Supabase client config
│
├── supabase/              # Backend infrastructure
│   ├── migrations/        # SQL schemas & migrations
│   │   ├── 20240101_initial_schema.sql
│   │   ├── 20240102_rls_policies.sql
│   │   └── ...
│   ├── functions/         # Edge Functions (Deno)
│   │   ├── proximity-radar/
│   │   ├── stripe-create-payment-intent/
│   │   └── stripe-webhook/
│   └── deploy-functions.sh
│
├── docs/                  # Documentation
│   ├── DEPLOYMENT.md      # Deployment guide
│   ├── STRIPE_SETUP.md    # Payment setup
│   ├── QUICK_START.md     # Getting started
│   └── ...                # Other guides
│
├── sql/                   # Database scripts
│   ├── database-schema.sql
│   ├── setup-admin-user.sql
│   ├── fix-users-rls.sql
│   └── ...                # 30+ SQL scripts
│
├── scripts/               # Utility scripts
│   ├── populate-db.js     # Database seeding
│   └── make-admin.js      # Admin user creation
│
├── App.tsx                # Root component & routing
├── index.tsx              # React entry point
├── types.ts               # TypeScript definitions
├── constants.tsx          # Platform configuration
└── vite.config.ts         # Build configuration
```

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 with TypeScript 5
- **Build Tool**: Vite 6
- **Routing**: React Router v7 (HashRouter for GitHub Pages)
- **Styling**: Tailwind CSS + custom components
- **Maps**: Leaflet + React Leaflet
- **Icons**: Lucide React
- **QR Codes**: react-qr-code

### Backend
- **Database**: PostgreSQL 15 with PostGIS extension
- **BaaS**: Supabase (Auth, Realtime, Storage)
- **Serverless**: Supabase Edge Functions (Deno runtime)
- **Authentication**: JWT + Row Level Security

### AI & ML
- **Model**: Google Gemini 2.5 Flash / Gemini 3 Flash
- **Image Gen**: Imagen 3 Fast
- **Features**: 
  - Campaign generation with structured schemas
  - Real-time streaming chat
  - Multilingual translation
  - Ad image generation

### Payments
- **Provider**: Stripe
- **Features**: Stripe Connect, Payment Intents, Webhooks
- **Subscriptions**: Recurring billing with 3 tiers

### Geospatial
- **Extension**: PostGIS
- **Features**: 
  - ST_DWithin for proximity search
  - ST_Distance for radius calculations
  - Geography data type for accurate distances
  - Spatial indexing (GIST)

### DevOps
- **CI/CD**: GitHub Actions
- **Hosting**: GitHub Pages
- **Container**: Dev Container (Ubuntu 24.04)
- **Package Manager**: npm

## 🔐 Security Features

### Authentication & Authorization
- **JWT-based auth** via Supabase Auth
- **Role-based access control**: Admin, Agency, Organizer, Attendee
- **Master passkey** for admin access
- **Email verification** required for signup
- **Session management** with secure token refresh

### Database Security
- **Row Level Security (RLS)** on all tables
- **Policies per role** - users only see their own data
- **Service role bypass** for admin operations
- **Encrypted connections** - TLS for all database traffic
- **SQL injection prevention** via parameterized queries

### Data Protection
- **GDPR compliant** - cookie consent & data privacy
- **Avatar storage** with signed URLs
- **Secure file uploads** via Supabase Storage
- **Audit trails** for critical operations
- **Data encryption** at rest and in transit

### API Security
- **Rate limiting** on Edge Functions
- **CORS configuration** for production domains
- **Webhook signature verification** for Stripe
- **Environment secrets** managed in Supabase dashboard
- **No exposed API keys** in client code

## 📦 Production Architecture

This is a **fully production-ready** application with **zero mock data**:

### ✅ Real Data Layer
- All data from Supabase PostgreSQL database
- 10+ tables with proper relationships and constraints
- Real-time subscriptions for live updates
- Geospatial queries with PostGIS

### ✅ Serverless Functions
- 3 Edge Functions deployed on Supabase
- Proximity radar with geospatial calculations
- Stripe payment processing
- Webhook handlers for external events

### ✅ Live Features
- Real analytics and platform statistics
- Actual payment processing with Stripe
- AI-generated content via Gemini API
- Geolocation-based event discovery
- QR code ticket validation

### ✅ Scalability
- Edge Functions auto-scale
- Database connection pooling
- CDN-served static assets (GitHub Pages)
- Optimized PostgreSQL queries with indexes

## 🎯 Core Workflows

### Event Creation
1. Organizer creates event with details
2. AI generates tagline and marketing content
3. Event stored with geolocation data
4. Published to map with proximity triggers

### Ticket Purchase
1. User browses events on map
2. Selects event and ticket quantity
3. Stripe payment processing
4. QR code ticket generation
5. Email confirmation sent

### Event Check-in
1. Organizer opens ticket scanner
2. Scans attendee QR code
3. Validates ticket against database
4. Updates attendance records
5. Prevents duplicate scans

### Proximity Notifications
1. User grants location permission
2. Edge Function monitors user location
3. Triggers notification for nearby events
4. Real-time push to user dashboard
5. Updates notification center

## 📖 Documentation

### Getting Started
- [docs/QUICK_START.md](docs/QUICK_START.md) - Quick setup guide
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - Complete deployment instructions
- [supabase/README.md](supabase/README.md) - Backend setup & Edge Functions

### Feature Guides
- [docs/STRIPE_SETUP.md](docs/STRIPE_SETUP.md) - Payment integration
- [docs/STRIPE_CONNECT_SETUP.md](docs/STRIPE_CONNECT_SETUP.md) - Organizer payouts
- [docs/EMAIL_CONFIRMATION_SETUP.md](docs/EMAIL_CONFIRMATION_SETUP.md) - Email verification

### Implementation Details
- [docs/ADMIN_IMPLEMENTATION.md](docs/ADMIN_IMPLEMENTATION.md) - Admin features
- [docs/MASTER_AUTH_IMPLEMENTATION.md](docs/MASTER_AUTH_IMPLEMENTATION.md) - Master auth
- [docs/MOCK_REMOVAL_SUMMARY.md](docs/MOCK_REMOVAL_SUMMARY.md) - Migration to real data

### Development
- [.github/copilot-instructions.md](.github/copilot-instructions.md) - AI coding guidelines
- [docs/SYSTEM_HEALTH_FIX.md](docs/SYSTEM_HEALTH_FIX.md) - System monitoring

## 🧪 Testing

### Manual Testing
```bash
# Run dev server
npm run dev

# Test admin features
# Login with admin account at /admin

# Test payment flow
# Create event and process test payment

# Test Edge Functions
cd supabase
./test-functions.sh
```

### Database Verification
```sql
-- Run in Supabase SQL Editor

-- Check RLS policies
\i sql/check-rls-policies.sql

-- Verify user roles
\i sql/check-user-simple.sql

-- Test platform stats
\i sql/verify-and-fix-analytics.sql
```

## 🚢 Deployment

### GitHub Pages (Automatic)
1. Push to `main` branch
2. GitHub Actions builds and deploys
3. Live at https://pikkst.github.io/EventNexus/

### Manual Build
```bash
npm run build
npm run preview
```

### Backend Deploy
```bash
# Deploy Edge Functions
cd supabase
./deploy-functions.sh

# Apply database migrations
# Run SQL files in supabase/migrations/ via Supabase SQL Editor
```

## 🐛 Troubleshooting

### Build Issues
- **Vite errors**: Clear `node_modules` and `dist/`, run `npm install`
- **Env variables**: Check `.env.local` exists and has all keys
- **Import errors**: Verify `@/` alias in `vite.config.ts`

### Auth Issues
- **Email not confirmed**: Run `sql/confirm-admin-user.sql`
- **Missing profile**: Check `public.users` table exists
- **401 errors**: Verify `VITE_SUPABASE_ANON_KEY` is correct

### Payment Issues
- **Stripe errors**: Check webhook secret in Supabase Edge Function secrets
- **Test mode**: Use Stripe test cards (4242 4242 4242 4242)
- **Webhook failures**: Check Edge Function logs in Supabase dashboard

### AI Issues
- **No images**: Check `GEMINI_API_KEY` in `.env.local`
- **Streaming errors**: Ad blockers may interfere with streaming responses
- **Model errors**: Some Gemini models require API access approval

## 🌐 Live Demo

**Production URL**: https://pikkst.github.io/EventNexus/

### Test Accounts
- **Admin**: Contact team for admin credentials
- **Test Payments**: Use Stripe test mode cards
  - Success: `4242 4242 4242 4242`
  - Decline: `4000 0000 0000 0002`

### Features to Try
1. 🗺️ Browse events on interactive map
2. 🔍 Search by location and category
3. 🎫 Create test event (requires login)
4. 🤖 Chat with NexusBot AI assistant
5. 📊 View platform statistics
6. 💳 Test payment flow (test mode)

## 🤝 Contributing

This is a protected project. For collaboration inquiries, contact the team.

### Development Guidelines
- Follow TypeScript strict mode
- Use ESLint and Prettier configurations
- Write meaningful commit messages
- Test all database changes locally
- Document new features in `/docs`

## 📊 Project Stats

- **Lines of Code**: 15,000+
- **Components**: 23 React components
- **Database Tables**: 10+
- **Edge Functions**: 3
- **SQL Scripts**: 32
- **Documentation Files**: 20+

## 🗺️ Roadmap

### Completed ✅
- ✅ Full Supabase backend integration
- ✅ Stripe payment processing
- ✅ AI-powered marketing tools
- ✅ Geospatial event discovery
- ✅ QR ticket system
- ✅ Admin command center
- ✅ Multi-tier subscriptions
- ✅ GDPR compliance

### In Progress 🚧
- 🚧 Mobile app (React Native)
- 🚧 Email notification system
- 🚧 Social media sharing
- 🚧 Event recommendations engine

### Planned 📋
- 📋 Push notifications
- 📋 Calendar integration
- 📋 Multi-language UI
- 📋 Advanced analytics dashboard
- 📋 Event livestreaming

## 📧 Contact & License

**Project**: EventNexus - Intelligent Event Discovery Platform  
**Author**: EventNexus Development Team  
**Email**: huntersest@gmail.com  
**Repository**: https://github.com/pikkst/EventNexus

### License & Usage
⚠️ **Fully Protected Project**
- All code and data are proprietary
- Do not use for third-party or commercial purposes without permission
- Data usage restricted to EventNexus functionality only
- No replication or redistribution allowed

### Support
For issues, feature requests, or collaboration:
1. Open an issue on GitHub
2. Email: huntersest@gmail.com
3. Include detailed description and reproduction steps

---

<div align="center">

**Built with** ❤️ **using React, Supabase, and Google Gemini**

[View Live Demo](https://pikkst.github.io/EventNexus/) • [Documentation](docs/) • [Report Bug](https://github.com/pikkst/EventNexus/issues)

Original AI Studio App: https://ai.studio/apps/drive/17KMoj3ueRhvdwmTUY8gPyW72wexD5tHG

</div>
