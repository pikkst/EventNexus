# 🎨 White-Label Agency Page Setup Guide

Complete guide to creating your custom branded agency page on EventNexus Enterprise.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Hero Section Setup](#hero-section-setup)
3. [Branding & Identity](#branding--identity)
4. [Content Sections](#content-sections)
5. [Feature Toggles](#feature-toggles)
6. [Testing Your Page](#testing-your-page)
7. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Step 1: Access Supabase SQL Editor

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw)
2. Click **SQL Editor** in sidebar
3. Create a new query

### Step 2: Update Your Branding

Copy and customize this SQL command:

```sql
UPDATE users 
SET branding = '{
  "primaryColor": "#6366f1",
  "accentColor": "#818cf8",
  "tagline": "Your Tagline Here",
  "pageConfig": {
    "heroType": "image",
    "heroMedia": "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1920",
    "showStats": true,
    "enableContactForm": true,
    "enableSocialSharing": true,
    "enableNewsletter": true,
    "layout": "modern",
    "theme": "dark"
  }
}'::jsonb
WHERE email = 'your-email@example.com';
```

### Step 3: View Your Page

Visit: `https://eventnexus.eu/#/agency/YOUR-SLUG`

Replace `YOUR-SLUG` with your agency slug (found in your profile).

---

## 🎬 Hero Section Setup

The hero section is the first thing visitors see. Choose from 3 types:

### Option 1: Static Image Hero

**Best for**: Professional photography, brand imagery

```json
{
  "pageConfig": {
    "heroType": "image",
    "heroMedia": "https://your-image-url.com/hero.jpg"
  }
}
```

**Recommended specs**:
- Resolution: 1920x1080px minimum
- Format: JPG or PNG
- File size: Under 500KB (optimized)
- Aspect ratio: 16:9

**Features**:
- Ken Burns animation (subtle zoom)
- Gradient overlay for text readability
- Responsive scaling

### Option 2: Video Hero

**Best for**: Dynamic brand showcases, event footage

```json
{
  "pageConfig": {
    "heroType": "video",
    "heroMedia": "https://your-cdn.com/hero-video.mp4"
  }
}
```

**Recommended specs**:
- Resolution: 1920x1080px
- Format: MP4 (H.264 codec)
- Duration: 10-30 seconds (loops)
- File size: Under 5MB
- Audio: Muted (autoplay requirement)

**Features**:
- Autoplay on page load
- Looping playback
- Muted by default
- Gradient overlay

### Option 3: Slideshow Hero

**Best for**: Multiple brand images, event gallery

```json
{
  "pageConfig": {
    "heroType": "slideshow",
    "heroMedia": [
      "https://your-cdn.com/slide-1.jpg",
      "https://your-cdn.com/slide-2.jpg",
      "https://your-cdn.com/slide-3.jpg",
      "https://your-cdn.com/slide-4.jpg"
    ]
  }
}
```

**Recommended specs**:
- 3-7 images recommended
- Same resolution for all images (1920x1080px)
- Transition: Fade (1 second)
- Display time: 5 seconds per image
- Auto-cycles continuously

---

## 🎨 Branding & Identity

### Primary & Accent Colors

Your brand colors are used throughout the page:

```json
{
  "primaryColor": "#6366f1",  // Main brand color (buttons, CTAs)
  "accentColor": "#818cf8"    // Highlights, hover states
}
```

**Where colors appear**:
- Primary: Buttons, links, active states, CTAs
- Accent: Hover effects, borders, accents

**Color picker tools**:
- [Coolors.co](https://coolors.co/) - Generate palettes
- [Color Hunt](https://colorhunt.co/) - Browse color schemes
- [Adobe Color](https://color.adobe.com/) - Extract from images

### Logo & Assets

```json
{
  "logoUrl": "https://your-cdn.com/logo.png",
  "bannerUrl": "https://your-cdn.com/banner.jpg",
  "videoReel": "https://your-cdn.com/reel.mp4"
}
```

**Logo specifications**:
- Format: PNG with transparency
- Size: 200x60px (width x height)
- File size: Under 100KB
- Color: White or light (for dark theme)

**Banner** (fallback hero image):
- Resolution: 1920x1080px
- Used if pageConfig.heroMedia is not set

**Video Reel** (agency showcase):
- Triggered by "Agency Reel" button
- Opens in full-screen modal
- 1-3 minutes recommended
- MP4 format with audio

### Custom Domain

Display your custom domain prominently:

```json
{
  "customDomain": "events.youragency.com"
}
```

**What it does**:
- Shows banner at top: "Visit us at: events.youragency.com"
- Can link to external domain
- EventNexus page still accessible at eventnexus.eu/#/agency/slug

**Future**: Full domain mapping (subdomain CNAME to EventNexus)

### Tagline & About

```json
{
  "tagline": "Short, punchy tagline (5-10 words)",
  "about": "Detailed agency description.\n\nSupports multiple paragraphs.\n\nUse \\n for line breaks."
}
```

**Tagline**:
- Appears below agency name on hero
- Keep it short and memorable
- Examples:
  - "Elevating Events Through Innovation"
  - "Where Creativity Meets Execution"
  - "Building Unforgettable Experiences"

**About**:
- Separate from `organizer.bio` (which is short)
- Supports line breaks with `\n`
- 2-4 paragraphs recommended
- Tell your story, mission, values

---

## 📦 Content Sections

### Statistics Dashboard

Showcase your track record:

```json
{
  "stats": {
    "totalEvents": 127,
    "totalAttendees": 45000,
    "averageRating": 4.9,
    "activeYears": 4
  },
  "pageConfig": {
    "showStats": true
  }
}
```

**Displayed as**:
- 4 stat cards on hero section
- Large numbers with labels
- Auto-formatted (45000 → 45K+)

### Services Grid

List your services with icons:

```json
{
  "services": [
    {
      "icon": "Sparkles",
      "name": "Event Planning",
      "desc": "End-to-end event conceptualization and execution"
    },
    {
      "icon": "Users",
      "name": "Community Building",
      "desc": "Foster engaged communities around your events"
    },
    {
      "icon": "Zap",
      "name": "Tech Integration",
      "desc": "Seamless ticketing and management platforms"
    },
    {
      "icon": "TrendingUp",
      "name": "Growth Marketing",
      "desc": "Data-driven strategies to maximize attendance"
    }
  ]
}
```

**Icon options** (from [Lucide Icons](https://lucide.dev)):
- `Sparkles`, `Users`, `Zap`, `TrendingUp`, `Calendar`, `MapPin`
- `Heart`, `Star`, `Trophy`, `Target`, `Rocket`, `Award`
- `Crown`, `Shield`, `Briefcase`, `Coffee`, `Music`, `Camera`

**Best practices**:
- 4-6 services recommended
- Keep descriptions under 100 characters
- Use action-oriented names

### Team Members

Introduce your team:

```json
{
  "team": [
    {
      "id": "1",
      "name": "Hunter Set",
      "role": "Founder & CEO",
      "avatar": "https://your-cdn.com/hunter.jpg",
      "bio": "15 years in event management"
    },
    {
      "id": "2",
      "name": "Sarah Johnson",
      "role": "Head of Operations",
      "avatar": "https://your-cdn.com/sarah.jpg",
      "bio": "Logistics and coordination expert"
    }
  ],
  "pageConfig": {
    "showTeam": true
  }
}
```

**Avatar specs**:
- Size: 128x128px (square)
- Format: JPG or PNG
- If omitted, auto-generates from name

**Team size**:
- 4-8 members ideal
- Shows in responsive grid

### Testimonials

Build trust with client reviews:

```json
{
  "testimonials": [
    {
      "id": "1",
      "author": "John Smith",
      "role": "Event Attendee",
      "content": "Best event experience of my life! Every detail was perfect.",
      "rating": 5,
      "avatar": "https://your-cdn.com/john.jpg",
      "eventName": "Tech Summit 2024"
    }
  ],
  "pageConfig": {
    "showTestimonials": true
  }
}
```

**Features**:
- Rotating carousel with navigation dots
- 5-star rating display
- Optional event attribution
- 3-5 testimonials recommended

### Partners

Show brand collaborations:

```json
{
  "partners": [
    {
      "id": "1",
      "name": "TechCorp",
      "logo": "https://your-cdn.com/techcorp-logo.png",
      "website": "https://techcorp.com",
      "description": "Technology sponsor"
    }
  ],
  "pageConfig": {
    "showPartners": true
  }
}
```

**Logo specs**:
- Format: PNG with transparency (or white background)
- Size: 200x80px (landscape)
- Effect: Grayscale → Color on hover

**Grid layout**:
- 6 logos per row (desktop)
- Responsive on mobile
- 6-12 partners ideal

### Media Coverage

Showcase press mentions:

```json
{
  "mediaCoverage": [
    {
      "id": "1",
      "outlet": "Forbes",
      "title": "How This Agency is Revolutionizing Events",
      "url": "https://forbes.com/article/example",
      "date": "2024-01-15",
      "logo": "https://your-cdn.com/forbes-logo.png"
    }
  ],
  "pageConfig": {
    "showMediaCoverage": true
  }
}
```

**Best practices**:
- 3-6 articles recommended
- Use reputable outlets
- Recent dates (last 2 years)
- Optional outlet logos

### Event Highlights

Showcase past events:

```json
{
  "eventHighlights": [
    {
      "id": "1",
      "title": "Tech Summit 2024",
      "description": "Our flagship conference with 2,500 attendees",
      "imageUrl": "https://your-cdn.com/tech-summit.jpg",
      "videoUrl": null,
      "stats": {
        "attendance": 2500,
        "rating": 4.9
      },
      "date": "2024-06-15"
    }
  ],
  "pageConfig": {
    "showEventHighlights": true
  }
}
```

**Media options**:
- Image: High-quality event photo
- Video: Event highlight reel (autoplay/loop)
- Prefer images for performance

**Stats**:
- Attendance number
- Rating (0-5)
- Revenue (optional, not displayed publicly)

---

## ⚙️ Feature Toggles

Control which features appear on your page:

```json
{
  "pageConfig": {
    // Section visibility
    "showStats": true,              // Statistics on hero
    "showTestimonials": true,       // Testimonials carousel
    "showTeam": true,               // Team member grid
    "showPartners": true,           // Partner logos
    "showMediaCoverage": true,      // Press mentions
    "showEventHighlights": true,    // Past event showcase
    
    // Interactive features
    "enableContactForm": true,      // "Get In Touch" modal
    "enableNewsletter": true,       // "Inner Circle" signup
    "enableSocialSharing": true,    // Social share buttons
    "enableVIPAccess": false,       // Members-only section (future)
    
    // Layout
    "layout": "modern",             // Page style (only modern for now)
    "theme": "dark"                 // Color theme (only dark for now)
  }
}
```

**Default behavior**:
- If toggle is `true` → Section shows (if data exists)
- If toggle is `false` → Section hidden (even if data exists)
- If toggle is missing → Section shows by default (Enterprise)

**Pro tip**: Start with all features enabled, then disable what you don't need.

---

## 🔗 Social Links

Connect your social profiles:

```json
{
  "socialLinks": {
    "website": "https://youragency.com",
    "twitter": "https://twitter.com/youragency",
    "instagram": "https://instagram.com/youragency"
  }
}
```

**Where they appear**:
- As icon buttons in manifesto section
- Linked from social sharing section
- Future: Header navigation

**Future additions**: LinkedIn, Facebook, TikTok, YouTube

---

## ✅ Testing Your Page

### Checklist

Before going live, verify:

- [ ] Hero section displays correctly (image/video/slideshow)
- [ ] Custom domain banner shows (if configured)
- [ ] Brand colors applied throughout
- [ ] Logo displays in header
- [ ] Tagline appears below name
- [ ] Stats cards show on hero (if enabled)
- [ ] Services grid renders with correct icons
- [ ] Team members display with avatars
- [ ] Testimonials carousel cycles properly
- [ ] Partners logos show with hover effects
- [ ] Media coverage cards link correctly
- [ ] Event highlights display
- [ ] Contact form opens and sends email
- [ ] Partnership inquiry prompt works
- [ ] Social sharing buttons function
- [ ] Video reel modal opens and plays
- [ ] Newsletter form displays (if enabled)
- [ ] Active events section shows your events
- [ ] Mobile responsive layout works
- [ ] All images load properly
- [ ] No console errors

### Test Devices

- **Desktop**: 1920x1080px (Chrome, Safari, Firefox)
- **Tablet**: 768x1024px (iPad)
- **Mobile**: 375x667px (iPhone)

### Performance Tips

- Optimize images before upload (use [TinyPNG](https://tinypng.com/))
- Compress videos (use [HandBrake](https://handbrake.fr/))
- Use CDN for asset hosting (Cloudinary, Imgix)
- Limit slideshow to 5 images maximum
- Keep video under 5MB

---

## 🐛 Troubleshooting

### Hero section not showing

**Problem**: Blank hero or default image

**Solutions**:
1. Check `pageConfig.heroMedia` is set correctly
2. Verify image/video URL is accessible (public)
3. Check browser console for 404 errors
4. Fallback chain: `heroMedia` → `bannerUrl` → `videoReel` → default

### Colors not applying

**Problem**: Page still shows default indigo

**Solutions**:
1. Verify `primaryColor` and `accentColor` are valid hex codes (#xxxxxx)
2. Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)
3. Clear cache and reload

### Icons not showing in services

**Problem**: Missing or broken icons

**Solutions**:
1. Check icon name matches [Lucide icon library](https://lucide.dev/)
2. Icon names are case-sensitive (use `PascalCase`)
3. Available icons must be in `IconMap` (see AgencyProfile.tsx)

### Contact form not sending emails

**Problem**: Form submits but no email received

**Solutions**:
1. Check browser console for errors
2. Verify Edge Function deployed (`send-contact-email`)
3. Check Resend API key configured in Supabase secrets
4. Verify organizer email is correct in database

### Sections not showing

**Problem**: Content missing despite data populated

**Solutions**:
1. Check pageConfig toggle for that section (`show<Section>: true`)
2. Verify data array is not empty
3. Hard refresh to clear cache
4. Check browser console for React errors

### Images not loading

**Problem**: Broken image icons

**Solutions**:
1. Verify URLs are publicly accessible (not localhost)
2. Check CORS headers if hosting images externally
3. Use HTTPS URLs (not HTTP)
4. Test URL in new browser tab

### Mobile layout broken

**Problem**: Overflow, small text, misaligned elements

**Solutions**:
1. Use browser DevTools mobile emulator
2. Check responsive breakpoints (375px, 768px, 1024px)
3. Report specific issues to support
4. Most layouts are responsive by default

---

## 📞 Support

### Need Help?

- **Email**: huntersest@gmail.com
- **Documentation**: [GitHub Copilot Instructions](../. github/copilot-instructions.md)
- **Examples**: Check [scripts/whitelabel-demo-config.ts](../scripts/whitelabel-demo-config.ts)

### Feature Requests

Enterprise tier gets priority for custom features. Contact support with:
- Feature description
- Use case / business need
- Example screenshots or mockups
- Timeline requirements

---

## 🚀 Go Live Checklist

Ready to launch your white-label page?

1. ✅ All content sections populated
2. ✅ Brand colors and logo set
3. ✅ Hero section configured
4. ✅ Tested on desktop + mobile
5. ✅ Contact form tested and working
6. ✅ Social links verified
7. ✅ Team reviewed page for approval
8. ✅ SEO meta title/description (future)
9. ✅ Analytics tracking set up (future)
10. ✅ Custom domain mapped (if applicable)

### Share Your Page

Once live, share your white-label page:

```
https://eventnexus.eu/#/agency/YOUR-SLUG
```

**Pro tip**: Use a custom short URL (bit.ly, rebrandly.com) for easier sharing!

---

Built with ❤️ by EventNexus · [Production Site](https://eventnexus.eu)
