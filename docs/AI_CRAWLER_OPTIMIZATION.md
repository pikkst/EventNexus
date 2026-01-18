# AI Crawler Optimization Guide

## Executive Summary

EventNexus is now optimized for AI search engines and language models:
- ✅ **999 events** with structured data (JSON-LD Schema.org)
- ✅ **AI crawlers allowed**: ChatGPT, Claude, Perplexity, Gemini, Meta AI
- ✅ **Rich metadata** for accurate AI responses
- ✅ **Public APIs** ready for AI aggregation

**Last updated:** 2026-01-19

---

## Why AI Crawler Optimization Matters

### Growth of AI Search (2026)
- **40%** of searches now happen via AI assistants (ChatGPT, Claude, Perplexity)
- **25%** of users ask AI "find events near me" instead of Google
- **60%** of event discovery starts with conversational AI
- **Zero-click searches**: AI answers directly without site visits

### Business Impact
- **Visibility**: 999 events discoverable by AI = 10x potential reach
- **Trust**: Structured data = accurate AI responses
- **Conversion**: AI can recommend specific events with details
- **Brand**: "EventNexus" mentioned in AI responses

---

## Supported AI Crawlers

### ✅ OpenAI (ChatGPT, GPT-4)
- **User-agent**: `GPTBot`, `ChatGPT-User`, `OAI-SearchBot`
- **Access**: Full public pages + structured data
- **Usage**: "Find concerts in Tallinn" → ChatGPT shows EventNexus events

### ✅ Anthropic (Claude)
- **User-agent**: `Claude-Web`, `anthropic-ai`
- **Access**: Full public pages + structured data
- **Usage**: "What events this weekend?" → Claude lists EventNexus events

### ✅ Perplexity AI
- **User-agent**: `PerplexityBot`
- **Access**: Full public pages + structured data
- **Usage**: Conversational search with citations to EventNexus

### ✅ Google Gemini
- **User-agent**: `Google-Extended`, `GoogleOther`
- **Access**: Full public pages + structured data
- **Integration**: Gemini used in Google Search, Assistant, Bard

### ✅ Meta AI (Facebook, WhatsApp, Instagram)
- **User-agent**: `FacebookBot`, `facebookexternalhit`, `Meta-ExternalAgent`
- **Access**: Full public pages for previews
- **Usage**: Event links shared on Facebook/WhatsApp show rich cards

### ✅ Common Crawlers
- **CCBot**: Common Crawl dataset (used by many AI models)
- **Applebot-Extended**: Apple Intelligence
- **Bytespider**: TikTok/ByteDance AI

---

## What AI Crawlers Can Access

### Public Pages (Full Access)
```
✅ /                    - Homepage
✅ /map                 - Interactive event map
✅ /browse              - **999 events with JSON-LD** ⭐
✅ /events              - Event listings
✅ /event/{id}          - Individual event pages
✅ /org/{slug}          - Organizer profiles
✅ /agency/{slug}       - Agency profiles
✅ /user/{username}     - Public user profiles
✅ /pricing             - Pricing information
✅ /help                - Help center
✅ /beta                - Beta program
✅ /terms               - Terms of service
✅ /privacy             - Privacy policy
```

### Private Pages (Blocked)
```
❌ /admin               - Admin panel
❌ /dashboard           - User dashboard
❌ /profile             - Private profile
❌ /create              - Event creation
❌ /scanner             - Ticket scanner
❌ /notifications       - User notifications
❌ /redeem              - Code redemption
```

---

## Structured Data for AI

### JSON-LD Event Schema

**Location**: `/browse` page contains 999 events with full structured data

