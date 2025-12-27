# Enterprise Tier Custom Front Page - Feature Guide

## Overview
The Enterprise tier now includes comprehensive custom front page capabilities, allowing organizers to create a professional, branded public presence that showcases their events, team, achievements, and services.

## New Data Structures

### Enhanced Type Definitions (types.ts)

#### **Testimonial**
```typescript
interface Testimonial {
  id: string;
  author: string;
  role?: string;
  content: string;
  rating: number; // 1-5 stars
  eventName?: string;
  avatar?: string;
  date: string;
}
```

#### **TeamMember**
```typescript
interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio?: string;
  avatar?: string;
  socialLinks?: SocialLinks;
}
```

#### **Partner**
```typescript
interface Partner {
  id: string;
  name: string;
  logo: string; // Partner logo URL
  website?: string;
  description?: string;
}
```

#### **MediaCoverage**
```typescript
interface MediaCoverage {
  id: string;
  outlet: string; // Media outlet name
  title: string; // Article title
  url: string; // Link to article
  date: string;
  logo?: string; // Outlet logo
}
```

#### **EventHighlight**
```typescript
interface EventHighlight {
  id: string;
  eventId: string;
  title: string;
  description: string;
  imageUrl: string;
  videoUrl?: string; // Optional video
  stats?: {
    attendance: number;
    rating: number;
    revenue?: number;
  };
  date: string;
}
```

#### **CustomSection**
```typescript
interface CustomSection {
  id: string;
  type: 'text' | 'gallery' | 'video' | 'stats' | 'faq';
  title: string;
  content: any; // JSON content based on type
  order: number; // Display order
  isVisible: boolean;
}
```

#### **OrganizerStats**
```typescript
interface OrganizerStats {
  totalEvents: number;
  totalAttendees: number;
  totalRevenue: number;
  averageRating: number;
  followerCount: number;
  upcomingEvents: number;
  activeYears: number;
  repeatAttendeeRate?: number; // Percentage
}
```

#### **EnterprisePageConfig**
```typescript
interface EnterprisePageConfig {
  heroType: 'image' | 'video' | 'slideshow';
  heroMedia: string | string[]; // Single URL or array for slideshow
  showStats: boolean;
  showTestimonials: boolean;
  showTeam: boolean;
  showPartners: boolean;
  showMediaCoverage: boolean;
  showEventHighlights: boolean;
  enableChat: boolean;
  enableNewsletter: boolean;
  enableVIPAccess: boolean;
  customSections: CustomSection[];
  layout: 'modern' | 'classic' | 'minimal' | 'bold';
  theme: 'dark' | 'light' | 'auto';
}
```

#### **Extended UserBranding**
```typescript
interface UserBranding {
  // Existing fields
  primaryColor: string;
  accentColor: string;
  logoUrl?: string;
  customDomain?: string;
  bannerUrl?: string;
  tagline?: string;
  socialLinks?: SocialLinks;
  services?: AgencyService[];
  
  // NEW Enterprise fields
  testimonials?: Testimonial[];
  team?: TeamMember[];
  partners?: Partner[];
  mediaCoverage?: MediaCoverage[];
  eventHighlights?: EventHighlight[];
  stats?: OrganizerStats;
  pageConfig?: EnterprisePageConfig;
  about?: string; // Extended about section
  videoReel?: string; // Video URL for agency reel
}
```

## Feature Breakdown

### 1. **Enhanced Hero Section**
- **Video Hero**: Use a full-screen video background
- **Slideshow Hero**: Rotate multiple hero images (auto-rotates every 8 seconds)
- **Stats Bar**: Display key metrics (events, attendees, rating, active years)
- **Enterprise Badge**: "Enterprise Verified Agency" badge
- **Action Buttons**: Follow, Video Reel, Contact Us

**Example:**
```typescript
branding: {
  pageConfig: {
    heroType: 'video',
    heroMedia: 'https://example.com/hero-video.mp4',
    showStats: true
  },
  videoReel: 'https://example.com/agency-reel.mp4',
  stats: {
    totalEvents: 150,
    totalAttendees: 45000,
    averageRating: 4.8,
    activeYears: 5
  }
}
```

