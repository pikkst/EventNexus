# EventNexus - Organized Folder Structure

## Root Directory Organization

The workspace has been reorganized for better maintainability and clarity:

### Root Level Files (Configuration & Entry Points)
```
├── index.html                 # Main HTML entry point
├── package.json              # Node.js dependencies
├── package-lock.json         # Locked dependency versions
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite build configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── postcss.config.js        # PostCSS configuration
├── .env.local              # Local environment variables (git-ignored)
├── .env.test               # Test environment variables
├── .gitignore              # Git ignore rules
├── LICENSE.md              # Project license
└── README.md               # Project documentation
```

### Main Directories

#### `/src/` - Source Code (Main Application)
All TypeScript/React source code is organized here:
```
src/
├── App.tsx                 # Root React component with routing
├── index.tsx              # Application entry point
├── types.ts               # TypeScript type definitions
├── constants.tsx          # Application constants
├── components/            # Reusable React components
│   ├── AdminCommandCenter.tsx
│   ├── AuthModal.tsx
│   ├── ChatBot.tsx
│   ├── Dashboard.tsx
│   └── ... (60+ more components)
├── services/              # Business logic & API calls
│   ├── dbService.ts       # Database operations (Supabase)
│   ├── geminiService.ts   # AI/Gemini integration
│   ├── supabase.ts        # Supabase client config
│   └── ... (more services)
├── styles/                # Global styles
│   └── tailwind.css       # Tailwind CSS imports
└── utils/                 # Utility functions
    ├── exports.ts
    ├── helpers.ts
    └── ... (utility modules)
```

#### `/docs/` - Documentation
All markdown documentation files:
```
docs/
├── ACCESSIBILITY_PATTERNS.md
├── AI_AGENT_IMPROVEMENTS_DEPLOYMENT.md
├── ARCHITECTURE_EVENT_INDEXING.md
├── DEPLOYMENT.md
├── SELF_HEALING_CITY_SYSTEM.md
└── ... (50+ documentation files)
```

#### `/scripts/` - Test Scripts & Utilities
Shell scripts, test files, and automation:
```
scripts/
├── test-full-pipeline.sh
├── test-geocoding-improvement.sh
├── check_cron_function.mjs
├── bootstrap-result.json
└── ... (test and utility scripts)
```

#### `/sql/` - Database Queries & Migrations
SQL scripts for database operations:
```
sql/
├── activate_cron_jobs.sql
├── check_ai_event_locations.sql
├── check_rls_policies.sql
├── enable_realtime_events.sql
└── ... (database setup scripts)
```

#### `/supabase/` - Backend Configuration
Supabase Edge Functions and migrations:
```
supabase/
├── functions/              # Edge Functions (Deno)
├── migrations/            # Database migrations
└── config.toml           # Supabase configuration
```

#### `/public/` - Static Assets
Public files served directly:
```
public/
├── favicon.ico
└── ... (static assets)
```

#### `/mobile/` - Mobile App Code
React Native or mobile-specific code:
```
mobile/
└── ... (mobile app implementation)
```

#### `/dist/` - Build Output
Generated during `npm run build`:
```
dist/
├── index.html
├── assets/               # Compiled JS/CSS bundles
└── ... (production build artifacts)
```

### Hidden Directories
```
.github/                   # GitHub configuration
.git/                     # Git repository
.devcontainer/            # Dev container configuration
node_modules/             # Installed dependencies
```

## Key Configuration Files

| File | Purpose |
|------|---------|
| `vite.config.ts` | Build tool configuration, path aliases, env variables |
| `tsconfig.json` | TypeScript compiler options, path mappings |
| `tailwind.config.js` | Tailwind CSS theme & plugin configuration |
| `package.json` | Project metadata, scripts, dependencies |

## Path Aliases

The `@/` alias resolves to `./src/`:
- `@/components/Button` → `src/components/Button`
- `@/services/dbService` → `src/services/dbService`
- `@/types` → `src/types`
- `@/utils/helpers` → `src/utils/helpers`

This makes imports cleaner and refactoring easier.

## Development Workflow

```bash
# Start development server (port 3000)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Type checking
npx tsc --noEmit
```

## Import Examples

### Good Practices ✓
```typescript
// Using @ alias
import { Button } from '@/components/ui/Button';
import { getEvents } from '@/services/dbService';
import type { EventNexusEvent } from '@/types';
import { formatDate } from '@/utils/helpers';
```

### Folder Organization Principles

1. **Separation of Concerns**: Code is organized by function (components, services, utils)
2. **Documentation**: All project docs in `/docs/` for easy access
3. **Scalability**: Clear structure allows adding features without confusion
4. **Build Artifacts**: Generated files separate from source
5. **Scripts**: All test/utility scripts in `/scripts/`
6. **Database**: SQL migrations and Edge Functions in `/supabase/`

## Directory Stats

- **Source Files**: ~60 React components
- **Documentation**: 50+ markdown files
- **Services**: Database, AI, Auth, Social Media integrations
- **Utilities**: Helpers, validators, export functions
- **Database**: SQL migrations, RLS policies, Edge Functions

---

Last Updated: January 14, 2026