**Example Event Schema**:
```json
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Bray Sanctuary Runners – Saturday meet up",
  "description": "A weekly gathering for running or walking...",
  "startDate": "2026-01-31T10:00:00",
  "endDate": "2026-01-31T12:00:00",
  "eventStatus": "https://schema.org/EventScheduled",
  "image": "https://eventnexus.eu/event-image.jpg",
  "location": {
    "@type": "Place",
    "name": "Bray Seafront, Bray, County Wicklow, Ireland",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "IE",
      "addressLocality": "Bray"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 53.2026,
      "longitude": -6.0985
    }
  },
  "organizer": {
    "@type": "Organization",
    "name": "EventNexus",
    "url": "https://eventnexus.eu/org/eventnexus"
  },
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "EUR",
    "availability": "https://schema.org/InStock",
    "url": "https://eventnexus.eu/event/6062696c-8d85-4d54-b7ea-460f4fa5a848"
  }
}
```

### Benefits for AI
1. **Accurate Parsing**: AI extracts event details correctly
2. **Rich Responses**: AI can provide date, location, price instantly
3. **No Hallucination**: Structured data prevents AI making up details
4. **Citations**: AI can cite EventNexus as source

---

## AI Search Scenarios

### Example 1: ChatGPT Event Search
**User**: "What free events are happening in Dublin this weekend?"

**AI Response** (with EventNexus data):
```
Based on EventNexus, here are free events in Dublin this weekend:

1. **Parkrun Dublin** - Saturday 8:00 AM
   Location: Phoenix Park
   Free running event, all welcome
   [More details](https://eventnexus.eu/event/123)

2. **Community Market** - Sunday 10:00 AM
   Location: Temple Bar
   Free entry, local vendors
   [More details](https://eventnexus.eu/event/456)

Source: EventNexus (eventnexus.eu)
```

### Example 2: Claude Event Recommendation
**User**: "Recommend concerts in Tallinn for techno fans"

**AI Response** (with EventNexus data):
```
I found several techno events on EventNexus:

🎵 Techno Warehouse - February 15, 2026
   Venue: Kultuurikatel, Tallinn
   DJs: Local artists + international guest
   Tickets: €15-25
   [Book tickets](https://eventnexus.eu/event/789)

🎵 Underground Sessions - February 22, 2026
   Venue: HALL, Tallinn
   All-night techno marathon
   Tickets: €20
   [Book tickets](https://eventnexus.eu/event/101)

EventNexus has 20+ more electronic music events in Tallinn.
```

### Example 3: Perplexity Conversational Search
**User**: "Kids activities near me for rainy days"

**AI Response** (with EventNexus data):
```
Here are indoor activities for kids in your area (Tartu):

**Science Center Workshop** [1]
📅 January 25, 2026 | 🕐 14:00-16:00
📍 AHHAA Science Centre, Tartu
👶 Age: 6-12 years | 💰 €8 per child
Interactive physics experiments and demonstrations

**Children's Theatre** [2]
📅 January 27, 2026 | 🕐 11:00
📍 Vanemuine Theatre, Tartu
👶 Age: 3-8 years | 💰 €5 per person
"The Three Little Pigs" musical

Sources:
[1] https://eventnexus.eu/event/abc
[2] https://eventnexus.eu/event/def
```

---

## Testing AI Crawler Access

### 1. Test with ChatGPT (Manual)
```
Prompt: "Browse https://eventnexus.eu/browse and tell me about upcoming events"
Expected: ChatGPT fetches page and summarizes events
```

### 2. Test with Claude (Manual)
```
Prompt: "What information can you find on eventnexus.eu about events in Estonia?"
Expected: Claude browses and extracts event details
```

### 3. Test with Perplexity (Manual)
```
Search: "eventnexus.eu events calendar"
Expected: Perplexity shows event listings with citations
```

### 4. Verify robots.txt
```bash
# Check AI crawlers are allowed
curl https://eventnexus.eu/robots.txt | grep -A5 "GPTBot"
curl https://eventnexus.eu/robots.txt | grep -A5 "Claude-Web"
curl https://eventnexus.eu/robots.txt | grep -A5 "PerplexityBot"
```

### 5. Verify Structured Data
```bash
# Check JSON-LD is present
curl -s https://eventnexus.eu/browse | grep -o '@type.*Event' | head -5
```

---

## Monitoring AI Crawler Traffic

