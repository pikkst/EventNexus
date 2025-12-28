-- ============================================================================
-- EVENTNEXUS WHITE-LABEL DEMO CONFIGURATION
-- ============================================================================
-- 
-- This script sets up a comprehensive white-label agency page with all
-- Enterprise features enabled and demo content populated.
--
-- Usage:
-- 1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/editor
-- 2. Create new query
-- 3. Copy this entire script
-- 4. **IMPORTANT**: Replace 'huntersest@gmail.com' with your email (line 24)
-- 5. Customize content (optional)
-- 6. Run query
-- 7. Visit: https://eventnexus.eu/#/agency/YOUR-SLUG
--
-- ============================================================================

UPDATE users 
SET branding = '{
  "primaryColor": "#6366f1",
  "accentColor": "#818cf8",
  "logoUrl": "https://placehold.co/200x60/6366f1/ffffff/png?text=Your+Agency",
  "customDomain": "events.youragency.com",
  "bannerUrl": "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1920&h=1080&fit=crop",
  "tagline": "Elevating Events Through Innovation & Excellence",
  "about": "Founded in 2020, we have revolutionized the event industry by combining cutting-edge technology with deeply personalized experiences.\\n\\nOur mission is simple: create moments that matter.\\n\\nFrom intimate gatherings to large-scale festivals, we bring expertise, creativity, and flawless execution to every project. Our team of seasoned professionals has delivered over 100 successful events across 20 countries, touching the lives of thousands of attendees.",
  "videoReel": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "socialLinks": {
    "website": "https://youragency.com",
    "twitter": "https://twitter.com/youragency",
    "instagram": "https://instagram.com/youragency"
  },
  "services": [
    {
      "icon": "Sparkles",
      "name": "Event Planning",
      "desc": "End-to-end event conceptualization, design, and execution with meticulous attention to detail."
    },
    {
      "icon": "Users",
      "name": "Community Building",
      "desc": "Foster engaged, loyal communities around your events through strategic engagement tactics."
    },
    {
      "icon": "Zap",
      "name": "Tech Integration",
      "desc": "Seamless ticketing platforms, check-in systems, and event management tools."
    },
    {
      "icon": "TrendingUp",
      "name": "Growth Marketing",
      "desc": "Data-driven marketing strategies to maximize attendance and event ROI."
    },
    {
      "icon": "Calendar",
      "name": "Venue Sourcing",
      "desc": "Access to premium venues worldwide with negotiated rates and availability guarantees."
    },
    {
      "icon": "Shield",
      "name": "Risk Management",
      "desc": "Comprehensive insurance, security planning, and contingency strategies."
    }
  ],
  "stats": {
    "totalEvents": 127,
    "totalAttendees": 45000,
    "totalRevenue": 2500000,
    "averageRating": 4.9,
    "followerCount": 3200,
    "upcomingEvents": 8,
    "activeYears": 4,
    "repeatAttendeeRate": 68
  },
  "team": [
    {
      "id": "1",
      "name": "Hunter Set",
      "role": "Founder & CEO",
      "avatar": "https://ui-avatars.com/api/?name=Hunter+Set&size=128&background=6366f1&color=fff&bold=true",
      "bio": "15 years in event management. Former VP at EventCorp. Passionate about creating unforgettable experiences."
    },
    {
      "id": "2",
      "name": "Sarah Johnson",
      "role": "Head of Operations",
      "avatar": "https://ui-avatars.com/api/?name=Sarah+Johnson&size=128&background=8b5cf6&color=fff&bold=true",
      "bio": "Operations wizard with expertise in logistics, vendor management, and on-site coordination."
    },
    {
      "id": "3",
      "name": "Mike Chen",
      "role": "Creative Director",
      "avatar": "https://ui-avatars.com/api/?name=Mike+Chen&size=128&background=3b82f6&color=fff&bold=true",
      "bio": "Award-winning designer specializing in event branding, stage design, and immersive experiences."
    },
    {
      "id": "4",
      "name": "Emma Rodriguez",
      "role": "Head of Marketing",
      "avatar": "https://ui-avatars.com/api/?name=Emma+Rodriguez&size=128&background=ec4899&color=fff&bold=true",
      "bio": "Growth hacker with 10+ years in digital marketing. Data-driven strategies that fill seats."
    }
  ],
  "testimonials": [
    {
      "id": "1",
      "author": "John Smith",
      "role": "Event Attendee",
      "content": "Best event experience of my life! Every detail was meticulously planned, from the stunning venue to the engaging activities. I left feeling inspired and connected.",
      "rating": 5,
      "avatar": "https://ui-avatars.com/api/?name=John+Smith&size=64&background=10b981&color=fff",
      "eventName": "Tech Summit 2024"
    },
    {
      "id": "2",
      "author": "Lisa Anderson",
      "role": "Corporate Client",
      "content": "We hired them for our annual conference and they exceeded all expectations. Professional, creative, and incredibly responsive. Our attendees are still raving about it.",
      "rating": 5,
      "avatar": "https://ui-avatars.com/api/?name=Lisa+Anderson&size=64&background=f59e0b&color=fff",
      "eventName": "Innovation Conference 2024"
    },
    {
      "id": "3",
      "author": "David Kim",
      "role": "Community Organizer",
      "content": "They transformed our small local event into a city-wide phenomenon. Their expertise in community building and marketing is unmatched.",
      "rating": 5,
      "avatar": "https://ui-avatars.com/api/?name=David+Kim&size=64&background=ef4444&color=fff",
      "eventName": "Community Festival 2023"
    }
  ],
  "partners": [
    {
      "id": "1",
      "name": "TechCorp",
      "logo": "https://placehold.co/200x80/e2e8f0/64748b/png?text=TechCorp",
      "website": "https://techcorp.example.com",
      "description": "Leading technology provider"
    },
    {
      "id": "2",
      "name": "EventSpace",
      "logo": "https://placehold.co/200x80/e2e8f0/64748b/png?text=EventSpace",
      "website": "https://eventspace.example.com",
      "description": "Premium venue network"
    },
    {
      "id": "3",
      "name": "MediaPro",
      "logo": "https://placehold.co/200x80/e2e8f0/64748b/png?text=MediaPro",
      "website": "https://mediapro.example.com",
      "description": "Event photography & videography"
    },
    {
      "id": "4",
      "name": "Catering Plus",
      "logo": "https://placehold.co/200x80/e2e8f0/64748b/png?text=CateringPlus",
      "website": "https://cateringplus.example.com",
      "description": "Gourmet catering services"
    },
    {
      "id": "5",
      "name": "Sound Systems Inc",
      "logo": "https://placehold.co/200x80/e2e8f0/64748b/png?text=SoundSystems",
      "website": "https://soundsystems.example.com",
      "description": "Professional AV equipment"
    },
    {
      "id": "6",
      "name": "Security Pro",
      "logo": "https://placehold.co/200x80/e2e8f0/64748b/png?text=SecurityPro",
      "website": "https://securitypro.example.com",
      "description": "Event security services"
    }
  ],
  "mediaCoverage": [
    {
      "id": "1",
      "outlet": "Forbes",
      "title": "How This Agency is Revolutionizing Live Event Experiences",
      "url": "https://forbes.com",
      "date": "2024-01-15",
      "logo": "https://placehold.co/200x50/1e293b/fff/png?text=FORBES"
    },
    {
      "id": "2",
      "outlet": "TechCrunch",
      "title": "Event Tech Startup Raises $5M to Scale Operations",
      "url": "https://techcrunch.com",
      "date": "2023-11-20",
      "logo": "https://placehold.co/200x50/0f766e/fff/png?text=TechCrunch"
    },
    {
      "id": "3",
      "outlet": "Event Manager Blog",
      "title": "Top 10 Event Agencies to Watch in 2024",
      "url": "https://eventmanagerblog.com",
      "date": "2023-12-10",
      "logo": "https://placehold.co/200x50/7c3aed/fff/png?text=EMB"
    }
  ],
  "eventHighlights": [
    {
      "id": "1",
      "title": "Tech Summit 2024",
      "description": "Our flagship annual conference bringing together 2,500+ tech leaders, innovators, and entrepreneurs for 3 days of networking, workshops, and inspiration.",
      "imageUrl": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop",
      "stats": {
        "attendance": 2500,
        "rating": 4.9,
        "revenue": 450000
      },
      "date": "2024-06-15"
    },
    {
      "id": "2",
      "title": "Music Festival Nights",
      "description": "A three-day music extravaganza featuring 50+ artists across 4 stages. Our most attended event to date with incredible energy and production.",
      "imageUrl": "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&h=600&fit=crop",
      "stats": {
        "attendance": 15000,
        "rating": 4.8
      },
      "date": "2023-08-20"
    },
    {
      "id": "3",
      "title": "Corporate Innovation Day",
      "description": "Intimate executive summit for Fortune 500 leaders focused on digital transformation and future-of-work strategies.",
      "imageUrl": "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&h=600&fit=crop",
      "stats": {
        "attendance": 200,
        "rating": 5.0
      },
      "date": "2024-03-10"
    }
  ],
  "pageConfig": {
    "heroType": "video",
    "heroMedia": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    "showStats": true,
    "showTestimonials": true,
    "showTeam": true,
    "showPartners": true,
    "showMediaCoverage": true,
    "showEventHighlights": true,
    "enableContactForm": true,
    "enableNewsletter": true,
    "enableSocialSharing": true,
    "enableVIPAccess": false,
    "customSections": [],
    "layout": "modern",
    "theme": "dark"
  }
}'::jsonb
WHERE email = 'huntersest@gmail.com';  -- ⚠️ CHANGE THIS TO YOUR EMAIL

