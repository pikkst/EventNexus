# EventNexus Performance Action Plan - January 2026

## Executive Summary

**Current State**: EventNexus is experiencing severe performance issues with Lighthouse mobile scores of only 26-33/100.

**Root Cause**: 
- Massive JavaScript bundle (706 MB uncompressed, 365 KB for main alone)
- No route-based code splitting for heavy features
- Large unused code loaded on every page (Gemini, Charts, Maps)
- Network payload of 4.73 MB

**Solution**: Implemented aggressive code splitting and vendor library separation.

**Expected Improvement**: 60-80% reduction in initial load, improving LCP from 15.9s to ~2.5s.

---

## Phase 1: Completed ✅

### Changes Made
1. **Vite Configuration Enhanced** (`vite.config.ts`)
   - Separated vendor libraries into individual chunks
   - Added terser optimization with multiple passes
   - Enabled CSS code splitting

2. **Bundle Structure Optimized**
   - `vendor-react`: 173 KB (57 KB gz) - React + router
   - `vendor-supabase`: 167 KB (42 KB gz) - Database client
   - `vendor-charts`: 429 KB (110 KB gz) - Recharts (lazy)
   - `vendor-ai`: 262 KB (47 KB gz) - Gemini SDK (lazy)
   - `vendor-geo`: 153 KB (44 KB gz) - Maps (lazy)
   - `vendor-qr`: 40 KB (15 KB gz) - QR scanning (lazy)

3. **Resource Hints Added** (`index.html`)
   - DNS prefetch for third-party services
   - Preconnect for Supabase and APIs

4. **Performance Utilities Created** (`src/utils/performanceOptimization.ts`)
   - Image lazy loading with Intersection Observer
   - Third-party script deferral
   - Passive event listeners
   - Core Web Vitals monitoring hooks

5. **App Initialization Updated** (`src/App.tsx`)
   - Performance optimizations auto-initialize
   - Lazy loading utilities engaged on app startup

### Files Changed
- `vite.config.ts` - Build optimization
- `index.html` - Resource hints
- `src/App.tsx` - Performance init
- `src/utils/performanceOptimization.ts` - NEW utilities
- `docs/PERFORMANCE_OPTIMIZATION.md` - NEW guide
- `docs/SERVER_CONFIGURATION.md` - NEW deployment guide

### Expected Impact (Estimated)
- **Main bundle**: 365 KB → 196 KB (46% reduction)
- **LCP**: 15.9s → 4.0-5.0s (initial estimate)
- **FCP**: 3.7s → 1.8-2.0s
- **Homepage payload**: Reduced by ~1.2 MB (67%)

---

## Phase 2: Testing & Validation (NEXT)

### Week 1: Local Verification
```bash
cd /workspaces/EventNexus
npm run build
npm run preview
# Open http://localhost:4173
# Run Chrome Lighthouse audit
```

**Success Criteria**:
- ✓ Bundle builds without errors
- ✓ All routes load correctly
- ✓ Lazy chunks load on demand
- ✓ Network tab shows parallel chunk loading

### Week 2: Production Deployment
1. Merge performance branch
2. Deploy to staging
3. Run PageSpeed Insights
4. Monitor Real User Metrics

---

## Phase 3: Further Optimizations (Planned)

### 3.1 Image Optimization (High Impact)
**Current Status**: ❌ Not optimized

**Action Items**:
1. Install image optimization deps:
   ```bash
   npm install --save-dev @vitejs/plugin-legacy sharp
   ```

2. Create image optimization plugin
3. Convert PNG/JPG to WebP/AVIF
4. Add responsive image srcset

**Expected Improvement**: 
- LCP: -1-2 seconds
- Payload: -30-50%

### 3.2 Dashboard Sub-routing (Medium Impact)
**Current Status**: Dashboard is 706 KB, too large

**Action Items**:
1. Split Dashboard analytics into separate routes
2. Create `DashboardAnalytics` component
3. Lazy load charts only when tab is active
4. Split user profile management to separate lazy route

**Expected Improvement**:
- Dashboard initial load: -300-400 KB
- TTI: -1-2 seconds

### 3.3 Third-Party Script Optimization (Medium Impact)
**Current Status**: Analytics scripts loaded synchronously

**Action Items**:
1. Move Google Analytics to async
2. Defer Meta Pixel to requestIdleCallback
3. Lazy load error tracking (Sentry)

**Expected Improvement**:
- TTI: -500ms-1s
- Main thread blocking: -30%

### 3.4 Critical CSS Inlining (Low Impact)
**Current Status**: CSS files are separate requests

**Action Items**:
1. Extract critical CSS for above-the-fold
2. Inline in HTML head
3. Lazy load remaining styles

**Expected Improvement**:
- FCP: -200-500ms

### 3.5 Service Worker & Offline (Low Priority)
**Current Status**: Not implemented

**Action Items**:
1. Create service worker
2. Cache critical assets
3. Enable offline mode for maps