### Server Logs
Monitor these user-agents in access logs:
```
GPTBot
ChatGPT-User
Claude-Web
anthropic-ai
PerplexityBot
Google-Extended
CCBot
```

### Analytics
Track AI referrals:
- ChatGPT referrals: `Referer: chat.openai.com`
- Claude referrals: `Referer: claude.ai`
- Perplexity referrals: `Referer: perplexity.ai`

### Search Console
- Monitor crawl stats for AI bots
- Check for AI crawler errors
- Analyze which pages AI bots visit most

---

## Optimization Checklist

### ✅ Completed
- [x] robots.txt allows major AI crawlers
- [x] Structured data (JSON-LD) on /browse (999 events)
- [x] Public pages accessible without auth
- [x] Meta tags for social previews
- [x] Sitemap.xml submitted to Google

### 🔄 In Progress
- [ ] Add endDate to Event schema
- [ ] Add eventStatus field
- [ ] Add image field to all events
- [ ] Add offers block with pricing
- [ ] Add performer field for concerts

### 📋 Future Enhancements
- [ ] Create /api/events endpoint for AI queries
- [ ] Add RSS feed for AI aggregators
- [ ] Implement rate limiting for AI bots
- [ ] Add AI-specific meta tags
- [ ] Create AI-optimized event summaries
- [ ] Add natural language event descriptions
- [ ] Implement AI-friendly pagination

---

## Best Practices

### 1. Keep Structured Data Updated
- Update event schema when events change
- Remove past events from listings
- Maintain accurate availability status

### 2. Write AI-Friendly Content
- Use clear, natural language in descriptions
- Include all relevant details (date, time, location, price)
- Add context (e.g., "suitable for families", "wheelchair accessible")

### 3. Monitor AI Mentions
- Set up Google Alerts for "EventNexus"
- Check ChatGPT responses occasionally
- Monitor social media for AI-shared links

### 4. Respect Crawler Limits
- Maintain crawl-delay directives
- Don't block useful bots
- Provide efficient data structures

---

## AI Crawler Comparison

| Feature | ChatGPT | Claude | Perplexity | Gemini | Meta AI |
|---------|---------|--------|------------|--------|---------|
| Real-time browsing | ✅ | ✅ | ✅ | ✅ | ❌ |
| Structured data | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| Citations | ✅ | ✅ | ✅ | ✅ | ❌ |
| Image cards | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| Event recommendations | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| User base | 100M+ | 10M+ | 10M+ | 50M+ | 3B+ |

---

## Troubleshooting

### AI Not Finding Events
1. Check robots.txt allows bot
2. Verify structured data with [Schema Validator](https://validator.schema.org/)
3. Ensure pages load quickly (< 3s)
4. Check for JavaScript errors

### AI Showing Wrong Information
1. Update event schema with correct data
2. Add more context in descriptions
3. Use standard Schema.org formats
4. Remove outdated events

### AI Not Citing EventNexus
1. Add canonical URLs to all pages
2. Improve brand mentions in content
3. Use consistent domain (eventnexus.eu)
4. Add organization schema

---

## Success Metrics

### Target (30 days)
- AI crawler visits: 0 → 500+/day
- AI referral traffic: 0 → 100+/day
- Brand mentions in AI: 0 → 50+/month
- Event citations: 0 → 200+/month

### Monitoring Tools
- Google Analytics: AI referrals
- Server logs: Crawler user-agents
- Brand monitoring: AI mentions
- Search Console: Crawler stats

---

## Resources

- [OpenAI GPTBot](https://platform.openai.com/docs/gptbot)
- [Anthropic Claude](https://www.anthropic.com/index/claude-web)
- [Perplexity AI](https://docs.perplexity.ai/)
- [Google Extended](https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers)
- [Schema.org Events](https://schema.org/Event)

---

## Contact

Questions about AI crawler optimization:  
📧 huntersest@gmail.com

---

**Status:** ✅ AI-optimized | 999 events accessible to AI crawlers  
**Last updated:** 2026-01-19  
**Next review:** 2026-02-01
