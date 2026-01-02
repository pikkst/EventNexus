# Quick Reference: Professional Ad Campaign Creator

## Access Points

### 👤 For Users (Pro+ Tiers)
**Location**: Dashboard → Marketing Studio → "Professional Video Ads" button
**URL**: `/#/dashboard` (Marketing Studio tab)
**Cost**: 200 credits per video
**Requirements**: Pro, Premium, or Enterprise tier

### 👨‍💼 For Admins
**Location**: Direct route `/admin/platform-ads`
**URL**: `/#/admin/platform-ads`
**Cost**: FREE (no credit deduction)
**Use**: Platform marketing videos

## Component Props

```typescript
<ProfessionalAdCampaignCreator
  user={user}              // Required: User object
  event={event}            // Optional: Event to promote
  isAdmin={true}           // Optional: Admin mode (no credits)
  onClose={() => {}}       // Optional: Close callback
/>
```

## Generation Flow

```
1. INPUT           → URL, platform, format selection
2. ANALYZING       → Brand DNA + Google Search (10-15s)
3. SCENE_1         → Hook generation (30-45s)
4. SCENE_2         → Journey extension (30-45s)
5. SCENE_3         → Insight extension (30-45s)
6. SCENE_4         → Power extension (30-45s)
7. AUDIO           → Voiceover + finale (30-45s)
8. COMPLETED       → Download + share ready

Total: ~3-5 minutes
```

## Output Package

- **Video**: 60s MP4 (720p)
- **Audio**: Professional voiceover (Charon voice)
- **Social Copy**:
  - Headline
  - Body text
  - Call-to-action
  - 4-6 hashtags
- **Sources**: 3-5 research links

## API Models Used

- `gemini-3-pro-preview` - Analysis
- `veo-3.1-generate-preview` - Video
- `gemini-2.5-flash-preview-tts` - Audio

## Credit System

```typescript
const CREDIT_COST = 200;

// User flow
if (!isAdmin) {
  const hasCredits = await checkUserCredits(user.id, 200);
  if (!hasCredits) return alert('Insufficient credits');
  
  // After success
  await deductUserCredits(user.id, 200);
}
```

## Tier Gating

```typescript
const hasAccess = 
  isAdmin || 
  user.subscription_tier === 'pro' || 
  user.subscription_tier === 'premium' || 
  user.subscription_tier === 'enterprise';
```

## Key Files

- `/components/ProfessionalAdCampaignCreator.tsx` - Main component
- `/services/geminiService.ts` - Generation functions
- `/components/Dashboard.tsx` - Integration point
- `/App.tsx` - Admin route

## Routes

```typescript
// Admin route (free, no credits)
/admin/platform-ads

// User route (modal in Dashboard)
/#/dashboard → Marketing Studio tab → "Create Video Ad" button
```

## Testing Commands

```bash
# Check for errors
npm run build

# Run dev server
npm run dev

# Access points
http://localhost:3000/#/dashboard
http://localhost:3000/#/admin/platform-ads
```

## Common Patterns

### Opening the Creator (User Mode)
```typescript
// In Dashboard component
const [showProfessionalAdCreator, setShowProfessionalAdCreator] = useState(false);
const selectedEvent = events.find(e => e.id === selectedEventId);

// Button
<button onClick={() => setShowProfessionalAdCreator(true)}>
  Create Video Ad (200 Credits)
</button>

// Modal
{showProfessionalAdCreator && selectedEvent && (
  <ProfessionalAdCampaignCreator
    user={user}
    event={selectedEvent}
    onClose={() => setShowProfessionalAdCreator(false)}
  />
)}
```

### Admin Route
```typescript
// In App.tsx
<Route 
  path="/admin/platform-ads" 
  element={
    user?.role === 'admin' 
      ? <ProfessionalAdCampaignCreator user={user} isAdmin={true} /> 
      : <LandingPage ... />
  } 
/>
```

## Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| "Insufficient credits" | User has < 200 credits | Buy credits or upgrade |
| "API Quota Exceeded" | Gemini limit reached | Use different API key |
| "Video generation failed" | Veo error | Retry or check logs |
| "Requires Pro tier" | Free tier user | Upgrade subscription |

## Environment Setup

```bash
# .env.local
GEMINI_API_KEY=your_key_here
VITE_SUPABASE_URL=https://anlivujgkjmajkcgbaxw.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Platform URLs

- **Production**: https://www.eventnexus.eu
- **Admin Ads**: https://www.eventnexus.eu/#/admin/platform-ads
- **Dashboard**: https://www.eventnexus.eu/#/dashboard

## Support

- **Email**: huntersest@gmail.com
- **Docs**: `/docs/PROFESSIONAL_AD_CAMPAIGN_INTEGRATION.md`
- **Help**: `/#/help`

---

*Last Updated: January 2, 2026*
