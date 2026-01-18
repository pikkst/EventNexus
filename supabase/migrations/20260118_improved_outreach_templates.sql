-- Improved B2B Outreach Templates
-- Three strategic variants: Fee Crusher, Global Expansion, Tech Innovator

-- Clear existing templates (optional - remove if you want to keep old ones)
-- DELETE FROM public.marketing_templates;

-- Template 1: "The Fee Crusher" - Focus on cost savings
INSERT INTO public.marketing_templates (name, subject_template, body_template, language, category, ai_prompt)
VALUES (
  'Fee Crusher - Cost Savings Focus',
  'Reducing ticketing overhead for {companyName}',
  'Hi {contactName},

I''ve been following {companyName}''s impressive work in the {category} sector in {country}.

I''m reaching out because we''ve launched EventNexus, an AI-powered ecosystem designed to cut industry-standard ticketing fees by up to 80%. While most platforms charge 10-15%, our fees range from 1.5% to 5%.

Beyond the cost savings, we offer:
• AI Global Discovery: Your events are automatically translated into 50+ languages.
• Instant Marketing: Auto-generate posters and social ads using our integrated Imagen 3 AI.
• Automated Payouts: Funds are triggered 2 days after the event via Stripe.

We are currently mapping {location} and would love to feature {companyName} as a premier partner. Are you open to a brief 5-minute chat about how we can increase your net revenue per ticket?

Best regards,
{senderName}
Founder, EventNexus
www.eventnexus.eu',
  'en',
  NULL,
  'Focus on dramatic cost reduction (80% savings vs traditional platforms). Emphasize that while competitors charge 10-15%, EventNexus fees are only 1.5%-5%. Target large venues and festivals that handle high ticket volumes. Mention AI translation to 50+ languages, AI-generated marketing materials (Imagen 3), and automated payouts. Keep tone professional and ROI-focused. End with low-commitment ask (5-minute chat).'
);

-- Template 2: "The Global Expansion" - Focus on international reach
INSERT INTO public.marketing_templates (name, subject_template, body_template, language, category, ai_prompt)
VALUES (
  'Global Expansion - International Visibility',
  'Bringing more international visitors to {companyName}',
  'Hi {contactName},

Discovery is the biggest challenge for global audiences. At EventNexus, we''ve solved the "language barrier" for the {category} industry.

Our platform uses Gemini 3.0 AI to instantly map and translate events for travelers and locals alike. We already have 1,169 active cities live, and we noticed {companyName} is a key player in {location}.

By listing on EventNexus, you get:
• Automated Global Reach: Instant translation for tourists in 50+ languages.
• Next-Gen Tech: An interactive, map-first discovery experience (React 19/PostGIS).
• Low Friction: Secure QR ticketing and rapid automated payouts.

I''d love to show you how our AI "Scouts" can help {companyName} reach a wider, global audience. Do you have a moment later this week?

Best regards,
{senderName}
Founder, EventNexus
www.eventnexus.eu',
  'en',
  NULL,
  'Focus on solving the language/discovery barrier for international audiences. Target tourism attractions, international festivals, and venues that want foreign visitors. Emphasize Gemini 3.0 AI translation, 1,169 cities coverage, and map-first discovery. Mention React 19 and PostGIS for technical credibility. Position EventNexus as the solution to reach global tourists. End with collaborative tone about showing them the platform.'
);

-- Template 3: "The Tech Innovator" - Focus on AI marketing and gamification
INSERT INTO public.marketing_templates (name, subject_template, body_template, language, category, ai_prompt)
VALUES (
  'Tech Innovator - AI Marketing Suite',
  'AI-Powered Marketing Suite for {companyName}',
  'Hi {contactName},

Is {companyName} looking to automate its event marketing and community engagement?

We''ve built EventNexus, the first event platform with a built-in AI Marketing Suite and Gamification Engine. We help {category} professionals save hours of work by auto-generating professional posters, social ads, and managing community XP rewards.

Why partner with us?
• Imagen 3 Integration: Generate high-end marketing materials in seconds.
• Community Engagement: Use our badge and leaderboard system to drive attendee loyalty.
• Transparent Pricing: No hidden fees, just 1.5% - 5% platform commission.

We are onboarding a select group of agencies in {country} this month. I''d love to give you a quick demo of our AI Marketing Suite.

Best,
{senderName}
Founder, EventNexus
www.eventnexus.eu',
  'en',
  NULL,
  'Focus on automation of marketing tasks and community building. Target corporate event agencies and innovative companies. Emphasize time-savings through AI-generated marketing materials (Imagen 3), gamification features (badges, XP, leaderboards), and transparent pricing. Position as "first platform" with built-in AI Marketing Suite. Create sense of exclusivity ("select group" being onboarded). End with demo offer to show tangible value.'
);

-- Template 4: Indiegogo Expansion Variant (bonus template)
INSERT INTO public.marketing_templates (name, subject_template, body_template, language, category, ai_prompt)
VALUES (
  'Indiegogo Early Partner - Exclusive Terms',
  'Exclusive lifetime partnership terms for {companyName}',
  'Hi {contactName},

I''m Villu Künnap, founder of EventNexus. We''re currently in our global expansion phase via Indiegogo, and I wanted to reach out to {companyName} personally.

As an early partner, you would get:
• Lifetime fee lock at 1.5% - 5% (vs industry standard 10-15%)
• Priority onboarding and dedicated support
• Co-marketing opportunities as a featured partner
• Full access to our AI Marketing Suite (Imagen 3 poster generation)
• Automated global discovery in 50+ languages

We''ve already mapped 1,169 cities worldwide and are specifically targeting premier {category} organizations in {country}.

This is a limited-time opportunity during our campaign. Can we schedule a 5-minute call this week to discuss how EventNexus can help {companyName} reduce fees and expand your reach?

Best regards,
{senderName}
Founder, EventNexus
www.eventnexus.eu | Indiegogo Campaign Live Now',
  'en',
  NULL,
  'Leverage Indiegogo campaign to create urgency and exclusivity. Emphasize "lifetime terms" and "early partner" benefits. Combine all value props: low fees, AI marketing, global reach. Target organizations that want to be innovators/early adopters. Create FOMO with "limited-time opportunity" and specific campaign mention. Position as founder personally reaching out for added credibility.'
);

-- Update comments
COMMENT ON TABLE public.marketing_templates IS 'Email templates for B2B outreach campaigns with strategic variants';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Improved outreach templates created successfully:';
  RAISE NOTICE '   1. Fee Crusher (cost savings)';
  RAISE NOTICE '   2. Global Expansion (international reach)';
  RAISE NOTICE '   3. Tech Innovator (AI marketing)';
  RAISE NOTICE '   4. Indiegogo Early Partner (exclusivity)';
END $$;