### 2. **Event Highlights Section**
Showcase your best past events with images, videos, and statistics.

**What to display:**
- Event title and description
- High-quality images or video clips
- Attendance numbers
- Event ratings
- Optional revenue metrics

**Example:**
```typescript
eventHighlights: [
  {
    id: '1',
    eventId: 'evt_123',
    title: 'Summer Music Festival 2024',
    description: 'Our biggest festival with 10,000 attendees and 50+ artists',
    imageUrl: 'https://example.com/festival.jpg',
    videoUrl: 'https://example.com/festival-recap.mp4',
    stats: {
      attendance: 10000,
      rating: 4.9
    },
    date: '2024-07-15'
  }
]
```

### 3. **About & Services Section**
- **Extended About**: Rich description of your organization
- **Services Grid**: Display your event services with icons
- **Social Links**: Website, Twitter, Instagram, LinkedIn
- **Partnership Inquiry**: Call-to-action button

**What to display:**
- Your mission and values
- Years of experience
- Types of events you organize
- Unique selling propositions
- Contact information

### 4. **Team Section**
Showcase the people behind your events.

**What to display:**
- Team member photos (auto-generated avatars if not provided)
- Names and roles
- Brief bios
- Social media links

**Example:**
```typescript
team: [
  {
    id: '1',
    name: 'Jane Smith',
    role: 'Chief Event Officer',
    bio: '15 years of experience in event production',
    avatar: 'https://example.com/jane.jpg',
    socialLinks: {
      linkedin: 'https://linkedin.com/in/janesmith'
    }
  }
]
```

### 5. **Testimonials Carousel**
Auto-rotating testimonials from attendees (rotates every 6 seconds).

**What to display:**
- Customer reviews and feedback
- 5-star rating display
- Attendee photo and name
- Event they attended
- Role/title of reviewer

**Example:**
```typescript
testimonials: [
  {
    id: '1',
    author: 'John Doe',
    role: 'Regular Attendee',
    content: 'Best event experience ever! Professional organization and amazing atmosphere.',
    rating: 5,
    eventName: 'Tech Conference 2024',
    avatar: 'https://example.com/john.jpg',
    date: '2024-06-15'
  }
]
```

### 6. **Partners & Sponsors**
Display logos of your partners, sponsors, and collaborators.

**What to display:**
- Partner/sponsor logos in a grid
- Links to partner websites
- Hover effects showing partnership details

**Example:**
```typescript
partners: [
  {
    id: '1',
    name: 'TechCorp',
    logo: 'https://example.com/techcorp-logo.png',
    website: 'https://techcorp.com',
    description: 'Technology Partner'
  }
]
```

### 7. **Media Coverage**
Showcase press mentions and media appearances.

**What to display:**
- Media outlet logos
- Article titles
- Publication dates
- Links to articles
- "Read Article" call-to-action

**Example:**
```typescript
mediaCoverage: [
  {
    id: '1',
    outlet: 'Tech Magazine',
    title: 'The Future of Event Planning: A Profile',
    url: 'https://techmagazine.com/article',
    date: '2024-05-20',
    logo: 'https://techmagazine.com/logo.png'
  }
]
```

### 8. **Contact Form Modal**
Enterprise-only direct contact form (enabled via `pageConfig.enableChat`).

**Features:**
- Name and email fields
- Subject line
- Message textarea
- Direct submission
- Modal overlay design

### 9. **Newsletter Signup**
"Inner Circle" section for email collection.

**Features:**
- Custom messaging
- Email input with validation
- Branded design
- Can be disabled via `pageConfig.enableNewsletter`

### 10. **Active Events Grid**
Displays all current and upcoming events from the organizer.

**Features:**
- Event cards with images
- Price, date, location
- Category badges
- Rating display (4.9 stars placeholder)
- "Secure Access Shard" CTA button

## Implementation Checklist

### For Organizers

#### Basic Setup (All Tiers)
- [ ] Upload profile avatar
- [ ] Write bio/description
- [ ] Set location
- [ ] Add tagline

