# White-Label Demo Page Design Plan

## Overview
Comprehensive white-labeling design for EventNexus Enterprise tier agencies to showcase their brand identity and services on a custom public page.

## Available White-Labeling Features

### 1. **Hero Section** (`branding.pageConfig.heroType`)
- **Image Hero**: Single static hero image with Ken Burns animation
- **Video Hero**: Autoplay looping background video
- **Slideshow Hero**: Multiple images cycling with fade transitions
- **Media Source**: `branding.pageConfig.heroMedia` (string | string[])
- **Fallbacks**: `branding.bannerUrl` → `branding.videoReel` → Unsplash default

### 2. **Custom Domain Banner** (`branding.customDomain`)
- Prominent banner at top showing custom domain
- Example: "Visit us at: events.youragency.com"
- Only displays when customDomain is set

### 3. **Branding Colors**
- **Primary Color**: `branding.primaryColor` (main brand color)
- **Accent Color**: `branding.accentColor` (secondary highlights)
- Applied to buttons, borders, and accents throughout

### 4. **Agency Identity**
- **Logo**: `branding.logoUrl` (displayed in header)
- **Tagline**: `branding.tagline` (hero subtitle)
- **Bio**: `organizer.bio` (short description)
- **Extended About**: `branding.about` (detailed description with formatting)

### 5. **Statistics Dashboard** (`branding.stats`)
- **Total Events**: Lifetime event count
- **Total Attendees**: Cumulative attendance
- **Average Rating**: Star rating display
- **Active Years**: Years in operation
- Displayed as modern stat cards on hero section
- Toggle: `branding.pageConfig.showStats`

### 6. **Services Grid** (`branding.services[]`)
```typescript
{
  icon: string, // Lucide icon name
  name: string,
  desc: string
}
```
- Dynamic icon mapping from Lucide React
- 2-column grid with hover effects
- Integrated into manifesto section

### 7. **Team Showcase** (`branding.team[]`)
```typescript
{
  id: string,
  name: string,
  role: string,
  avatar: string,
  bio?: string
}
```
- Team member grid with avatars
- Hover effects on cards
- Auto-generated avatars if missing
- Toggle: `branding.pageConfig.showTeam`

### 8. **Event Highlights** (`branding.eventHighlights[]`)
```typescript
{
  id: string,
  title: string,
  description: string,
  imageUrl?: string,
  videoUrl?: string,
  stats?: {
    attendance: number,
    rating: number,
    revenue?: number
  },
  date: string
}
```
- Showcase past memorable events
- Video or image support
- Statistics overlay
- Toggle: `branding.pageConfig.showEventHighlights`

### 9. **Testimonials Carousel** (`branding.testimonials[]`)
```typescript
{
  id: string,
  author: string,
  role: string,
  content: string,
  rating: number,
  avatar?: string,
  eventName?: string
}
```
- Rotating testimonials with navigation dots
- 5-star rating display
- Event attribution
- Toggle: `branding.pageConfig.showTestimonials`

### 10. **Partners Section** (`branding.partners[]`)
```typescript
{
  id: string,
  name: string,
  logo: string,
  website: string,
  description: string
}
```
- Logo grid with hover effects
- External link integration
- Grayscale to color on hover
- Toggle: `branding.pageConfig.showPartners`

### 11. **Media Coverage** (`branding.mediaCoverage[]`)
```typescript
{
  id: string,
  outlet: string,
  title: string,
  url: string,
  date: string,
  logo?: string
}
```
- Press article cards
- External links to articles
- Date and outlet display
- Toggle: `branding.pageConfig.showMediaCoverage`

### 12. **Contact Forms**
- **General Contact**: `branding.pageConfig.enableContactForm`
  - Modal form with name, email, subject, message
  - Sends email via Resend API
  - Creates notification for organizer
- **Partnership Inquiry**: Always available
  - Prompts for name, email, message
  - Sent as partnership type to Edge Function

### 13. **Social Integration**
- **Social Links**: `branding.socialLinks.{website|twitter|instagram}`
  - Display as icon links in manifesto section
- **Social Sharing**: `branding.pageConfig.enableSocialSharing`
  - Twitter, Facebook, LinkedIn, Copy Link buttons
  - Share agency profile page

### 14. **Video Reel** (`branding.videoReel`)
- Full-screen video modal
- Triggered by "Agency Reel" button
- Autoplay with controls
- Close button overlay

### 15. **Newsletter Signup** (`branding.pageConfig.enableNewsletter`)
- "Inner Circle" section
- Email capture form
- Branded CTA copy
- Optional feature toggle

### 16. **Active Events** (Always shown)
- 3-column grid of agency's published events
- Links to event detail pages
- Categories, ratings, location display
- "Secure Access Shard" CTA buttons