-- ============================================================================
-- VERIFY THE UPDATE
-- ============================================================================

SELECT 
  id,
  name,
  email,
  role,
  subscription_tier,
  agency_slug,
  branding->>'primaryColor' as primary_color,
  branding->>'customDomain' as custom_domain,
  branding->>'tagline' as tagline,
  branding->'pageConfig'->>'heroType' as hero_type,
  branding->'pageConfig'->>'enableContactForm' as contact_form_enabled,
  jsonb_array_length(branding->'services') as services_count,
  jsonb_array_length(branding->'team') as team_count,
  jsonb_array_length(branding->'testimonials') as testimonials_count,
  jsonb_array_length(branding->'partners') as partners_count,
  jsonb_array_length(branding->'mediaCoverage') as media_coverage_count,
  jsonb_array_length(branding->'eventHighlights') as event_highlights_count
FROM users 
WHERE email = 'huntersest@gmail.com';  -- ⚠️ CHANGE THIS TO YOUR EMAIL

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================
-- 
-- After running this script, you should see:
-- - primary_color: #6366f1
-- - custom_domain: events.youragency.com
-- - tagline: Elevating Events Through Innovation & Excellence
-- - hero_type: video
-- - contact_form_enabled: true
-- - services_count: 6
-- - team_count: 4
-- - testimonials_count: 3
-- - partners_count: 6
-- - media_coverage_count: 3
-- - event_highlights_count: 3
--
-- Your white-label page will be available at:
-- https://eventnexus.eu/#/agency/YOUR-SLUG
--
-- ============================================================================
-- CUSTOMIZATION GUIDE
-- ============================================================================
--
-- To customize this configuration:
--
-- 1. COLORS: Change primaryColor and accentColor hex codes
-- 2. DOMAIN: Update customDomain to your actual domain
-- 3. CONTENT: Edit tagline, about, services, team, etc.
-- 4. MEDIA: Replace placeholder URLs with your actual images/videos
-- 5. HERO: Change heroType to 'image' or 'slideshow' if preferred
-- 6. TOGGLES: Set any show* flags to false to hide sections
--
-- For detailed customization guide, see:
-- /workspaces/EventNexus/docs/WHITE_LABEL_SETUP_GUIDE.md
--
-- ============================================================================