#### Pro/Premium Setup
- [ ] Choose brand colors (primary & accent)
- [ ] Upload banner image (1200×400px recommended)
- [ ] Add social media links
- [ ] Define services offered

#### Enterprise Setup
- [ ] Choose hero type (image/video/slideshow)
- [ ] Upload hero media (video URL or multiple images)
- [ ] Enable/disable stats display
- [ ] Add organizer stats (total events, attendees, rating, years)
- [ ] Create event highlights (3-6 recommended)
- [ ] Add team members (4-8 recommended)
- [ ] Upload partner logos (6-12 recommended)
- [ ] Add testimonials (5-10 recommended)
- [ ] Add media coverage articles
- [ ] Write extended about section
- [ ] Upload agency video reel
- [ ] Configure custom domain (optional)
- [ ] Enable contact form
- [ ] Configure newsletter settings
- [ ] Set layout theme (modern/classic/minimal/bold)

## Database Schema Updates Needed

### users table - branding column (JSONB)
```sql
ALTER TABLE users 
ALTER COLUMN branding TYPE jsonb;

-- Example Enterprise branding data:
{
  "primaryColor": "#6366f1",
  "accentColor": "#818cf8",
  "logoUrl": "https://...",
  "bannerUrl": "https://...",
  "tagline": "Creating Unforgettable Experiences",
  "about": "We are a premier event organization...",
  "videoReel": "https://video-url.mp4",
  "customDomain": "events.yourbrand.com",
  "socialLinks": {
    "website": "https://...",
    "twitter": "https://...",
    "instagram": "https://..."
  },
  "services": [
    {
      "id": "1",
      "icon": "Music",
      "name": "Concerts",
      "desc": "Live music events"
    }
  ],
  "stats": {
    "totalEvents": 150,
    "totalAttendees": 45000,
    "totalRevenue": 500000,
    "averageRating": 4.8,
    "followerCount": 12000,
    "upcomingEvents": 8,
    "activeYears": 5,
    "repeatAttendeeRate": 65
  },
  "testimonials": [...],
  "team": [...],
  "partners": [...],
  "mediaCoverage": [...],
  "eventHighlights": [...],
  "pageConfig": {
    "heroType": "video",
    "heroMedia": "https://...",
    "showStats": true,
    "showTestimonials": true,
    "showTeam": true,
    "showPartners": true,
    "showMediaCoverage": true,
    "showEventHighlights": true,
    "enableChat": true,
    "enableNewsletter": true,
    "enableVIPAccess": false,
    "layout": "modern",
    "theme": "dark",
    "customSections": []
  }
}
```

## UI/UX Best Practices

### Content Recommendations

#### Hero Section
- **Video**: 10-30 seconds, high-quality, shows event atmosphere
- **Slideshow**: 3-5 images, high-resolution (1920×1080 minimum)
- **Tagline**: Keep under 100 characters, focus on value proposition

#### Event Highlights
- **Images**: High-resolution, showing crowd/atmosphere
- **Videos**: 30-60 seconds, professionally edited
- **Description**: 2-3 sentences highlighting what made it special