**Expected Improvement**:
- Repeat visitor load time: -70%

---

## Phase 4: Monitoring (Ongoing)

### Real User Monitoring Setup
```tsx
// In App.tsx after performance init
if ('PerformanceObserver' in window) {
  const observer = new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    entries.forEach((entry) => {
      console.log(`${entry.name}: ${entry.duration}ms`);
      // Send to analytics
    });
  });
  observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input'] });
}
```

### Monitoring Tools
1. **Google PageSpeed Insights** - Weekly automated tests
2. **WebPageTest** - Deep performance analysis
3. **Chrome DevTools Lighthouse** - Local validation
4. **Sentry** - Real error tracking

### Key Metrics to Track
- **LCP**: Target < 2.5 seconds (currently 15.9s)
- **FCP**: Target < 1.8 seconds (currently 3.7s)
- **CLS**: Target < 0.1 (currently 0.36-0.51)
- **TTFB**: Target < 600ms (currently unknown)
- **Bundle Size**: Target < 600 KB gzipped

---

## Deployment Checklist

### Before Production Deployment
- [ ] Local build succeeds: `npm run build`
- [ ] Local preview works: `npm run preview`
- [ ] Lighthouse score > 70 on local
- [ ] All routes accessible
- [ ] No console errors
- [ ] Network waterfall looks good (chunks load in parallel)

### Production Deployment
- [ ] Code merged to main
- [ ] Deploy to staging first
- [ ] Run PageSpeed Insights on staging
- [ ] Verify all features work
- [ ] Deploy to production
- [ ] Monitor error rates (Sentry)
- [ ] Check Real User Metrics (GA)

### Post-Deployment Monitoring
- [ ] Check Google PageSpeed Insights score
- [ ] Monitor Real User Metrics in GA
- [ ] Watch for error spikes in Sentry
- [ ] Collect user feedback
- [ ] A/B test if needed

---

## Risk Mitigation

### Potential Issues & Solutions

| Issue | Probability | Impact | Mitigation |
|-------|-------------|--------|-----------|
| Module not loading | Low | High | Proper error boundaries, fallbacks |
| Lazy load too slow | Medium | Medium | Prefetch on idle, show skeleton |
| Cache issues | Low | Medium | Cache busting with hashes |
| Route bugs after split | Medium | Medium | Thorough testing before deploy |
| Browser compatibility | Low | Low | Polyfill/transpile when needed |

---

## Success Metrics

### Lighthouse Scores (Target)
| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Performance | 26-33 | 75+ | 🎯 In Progress |
| Accessibility | 88 | 90+ | ✓ Maintain |
| Best Practices | 82 | 90+ | ✓ Maintain |
| SEO | 100 | 100 | ✓ Maintain |

### Core Web Vitals (Target)
| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| LCP | 15.9s | 2.5s | 🎯 In Progress |
| FCP | 3.7s | 1.8s | 🎯 In Progress |
| CLS | 0.36-0.51 | 0.1 | 🎯 In Progress |
| TBT | 616ms | 200ms | 🎯 In Progress |

---

## Communication Plan

### Team Updates
- **Daily**: Monitor build/deploy status
- **Weekly**: Lighthouse score report
- **Bi-weekly**: Performance metrics review

### User Communication
- **Post-deployment**: "We've improved load times by 50%"
- **Performance updates**: Include in changelog
- **Incident response**: Use Sentry alerts

---

## Budget & Timeline

### Phase 1: Code Splitting ✅ COMPLETE
- **Timeline**: 1-2 hours
- **Status**: ✅ Done
- **Resources**: Minimal

### Phase 2: Testing & Validation
- **Timeline**: 1-2 days
- **Status**: 🔄 Next
- **Resources**: QA testing

### Phase 3: Further Optimizations
- **Timeline**: 2-3 weeks (parallel work)
- **Status**: ⏳ Planned
- **Resources**: Developer time

### Phase 4: Monitoring (Ongoing)
- **Timeline**: Continuous
- **Status**: ⏳ Planned
- **Resources**: Monitoring infrastructure

---

## Conclusion

The implemented code splitting strategy significantly reduces the initial JavaScript bundle by separating vendor libraries and lazy-loading heavy features. This should improve:

- ✅ **Time to Interactive**: From 12+ seconds to 2.5-3.0 seconds
- ✅ **First Contentful Paint**: From 3.7s to 1.8s
- ✅ **Lighthouse Score**: From 26-33 to estimated 70-80+

The foundation is now in place for further optimizations like image optimization, dashboard sub-routing, and advanced caching strategies.

**Next Steps**: 
1. Deploy and validate with real Lighthouse tests
2. Implement Phase 3 optimizations based on metrics
3. Set up continuous monitoring
4. Create performance improvement roadmap for 2026

---

**Document Created**: January 14, 2026  
**Last Updated**: January 14, 2026  
**Status**: Active - Phase 2 Starting
