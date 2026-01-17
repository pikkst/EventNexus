-- ============================================
-- Update Admin Organizer (hunteset) Bio
-- Date: 2026-01-18
-- Purpose: Update the EventNexus admin organizer profile to accurately reflect platform purpose (AI automation + admin management, founded late 2025)
-- ============================================

UPDATE public.users
SET 
  bio = E'EventNexus Admin & AI Automation Platform\n\nWe\'re the engineering and automation team behind EventNexus. Our mission: empower event organizers with cutting-edge technology to create unforgettable experiences.\n\nEventNexus combines AI-powered event discovery, intelligent ticketing systems, and seamless organizer tools to help events reach their audiences faster. Founded in late 2025, we\'re building the next generation of event management infrastructure.\n\nOur platform handles event curation, automated discovery through AI agents, real-time notifications, advanced analytics, and community engagement—all designed to help organizers focus on what matters: creating amazing events.',
  branding = jsonb_set(
    COALESCE(branding, '{}'::jsonb),
    '{about}',
    'null'::jsonb
  ),
  updated_at = NOW()
WHERE 
  agency_slug = 'hunteset' 
  AND role = 'admin';

-- Verify the update
SELECT id, name, bio, role, agency_slug, branding FROM public.users WHERE agency_slug = 'hunteset' LIMIT 1;
