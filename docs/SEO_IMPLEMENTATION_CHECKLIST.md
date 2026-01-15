# SEO Implementation Checklist

This checklist shows which components should integrate SEO optimization. Components marked with ✅ are already optimized or planned.

## Public Pages (Should Have SEO)

### Homepage & Discovery
- [ ] **LandingPage** (`/`) 
  - Needs: `usePageSEO()` with homepage metadata
  - Priority: HIGH
  
- [ ] **HomeMap** (`/map`)
  - Needs: `usePageSEO()` with map discovery metadata
  - Priority: HIGH

### Event Pages
- [ ] **EventDetail** (`/event/:id`, `/events/:id`)
  - Needs: `useEventSEO()` hook
  - Creates: Event schema with full metadata
  - Priority: CRITICAL

- [ ] **EventEditPage** (`/events/:id/edit`)
  - Needs: `noindex` meta tag (user-specific)
  - Current: Should be blocked

### Organizer/Agency Pages
- [ ] **AgencyProfile** (`/org/:slug`, `/agency/:slug`)
  - Needs: `useOrganizationSEO()` hook
  - Creates: Organization schema
  - Priority: HIGH

### Information Pages
- [ ] **PricingPage** (`/pricing`)
  - Needs: `usePageSEO()` with pricing details
  - Priority: MEDIUM

- [ ] **MobileAppsPage** (`/mobile`)
  - Needs: `usePageSEO()` with app info
  - Priority: MEDIUM

- [ ] **BetaInvitation** (`/beta`, `/beta-signup`)
  - Needs: `usePageSEO()` with beta info
  - Priority: LOW

- [ ] **HelpCenter** (`/help`)
  - Needs: `usePageSEO()` with FAQ schema
  - Priority: MEDIUM

- [ ] **TermsOfService** (`/terms`)
  - Needs: `usePageSEO()` with legal metadata
  - Priority: LOW

- [ ] **PrivacyPolicy** (`/privacy`)
  - Needs: `usePageSEO()` with privacy metadata
  - Priority: LOW

## Private Pages (Should NOT Be Indexed)

### User-Specific
- ✅ **Dashboard** (`/dashboard`)
  - Status: Blocked in robots.txt
  - Should have: `noindex, nofollow`

- ✅ **UserProfile** (`/profile`)
  - Status: Blocked in robots.txt
  - Should have: `noindex, nofollow`

- ✅ **TicketScanner** (`/scanner`)
  - Status: Blocked in robots.txt
  - Should have: `noindex, nofollow`

- ✅ **TicketViewPage** (`/ticket`, `/ticket/:id`)
  - Status: Blocked in robots.txt
  - Should have: `noindex, nofollow`

- ✅ **CodeRedemption** (internal)
  - Status: Should block via code

### Event Creation/Management
- ✅ **EventCreationFlow** (`/create`, `/create-event`)
  - Status: Blocked in robots.txt
  - Should have: `noindex, nofollow`

### Admin Pages
- ✅ **AdminCommandCenter** (`/admin`)
  - Status: Blocked in robots.txt
  - Should have: `noindex, nofollow`

- ✅ **AIAgentDashboard** (`/admin/ai-agents`)
  - Status: Blocked in robots.txt
  - Should have: `noindex, nofollow`

- ✅ **AdminCreditManager** (admin route)
  - Status: Blocked in robots.txt
  - Should have: `noindex, nofollow`

- ✅ **SimplifiedSocialMediaManager** (internal)
  - Status: Should block via code

## Implementation Priority

### Phase 1 (CRITICAL - Do First)
1. Update `EventDetail` - Use `useEventSEO()`
2. Update `LandingPage` - Use `usePageSEO()`
3. Update `HomeMap` - Use `usePageSEO()`
4. Verify private pages show `noindex` meta tags

### Phase 2 (HIGH)
1. Update `AgencyProfile` - Use `useOrganizationSEO()`
2. Update `PricingPage` - Use `usePageSEO()`
3. Update `MobileAppsPage` - Use `usePageSEO()`

### Phase 3 (MEDIUM)
1. Update `HelpCenter` - Use `usePageSEO()` + FAQ schema
2. Update `BetaInvitation` - Use `usePageSEO()`
3. Add cookie/privacy pages to meta optimization

## Implementation Template

For **public pages**, use this template:

```tsx
import { usePageSEO } from '@/hooks/useSEO';

export const MyPublicPage = () => {
  usePageSEO({
    path: '/my-page',
    title: 'My Page Title',
    description: 'Clear, descriptive text (160 chars max)',
    image: 'https://www.eventnexus.eu/image.png',
    type: 'website'
  });

  return (
    <main>
      <h1>My Page Title</h1>
      {/* Content */}
    </main>
  );
};
```

For **event pages**, use this template:

```tsx
import { useEventSEO } from '@/hooks/useSEO';

export const EventDetail = ({ event }) => {
  useEventSEO(event);

  return (
    <article>
      <h1>{event.name}</h1>
      {/* Event content */}
    </article>
  );
};
```

For **private pages**, ensure noindex:

```tsx
import { useSEO } from '@/hooks/useSEO';

export const Dashboard = () => {
  useSEO({ noindex: true });

  return <div>Private Dashboard</div>;
};
```

## Verification Steps

After implementing SEO on a component:

1. ✅ View page source - check meta tags updated
2. ✅ Open DevTools Console - no SEO errors
3. ✅ Inspect `<script type="application/ld+json">` - valid JSON-LD
4. ✅ Test on [schema.org validator](https://validator.schema.org/)
5. ✅ Check robots.txt allows the page
6. ✅ Test with different data (public, admin, private routes)

## Testing Checklist

### For Public Event Pages
- [ ] Title shows event name
- [ ] Description shows event summary
- [ ] Image shows event image
- [ ] robots meta allows indexing
- [ ] JSON-LD valid and complete
- [ ] Location/geo data included if available
- [ ] Pricing info included if available

### For Private Pages
- [ ] robots meta shows `noindex, nofollow`
- [ ] Still blocked in robots.txt
- [ ] No sensitive data in meta tags
- [ ] No JSON-LD exposed

### For Organizer Pages
- [ ] Organization name in title
- [ ] Organization description in meta
- [ ] Organization logo in image tag
- [ ] Link to organizer website if available

## Notes

- All SEO updates are **non-breaking** - components work without hooks
- SEO is **automatic** - no manual meta tag management needed
- Changes are **retroactive** - all crawlers see updates on next index
- Performance **zero impact** - utilities run on initial load only
- Admin protection is **enforced** - via robots.txt + noindex meta tags

## Questions?

Refer to:
- [AI_SEARCH_OPTIMIZATION.md](./AI_SEARCH_OPTIMIZATION.md) - Full guide
- `src/services/seoService.ts` - Schema generation
- `src/hooks/useSEO.ts` - Hook implementations
- `src/utils/aiSearchOptimization.ts` - AI utils
