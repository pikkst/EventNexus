<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# EventNexus - Intelligent Event Discovery Platform

🎯 **Production-ready event platform** with AI-powered features, geospatial search, and real-time notifications.

## ✨ Features

- 🗺️ **Geospatial Event Discovery** - PostGIS-powered location-based search
- 🔔 **Proximity Radar** - Real-time notifications for nearby events
- 🎫 **QR Ticket System** - Secure ticket generation and validation
- 📊 **Analytics Dashboard** - Comprehensive event and platform statistics
- 🤖 **AI Integration** - Gemini-powered marketing and chat features
- 🔐 **Row Level Security** - Enterprise-grade data protection
- ⚡ **Real-time Updates** - Live notifications and event changes

## 🚀 Quick Start

**Prerequisites:** Node.js 18+, Supabase account

1. **Clone and Install**
   ```bash
   git clone https://github.com/pikkst/EventNexus.git
   cd EventNexus
   npm install
   ```

2. **Setup Environment**
   
   Create `.env.local`:
   ```env
   VITE_SUPABASE_URL=https://anlivujgkjmajkcgbaxw.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   GEMINI_API_KEY=your_gemini_key
   ```

3. **Deploy Backend**
   
   See detailed instructions in [DEPLOYMENT.md](DEPLOYMENT.md)
   - Apply SQL migrations in Supabase SQL Editor
   - Deploy Edge Functions with `./supabase/deploy-functions.sh`

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
EventNexus/
├── supabase/              # Backend infrastructure
│   ├── migrations/        # SQL schemas (run in SQL Editor)
│   └── functions/         # Edge Functions (deploy with CLI)
├── services/              # API services
│   ├── dbService.ts       # Database operations
│   ├── geminiService.ts   # AI integration
│   └── supabase.ts        # Supabase client
├── components/            # React components
└── constants.tsx          # Platform configuration
```

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript + Vite 6
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Geospatial**: PostGIS extension
- **AI**: Google Gemini API
- **Maps**: Leaflet + React Leaflet
- **Routing**: React Router v7

## 🔐 Security

- Row Level Security (RLS) on all tables
- JWT-based authentication
- Admin/organizer role-based access
- Encrypted data transmission

## 📦 No Mock Data

This is a **production-ready** application with **zero mock data**:
- ✅ All data from Supabase database
- ✅ Real-time Edge Functions
- ✅ Live analytics and statistics
- ✅ Actual geospatial queries

## 📖 Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) - Complete deployment guide
- [supabase/README.md](supabase/README.md) - Backend documentation
- [.github/copilot-instructions.md](.github/copilot-instructions.md) - Development guidelines

## 🌐 Live Demo

Deployed at: https://pikkst.github.io/EventNexus/

## 📧 Contact

**Author**: EventNexus Team  
**Email**: huntersest@gmail.com  
**License**: Fully protected - do not use code/data for third-party purposes

---

View original AI Studio app: https://ai.studio/apps/drive/17KMoj3ueRhvdwmTUY8gPyW72wexD5tHG