-- Alternative: Image Hero Configuration
/*
UPDATE users 
SET branding = jsonb_set(
  branding,
  '{pageConfig,heroType}',
  '"image"'
)
WHERE email = 'huntersest@gmail.com';

UPDATE users 
SET branding = jsonb_set(
  branding,
  '{pageConfig,heroMedia}',
  '"https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1920&h=1080&fit=crop"'
)
WHERE email = 'huntersest@gmail.com';
*/

-- Alternative: Slideshow Hero Configuration
/*
UPDATE users 
SET branding = jsonb_set(
  branding,
  '{pageConfig,heroType}',
  '"slideshow"'
)
WHERE email = 'huntersest@gmail.com';

UPDATE users 
SET branding = jsonb_set(
  branding,
  '{pageConfig,heroMedia}',
  '["https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1920", "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920", "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1920"]'::jsonb
)
WHERE email = 'huntersest@gmail.com';
*/

-- Disable specific sections (example)
/*
UPDATE users 
SET branding = jsonb_set(
  branding,
  '{pageConfig,showPartners}',
  'false'
)
WHERE email = 'huntersest@gmail.com';

UPDATE users 
SET branding = jsonb_set(
  branding,
  '{pageConfig,enableNewsletter}',
  'false'
)
WHERE email = 'huntersest@gmail.com';
*/

-- Quick color change (example)
/*
UPDATE users 
SET branding = jsonb_set(
  jsonb_set(
    branding,
    '{primaryColor}',
    '"#8b5cf6"'  -- Purple
  ),
  '{accentColor}',
  '"#a78bfa"'  -- Light purple
)
WHERE email = 'huntersest@gmail.com';
*/
