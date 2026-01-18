# Event Schema Enhancement - Rich Results Optimization

## Status: 999 Events Detected ✅ - Need Optional Fields

**Date:** Jan 19, 2026  
**Google Search Console Result:** 999 valid Event items detected on `/browse`  
**Issue:** Missing optional fields preventing maximum rich result quality

## Current Event Schema Issues

### Non-Critical Warnings (from Google Search Console)
```
✓ 999 valid items detected
⚠️ 6 non-critical issues per event:
  - Missing field "performer" (optional)
  - Missing field "eventStatus" (optional)
  - Missing field "image" (optional)
  - Missing field "offers" (optional)
  - Missing field "endDate" (optional)
  - Missing organizer "url" (optional)
```

### Example Event Currently Indexed
```json
{
  "type": "Event",
  "name": "Bray Sanctuary Runners – Saturday meet up",
  "description": "A weekly gathering for running or walking...",
  "startDate": "2026-01-31",
  "location": {
    "type": "Place",
    "name": "Bray Seafront, Bray, County Wicklow, Ireland",
    "address": {
      "type": "PostalAddress",
      "name": "Bray Seafront, Bray, County Wicklow, Ireland"
    }
  },
  "organizer": {
    "type": "Organization",
    "name": "EventNexus"
    // ⚠️ Missing "url" field
  }
  // ⚠️ Missing: performer, eventStatus, image, offers, endDate
}
```

## Implementation Plan

### Files to Update

#### 1. PublicEventsBrowse.tsx
**Location:** `src/components/PublicEventsBrowse.tsx`

**Current JSON-LD generation needs enhancement:**
```typescript
// Find the useEffect that generates JSON-LD
useEffect(() => {
  if (events.length > 0) {
    const eventSchemas = events.map(event => ({
      "@context": "https://schema.org",
      "@type": "Event",
      "name": event.name,
      "startDate": event.date,
      // ADD THESE FIELDS:
      "endDate": calculateEndDate(event.date, event.time), // NEW
      "eventStatus": getEventStatus(event.date), // NEW
      "image": event.imageUrl || "https://eventnexus.eu/default-event.jpg", // NEW
      "description": event.description,
      "location": {
        "@type": "Place",
        "name": event.location.city,
        "address": {
          "@type": "PostalAddress",
          "name": event.location.city,
          "addressCountry": event.location.country
        }
      },
      "organizer": {
        "@type": "Organization",
        "name": event.organizerName || "EventNexus",
        "url": `https://eventnexus.eu/org/${event.organizerSlug}` // NEW
      },
      // ADD OFFERS BLOCK:
      "offers": event.price ? {
        "@type": "Offer",
        "price": event.price.toString(),
        "priceCurrency": "EUR",
        "availability": event.capacity > 0 ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
        "url": `https://eventnexus.eu/event/${event.id}`
      } : {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "EUR",
        "availability": "https://schema.org/InStock",
        "url": `https://eventnexus.eu/event/${event.id}`
      },
      // ADD PERFORMER (for music/shows only):
      ...(["Music", "Concert", "Show"].includes(event.category) && {
        "performer": {
          "@type": "Person",
          "name": event.performerName || event.organizerName
        }
      })
    }));
    
    // Update script tag...
  }
}, [events]);
```

#### 2. Helper Functions to Add

```typescript
// Add these helper functions to PublicEventsBrowse.tsx

/**
 * Calculate event end date
 * Assumes 2 hours if no duration specified
 */
const calculateEndDate = (startDate: string, startTime: string): string => {
  try {
    const date = new Date(startDate);
    const [hours, minutes] = startTime.split(':').map(Number);
    date.setHours(hours + 2, minutes, 0); // Add 2 hours default duration
    return date.toISOString();
  } catch {
    return new Date(startDate).toISOString();
  }
};

/**
 * Get event status based on date
 */
const getEventStatus = (eventDate: string): string => {
  const now = new Date();
  const date = new Date(eventDate);
  
  if (date < now) {
    return "https://schema.org/EventPastDate";
  }
  return "https://schema.org/EventScheduled";
};
```

#### 3. EventDetail.tsx (Individual Event Pages)

**Location:** `src/components/EventDetail.tsx`

Apply same schema enhancements to individual event detail pages.

### Implementation Checklist

- [ ] Add `calculateEndDate` helper function
- [ ] Add `getEventStatus` helper function
- [ ] Update Event schema in `PublicEventsBrowse.tsx`
- [ ] Add `endDate` field (calculated)
- [ ] Add `eventStatus` field (scheduled/past)
- [ ] Add `image` field (event.imageUrl with fallback)
- [ ] Add `offers` block with price/availability
- [ ] Add organizer `url` field
- [ ] Add `performer` field (conditional on category)
- [ ] Update `EventDetail.tsx` with same schema
- [ ] Test locally with Rich Results Test tool
- [ ] Build and deploy
- [ ] Verify in Google Search Console
- [ ] Monitor for warning reduction

### Testing

**Before deployment:**
```bash
# 1. Test Rich Results locally
# Visit: https://search.google.com/test/rich-results
# Enter: https://eventnexus.eu/browse

# 2. Validate JSON-LD syntax
# Use: https://validator.schema.org/
```

**After deployment:**
```bash
# Request re-indexing in Search Console
# URL: https://eventnexus.eu/browse
# Monitor: Coverage Report daily
```

### Expected Results

**Current:**
- ✅ 999 events detected
- ⚠️ 6 non-critical warnings per event
- ⚠️ Missing optional enrichments

**After enhancement:**
- ✅ 999 events detected
- ✅ 0-2 non-critical warnings per event
- ✅ Full rich result eligibility
- ✅ Event cards may appear in Google Search with:
  - Event image
  - Date & time
  - Price
  - Availability status
  - Performer info (for concerts)

## Priority & Timeline

**Priority:** Medium (events already indexing, this is optimization)  
**Estimated effort:** 2-3 hours  
**Deployment:** Week 2 (Jan 25-31, 2026)  
**Impact:** Higher quality rich results, better CTR

## Resources

- [Google Event Schema Docs](https://developers.google.com/search/docs/appearance/structured-data/event)
- [Schema.org Event](https://schema.org/Event)
- [Rich Results Test](https://search.google.com/test/rich-results)
- [Schema Validator](https://validator.schema.org/)

## Notes

- Events are already indexing successfully (999 detected!)
- These are optimization improvements, not critical fixes
- Focus on high-value events first (featured/premium)
- Can be deployed incrementally (test with subset first)

---
**Status:** Planning phase - Events already indexing successfully  
**Next action:** Implement schema enhancements in PublicEventsBrowse.tsx  
**Target completion:** 2026-01-25