#### Testimonials
- **Length**: 1-3 sentences, authentic and specific
- **Rating**: 4-5 stars (lower ratings probably shouldn't be showcased)
- **Author**: Real name with role/title adds credibility

#### Team Section
- **Photos**: Professional headshots, consistent style
- **Bios**: 1-2 sentences per person
- **Roles**: Clear, specific titles

#### Partners
- **Logos**: Transparent PNG, consistent sizing
- **Grid**: 6-12 partners for visual balance
- **Quality**: Only include recognizable/relevant brands

#### Media Coverage
- **Outlets**: Include publication logos for credibility
- **Recent**: Focus on last 1-2 years
- **Variety**: Mix of industry and mainstream media

### Layout Tips

1. **Keep it Clean**: Don't enable all sections at once
2. **Visual Hierarchy**: Most important content first (hero → stats → events)
3. **Balance**: Mix text-heavy and visual sections
4. **Consistency**: Use brand colors throughout
5. **Performance**: Compress images/videos for fast loading

### Recommended Section Order

1. Hero (with stats if available)
2. Event Highlights (if you have great past events)
3. About & Services
4. Active Events Grid
5. Testimonials (social proof)
6. Team (humanize your brand)
7. Partners (credibility)
8. Media Coverage (authority)
9. Newsletter Signup

## Technical Notes

### Auto-Rotation Timings
- **Testimonials**: 6 seconds per testimonial
- **Hero Slideshow**: 8 seconds per image

### Responsive Design
- All sections are fully responsive
- Mobile-first approach
- Touch-friendly on tablets/phones

### Performance Optimizations
- Lazy loading for images below fold
- Video autoplay with `muted` and `playsInline`
- Compressed assets recommended

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Video hero requires HTML5 video support
- Fallback to image hero for older browsers

## Examples of What to Display

### For Music Event Organizers
- **Services**: Concert Production, Artist Management, Venue Booking, Sound Engineering
- **Stats**: Total events, artists featured, attendees, venue partnerships
- **Highlights**: Biggest concerts, festival highlights, sold-out shows
- **Partners**: Venues, sound companies, streaming platforms
- **Team**: Bookers, sound engineers, stage managers

### For Conference Organizers
- **Services**: Corporate Events, Keynote Coordination, Networking Facilitation, Tech Setup
- **Stats**: Conferences hosted, speakers featured, industries served, satisfaction rate
- **Highlights**: Major conferences, speaker highlights, attendance records
- **Partners**: Sponsors, venues, catering companies, A/V providers
- **Team**: Event directors, coordinators, tech support

### For Festival Organizers
- **Services**: Multi-Day Events, Camping Coordination, Multiple Stages, Food & Beverage
- **Stats**: Years running, total attendees, artists per year, economic impact
- **Highlights**: Festival moments, artist performances, crowd experiences
- **Partners**: Sponsors, food vendors, camping suppliers, security companies
- **Team**: Festival director, stage managers, logistics coordinators

### For Workshop/Educational Event Organizers
- **Services**: Skills Training, Professional Development, Certification Programs, Workshops
- **Stats**: Workshops hosted, participants trained, satisfaction rate, career outcomes
- **Highlights**: Popular workshops, success stories, expert instructors
- **Partners**: Educational institutions, companies, certification bodies
- **Team**: Instructors, coordinators, curriculum developers

## Platform Service Alignment

All Enterprise features align with existing EventNexus services:

### Analytics Integration
- Stats displayed come from Analytics Dashboard
- Real-time updates possible
- Revenue tracking (for internal use)

### Social Media Manager
- Social links connect to existing social accounts
- Content can be auto-promoted
- Integration with InstagramAPI and Twitter API

### Brand Protection
- Custom domain monitoring
- Trademark protection for enterprise clients
- Brand consistency enforcement

### Referral System
- Newsletter signups can trigger referral credits
- Partner network expansion
- Affiliate tracking

### Autonomous Operations
- Automated content suggestions
- AI-generated testimonial requests
- Performance optimization recommendations

### Payment Integration (Stripe Connect)
- Revenue stats pulled from Stripe
- Partner payout management
- Commission tracking

## Next Steps for Full Implementation

1. **User Profile Settings UI**: Add Enterprise customization panel
2. **Database Migration**: Update branding column to support new fields
3. **Admin Interface**: Allow staff to help Enterprise clients
4. **Analytics Integration**: Connect stats to AnalyticsDashboard
5. **Content Management**: Build UI for managing all sections
6. **Media Upload**: Integrate with storage for images/videos
7. **Domain Configuration**: DNS setup guide for custom domains
8. **SEO Optimization**: Meta tags, structured data for organic discovery
9. **Social Sharing**: OG tags for rich social media previews
10. **Performance Monitoring**: Track page load times and optimize

## Support Resources

- **Setup Guide**: Step-by-step walkthrough for Enterprise clients
- **Design Templates**: Pre-configured layouts for different industries
- **Content Examples**: Sample text, images, and structures
- **Best Practices**: Industry-specific recommendations
- **1-on-1 Support**: Dedicated success manager for Enterprise tier

---

**Questions or need assistance?**
Contact your dedicated Enterprise Success Manager or email: support@mail.eventnexus.eu
