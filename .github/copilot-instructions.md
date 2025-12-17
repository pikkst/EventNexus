# Copilot Instructions for EventNexus

These instructions help AI coding agents work productively in this repo.

## Architecture
- **Stack:** Vite 6 + React 19 + TypeScript. Router uses `HashRouter` (`App.tsx`).
- **Entry:** `index.tsx` mounts `App` into `#root`. Dev server runs on port `3000`.
- **Routing:** Top-level routes are declared in `App.tsx` via `react-router-dom@7`. Some routes are gated by `user`/`role` state (e.g., `/admin`, `/dashboard`).
- **State:** No global store; local React state lifts through `App.tsx` and is passed via props to components.
- **Data:** Mock data in `constants.tsx` (`CATEGORIES`, `MOCK_EVENTS`). Types in `types.ts` (e.g., `EventNexusEvent`, `User`, `Notification`).
- **Notifications:** Proximity radar uses geolocation (`navigator.geolocation.watchPosition`) in `App.tsx` to push `Notification`s into state.
- **UI:** Functional components under `components/`. Icons: `lucide-react`. Map: `react-leaflet`/`leaflet` used in `components/HomeMap.tsx`.

## AI Integration
- **Library:** `@google/genai` wired via `services/geminiService.ts`.
- **Env:** Set `GEMINI_API_KEY` in `.env.local`. Vite injects it as `process.env.API_KEY` and `process.env.GEMINI_API_KEY` (see `vite.config.ts`).
- **Patterns:**
  - Prefer calling service helpers instead of direct SDK usage:
    - `generatePlatformGrowthCampaign(theme, target)` → JSON via `responseSchema`.
    - `generateAdImage(prompt, aspectRatio?)` → returns `data:image/png;base64,...` (inline PNG) or `null`.
    - `generateMarketingTagline(name, category)` → short string.
    - `translateDescription(text, lang)` → translated string.
    - `generateAdCampaign(name, description, objective)` → array of ad objects.
    - `createNexusChat()` → streaming chat; see `components/ChatBot.tsx` using `sendMessageStream` to update UI incrementally.
  - Handle failures gracefully: functions return `null`/fallbacks and log to console.

## Developer Workflows
- **Install:** `npm install`
- **Run Dev:** `npm run dev` (served at `http://localhost:3000`)
- **Build:** `npm run build`
- **Preview:** `npm run preview`
- **Env Setup:** create `.env.local` with `GEMINI_API_KEY=...` at repo root. Vite `loadEnv` is configured in `vite.config.ts`.

## Conventions & Patterns
- **Routing:** Keep `HashRouter` and route guards consistent with `user` state; use `LandingPage` for unauthenticated redirects.
- **Types-first:** Use `types.ts` interfaces for events, users, notifications; avoid ad-hoc shapes.
- **Services Boundary:** Extend `services/geminiService.ts` for new AI features instead of calling `@google/genai` directly in components.
- **Notifications:** Use `Notification` shape and helpers in `App.tsx` (`handleMarkRead`, `handleDeleteNotification`, `handleAddNotification`).
- **IDs:** New notifications use `Math.random().toString(36)`; events are mocked in `constants.tsx`.
- **Icons/UI:** Use `lucide-react` icons with consistent sizes; follow existing functional component style.

## Examples
- **Generate tagline in a component:**
  ```ts
  import { generateMarketingTagline } from '@/services/geminiService';
  const tagline = await generateMarketingTagline(event.name, event.category);
  setTagline(tagline);
  ```
- **Streaming chat (see `components/ChatBot.tsx`):**
  ```ts
  const chat = createNexusChat();
  const stream = await chat.sendMessageStream({ message: userInput });
  for await (const chunk of stream) {
    // append chunk.text to UI
  }
  ```
- **Env usage:** ensure `.env.local` contains `GEMINI_API_KEY` and avoid hardcoding keys in source.

## Key Files
- `App.tsx`: routes, auth gating, notifications, layout.
- `services/geminiService.ts`: all Gemini calls and response schemas.
- `types.ts`: core domain types.
- `constants.tsx`: categories + mock events.
- `vite.config.ts`: env injection, aliases (`@` → project root).

## Do/Don’t for Agents
- **Do:** add new AI features in `services/geminiService.ts` and consume via components.
- **Do:** keep route protection patterns intact; reuse `LandingPage` for auth prompts.
- **Don’t:** access `@google/genai` directly from components; use the service.
- **Don’t:** introduce global state without need; follow local state + props pattern in `App.tsx`.