### 17. **Page Layout** (`branding.pageConfig.layout`)
- Options: `modern` | `classic` | `minimal` | `bold`
- Currently only `modern` implemented

### 18. **Theme** (`branding.pageConfig.theme`)
- Options: `dark` | `light` | `auto`
- Currently only `dark` implemented

## Configuration Paths

All white-labeling settings are stored in the `users` table under the `branding` JSONB column:

```sql
SELECT branding FROM users WHERE id = 'user-id';
```

### Database Schema
```typescript
interface User {
  branding: {
    // Visual identity
    primaryColor: string;
    accentColor: string;
    logoUrl?: string;
    customDomain?: string;
    bannerUrl?: string;
    tagline?: string;
    about?: string;
    videoReel?: string;
    
    // Social links
    socialLinks?: {
      website?: string;
      twitter?: string;
      instagram?: string;
    };
    
    // Services (always visible)
    services?: AgencyService[];
    
    // Enterprise features
    stats?: OrganizerStats;
    testimonials?: Testimonial[];
    team?: TeamMember[];
    partners?: Partner[];
    mediaCoverage?: MediaCoverage[];
    eventHighlights?: EventHighlight[];
    
    // Page configuration
    pageConfig?: {
      // Hero
      heroType: 'image' | 'video' | 'slideshow';
      heroMedia: string | string[];
      
      // Section toggles
      showStats: boolean;
      showTestimonials: boolean;
      showTeam: boolean;
      showPartners: boolean;
      showMediaCoverage: boolean;
      showEventHighlights: boolean;
      
      // Feature toggles
      enableContactForm: boolean;
      enableNewsletter: boolean;
      enableSocialSharing: boolean;
      enableVIPAccess: boolean;
      
      // Layout & theme
      layout: 'modern' | 'classic' | 'minimal' | 'bold';
      theme: 'dark' | 'light' | 'auto';
      
      // Custom sections (future)
      customSections: CustomSection[];
      
      // Services (alternative location)
      services?: AgencyService[];
    };
  };
}
```

## Implementation Status

### ✅ Completed Features
- Hero section with all 3 types (image/video/slideshow)
- Custom domain banner display
- Stats dashboard with 4 key metrics
- Services grid with icon mapping
- Team member showcase
- Event highlights grid
- Testimonials carousel
- Partners logo grid
- Media coverage cards
- Contact form modal with email integration
- Partnership inquiry prompt
- Social sharing buttons
- Video reel modal
- Newsletter signup section
- Active events grid
- Social links display

### 🔄 Needs Enhancement
1. **Services Section**: Move from branding.services to branding.pageConfig.services
2. **Better Icon Mapping**: Add more Lucide icons to IconMap
3. **Layout Variations**: Implement classic, minimal, bold layouts
4. **Light Theme**: Add light theme support
5. **VIP Access**: Implement members-only section toggle
6. **Custom Sections**: Add custom section builder support
7. **Mobile Responsiveness**: Test and improve mobile layouts
8. **Loading States**: Add skeleton loaders for async content
9. **SEO Meta Tags**: Add dynamic meta tags based on branding
10. **Analytics Integration**: Track engagement on white-label pages

### 📋 Configuration Path Issues
- `pageConfig.services` vs `branding.services` (need to consolidate)
- Section toggles default to `true` if undefined (should respect `false`)
- Some features check `!== false` (show by default), others check `=== true` (hide by default)

## Design Improvements Needed

### 1. **Consistent Section Spacing**
- All sections should use `py-32` for vertical rhythm
- Max-width containers at `max-w-7xl` or `max-w-5xl`
- Proper heading hierarchy

### 2. **Enhanced Hover States**
- Consistent border color transitions
- Scale transforms on interactive elements
- Smooth color transitions

### 3. **Better Typography**
- Consistent font weights (black for headings, medium for body)
- Proper text color hierarchy (white → slate-300 → slate-400 → slate-500)
- Uppercase labels with wide tracking

### 4. **Improved Cards**
- Rounded corners at `[40px]` or `[48px]`
- Border gradients for premium feel
- Subtle inner glow effects
- Proper overflow handling

### 5. **Call-to-Action Buttons**
- Primary: Solid brand color with hover lift
- Secondary: Border with backdrop blur
- Ghost: Text only with hover underline
- Consistent sizing and padding

### 6. **Form Styling**
- Rounded inputs at `rounded-2xl` or `rounded-3xl`
- Proper focus states
- Error validation styling
- Loading states with spinners

### 7. **Image Optimization**
- Lazy loading for below-fold images
- Proper aspect ratios
- Fallback images
- Blur-up placeholders

## Testing Checklist