## Troubleshooting (Gemini)
- **Missing key:** 401/403 or empty responses → ensure `.env.local` has `GEMINI_API_KEY`, restart dev (`Ctrl+C`; `npm run dev`). Confirm `vite.config.ts` injects it to `process.env.API_KEY`.
- **Streaming fails:** In `components/ChatBot.tsx`, `sendMessageStream` may error on network/ad-blockers. Catch already logs; re-init chat with `createNexusChat()` after failures.
- **Model mismatch:** Preview models (`gemini-3-*`) may be limited. If errors persist, try `gemini-2.5-flash` variants where compatible.
- **CORS/browser:** If inline image data isn’t returned by `generateAdImage`, check console; ad blockers can block streaming/image parts.

## Routing & Auth Gating
- **Add a gated route:** In `App.tsx` `Routes`, use `user ? <YourComponent /> : <LandingPage user={user} onOpenAuth={...} />` for authenticated views.
- **Admin-only:** Gate with `user?.role === 'admin' ? <AdminView /> : <LandingPage ... />` (see `/admin`).
- **Props flow:** Pass data/actions from `App.tsx` into components via props (no global store). Follow patterns in `Dashboard`, `UserProfile`.
- **Nav entries:** Add `SidebarItem` and any `Navbar` actions consistently (icon from `lucide-react`, text sizes/styles match existing).

## Supabase Integration
- **Project:** Name `EventNexus`; URL `https://anlivujgkjmajkcgbaxw.supabase.co`; ID `anlivujgkjmajkcgbaxw`.
- **Tables:** `users`, `events`, `notifications`, `tickets` with RLS policies enabled.
- **Client:** `services/supabase.ts` using `@supabase/supabase-js`.
- **Database Functions:** `services/dbService.ts` provides typed CRUD operations:
  - Events: `getEvents()`, `createEvent()`, `updateEvent()`, `deleteEvent()`
  - Users: `getUser()`, `createUser()`, `updateUser()`
  - Notifications: `getNotifications()`, `createNotification()`, `markNotificationRead()`, `deleteNotification()`
  - Auth: `signInUser()`, `signOutUser()`, `getCurrentUser()`
- **Env:** Set in `.env.local`:
  ```
  VITE_SUPABASE_URL=https://anlivujgkjmajkcgbaxw.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFubGl2dWpna2ptYWprY2diYXh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5OTY0OTQsImV4cCI6MjA4MTU3MjQ5NH0.5SzkZg_PMqgdMClS1ftg4ZT_Ddyq1zOi-ZOLe1yuRgY
  GEMINI_API_KEY=***REMOVED***
  ```
- **Pattern:** All components use real database calls via `services/dbService.ts`. No mock data expansion.
- **Usage:** `App.tsx` loads user/events on mount; real-time data flows through state management.

## Deployment Notes
- **Build:** `npm run build` → static assets in `dist/`.
- **Preview:** `npm run preview` for local sanity.
- **Static hosting:** Works with Netlify/Vercel/GitHub Pages (HashRouter already set). Configure build command `npm run build` and publish directory `dist`.

## GitHub Pages Deployment
- **Set Vite base:** In `vite.config.ts`, set `base: '/EventNexus/'` for asset paths on Pages. Example:
  ```ts
  export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/EventNexus/',
      server: { port: 3000, host: '0.0.0.0' },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: { alias: { '@': path.resolve(__dirname, '.') } }
    };
  });
  ```
- **Workflow (recommended):** Add `.github/workflows/deploy.yml` to build and deploy `dist/` to Pages:
  ```yaml
  name: Deploy to GitHub Pages
  on:
    push:
      branches: [ main ]
  permissions:
    contents: write
    pages: write
    id-token: write
  jobs:
    build:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version: '20' }
        - run: npm ci
        - run: npm run build
        - uses: actions/upload-pages-artifact@v3
          with: { path: 'dist' }
    deploy:
      needs: build
      runs-on: ubuntu-latest
      steps:
        - uses: actions/deploy-pages@v4
  ```
- **Manual publish:** Push `dist/` to `gh-pages` branch using an action like `peaceiris/actions-gh-pages` if preferred.

## No Mock Data Policy
- **Requirement:** Do not introduce new mock data or placeholder content. Implement features with live, fully functional data sources.
- **Current state:** `constants.tsx` includes `MOCK_EVENTS`. Do not expand this; prefer service-backed data.
- **Pattern:** Use a backend like Supabase or a trusted API and surface data via typed helpers in `services/`, consumed through `App.tsx` props flow.
- **Env:** Prefer `import.meta.env.VITE_*` for new integrations. Document required keys in `.env.local` and handle failures gracefully.

## Data & License Policy
- **License:** Fully protected. Do not use project code/data for any third-party or private purposes.
- **Data usage:** Only access and process data required for EventNexus functionality. Do not export, replicate, or reuse production data outside approved workflows.
- **Secrets:** Never commit or print secrets. Keep `.env.local` local; use `VITE_*` envs for client-side configuration.
- **Privacy:** Avoid logging PII. Respect service boundaries (`services/`) for external calls.

## Maintainer Contact
- Primary email: `huntersest@gmail.com` (incidents/security/ops).