- [ ] Test image hero with various aspect ratios
- [ ] Test video hero with different formats (mp4, webm)
- [ ] Test slideshow with 2-10 images
- [ ] Verify custom domain banner displays when set
- [ ] Test all stat values (including 0, large numbers)
- [ ] Verify all Lucide icons render in services
- [ ] Test team section with 1-20 members
- [ ] Test event highlights with video vs image
- [ ] Test testimonials carousel navigation
- [ ] Test partners grid with 1-24 partners
- [ ] Test media coverage cards
- [ ] Submit contact form and verify email + notification
- [ ] Submit partnership inquiry and verify email
- [ ] Test social sharing on all platforms
- [ ] Test video reel modal playback
- [ ] Test newsletter form submission
- [ ] Verify all toggle flags work correctly
- [ ] Test on mobile (375px), tablet (768px), desktop (1920px)
- [ ] Test with all sections enabled
- [ ] Test with all sections disabled
- [ ] Test with missing/null data gracefully

## Demo Configuration Example

```typescript
const demoAgency = {
  id: 'f2ecf6c6-14c1-4dbd-894b-14ee6493d807',
  name: 'Hunter Events',
  email: 'huntersest@gmail.com',
  bio: 'Creating unforgettable experiences worldwide',
  role: 'organizer',
  subscription_tier: 'enterprise',
  branding: {
    primaryColor: '#6366f1',
    accentColor: '#818cf8',
    logoUrl: 'https://...',
    customDomain: 'events.hunterset.com',
    tagline: 'Elevating Events Through Innovation',
    about: 'Founded in 2020, Hunter Events has revolutionized the event industry by combining cutting-edge technology with personalized experiences. Our mission is to create moments that matter.',
    videoReel: 'https://...',
    
    socialLinks: {
      website: 'https://hunterset.com',
      twitter: 'https://twitter.com/hunterset',
      instagram: 'https://instagram.com/hunterset'
    },
    
    stats: {
      totalEvents: 127,
      totalAttendees: 45000,
      averageRating: 4.9,
      activeYears: 4
    },
    
    services: [
      { icon: 'Sparkles', name: 'Event Planning', desc: 'End-to-end event conceptualization and execution' },
      { icon: 'Users', name: 'Community Building', desc: 'Foster engaged communities around your events' },
      { icon: 'Zap', name: 'Tech Integration', desc: 'Seamless ticketing and event management platforms' },
      { icon: 'TrendingUp', name: 'Growth Marketing', desc: 'Data-driven strategies to maximize attendance' }
    ],
    
    team: [
      { id: '1', name: 'Hunter Set', role: 'Founder & CEO', avatar: 'https://...' },
      { id: '2', name: 'Jane Doe', role: 'Head of Operations', avatar: 'https://...' }
    ],
    
    testimonials: [
      { 
        id: '1', 
        author: 'John Smith', 
        role: 'Event Attendee', 
        content: 'Best event experience of my life! Every detail was perfect.',
        rating: 5,
        eventName: 'Tech Summit 2024'
      }
    ],
    
    partners: [
      { id: '1', name: 'TechCorp', logo: 'https://...', website: 'https://...' }
    ],
    
    mediaCoverage: [
      { 
        id: '1', 
        outlet: 'Forbes', 
        title: 'How Hunter Events is Revolutionizing Live Experiences',
        url: 'https://...',
        date: '2024-01-15'
      }
    ],
    
    eventHighlights: [
      {
        id: '1',
        title: 'Tech Summit 2024',
        description: 'Our flagship annual conference',
        imageUrl: 'https://...',
        stats: { attendance: 2500, rating: 4.9 },
        date: '2024-06-15'
      }
    ],
    
    pageConfig: {
      heroType: 'video',
      heroMedia: 'https://...video.mp4',
      showStats: true,
      showTestimonials: true,
      showTeam: true,
      showPartners: true,
      showMediaCoverage: true,
      showEventHighlights: true,
      enableContactForm: true,
      enableNewsletter: true,
      enableSocialSharing: true,
      enableVIPAccess: false,
      customSections: [],
      layout: 'modern',
      theme: 'dark'
    }
  }
};
```

## Next Steps

1. ✅ Review existing implementation
2. ⏭️ Enhance services section with better design
3. ⏭️ Add missing icon mappings
4. ⏭️ Implement layout variations
5. ⏭️ Add light theme support
6. ⏭️ Mobile responsiveness audit
7. ⏭️ SEO meta tags
8. ⏭️ Analytics tracking
9. ⏭️ Performance optimization
10. ⏭️ Comprehensive testing

## URLs

- **Production**: https://eventnexus.eu/#/agency/hunteset
- **Dev**: http://localhost:3000/#/agency/hunterset
