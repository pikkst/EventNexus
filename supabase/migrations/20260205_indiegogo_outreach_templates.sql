-- Indiegogo B2B Outreach Templates (Feb 2026 Campaign)
-- Adds campaign skeletons and supporting variables for AI agents

INSERT INTO public.marketing_templates (name, subject_template, body_template, language, category, variables, ai_prompt)
VALUES
(
  'Indiegogo VIP Invitation',
  'Exclusive Partnership Opportunity: EventNexus Launch on Feb 13',
  'Hi {companyName},

I have been following {companyName}''s impact on the {category} scene in {country}.

I am Villu, founder of EventNexus, and I am reaching out because we are officially launching our global scaling phase on {launchDatetime}.

We are disrupting the industry by offering a 1.5% - 5% fee structure - a fraction of the 10-15% charged by legacy platforms. For {companyName}, this could mean a significant increase in net revenue per event.

Why I am reaching out to you today:
We are releasing only {lifetimeSlots} "Enterprise Lifetime" licenses during this round. This is a one-time opportunity to lock in our lowest fees and professional tools (like our Canva-powered seating charts) forever, with no recurring monthly costs.

I would love for {companyName} to be one of our founding global partners. You can view our public preview and roadmap here:
{indiegogoUrl}

Would you like to schedule a 5-minute demo before we go live next Friday?

Best regards,
{senderName}
Founder, EventNexus',
  'en',
  'Indiegogo',
  '["companyName", "category", "country", "indiegogoUrl", "lifetimeSlots", "launchDatetime", "senderName"]'::jsonb,
  'B2B Indiegogo outreach skeleton #1 (VIP Invitation). Preserve structure and key phrasing. Personalize with company, category, and country. Keep CTA to a 5-minute demo.'
),
(
  'Indiegogo Tech Edge',
  'Solving Seating and Streaming Complexity for {companyName}',
  'Hi {companyName},

Is {companyName} looking to simplify seating management for your upcoming projects in {location}?

We have integrated a Canva-powered visual seating chart builder into EventNexus. You can now design your venue layout in Canva and turn it into an interactive ticket-selection map in seconds.

Combined with our new Unlimited Live Streaming and AI Global Discovery (translating into 50+ languages), we provide the infrastructure for {companyName} to reach global audiences with almost zero overhead.

Our Indiegogo funding round starts on {launchDatetime}. We are offering early B2B partners a "Lifetime Enterprise" deal for EUR {lifetimePrice} (one-time payment). Considering standard Enterprise tools cost EUR 150/month, this pays for itself in just 6 months.

Check the tech here: {indiegogoUrl}

Are you open to a quick chat about how this can fit into your 2026 event calendar?

Best,
{senderName}
Founder, EventNexus',
  'en',
  'Indiegogo',
  '["companyName", "location", "launchDatetime", "lifetimePrice", "indiegogoUrl", "senderName"]'::jsonb,
  'B2B Indiegogo outreach skeleton #2 (Tech Edge). Focus on Canva seating charts and live streaming. Ideal for venues, MICE, and concert halls. Preserve structure.'
),
(
  'Indiegogo Launch Day Blast',
  'Live Now: Secure your Lifetime Partner status for {companyName}',
  'Hi {companyName},

This is a quick note to let you know that EventNexus is officially LIVE on Indiegogo as of 5 minutes ago.

As we discussed, the Enterprise Lifetime licenses are now available on a first-come, first-served basis.

Direct link to secure your tier:
{indiegogoUrl}

What {companyName} gets today:
- 1.5% Fee Lock (Lifetime)
- Unlimited Events and Live Streaming
- Canva Seating Chart Integration
- Custom Branding and White-labeling

We only have {lifetimeSlots} spots for this specific tier. I would love to see {companyName} on the map as one of our early global ambassadors.

Best regards,
{senderName}
Founder, EventNexus',
  'en',
  'Indiegogo',
  '["companyName", "indiegogoUrl", "lifetimeSlots", "senderName"]'::jsonb,
  'B2B Indiegogo outreach skeleton #3 (Launch Day Blast). Use only for top-list or interested prospects. Keep urgent tone and short length.'
);

INSERT INTO public.template_variables (variable_name, variable_value, variable_type, description, category) VALUES
('indiegogo_url', 'https://www.indiegogo.com/projects/eventnexus/eventnexus-the-global-ai-powered-event-map', 'url', 'Indiegogo campaign link', 'campaign'),
('enterprise_lifetime_slots', '30', 'number', 'Lifetime Enterprise license slots', 'campaign'),
('enterprise_lifetime_price_eur', '950', 'number', 'Lifetime Enterprise price in EUR', 'campaign'),
('indiegogo_launch_datetime', 'February 13 at 20:00 (EET)', 'text', 'Indiegogo launch date and time', 'campaign')
ON CONFLICT (variable_name) DO UPDATE SET
  variable_value = EXCLUDED.variable_value,
  updated_at = NOW();

INSERT INTO public.ai_platform_stats (stat_key, stat_value, stat_type, category)
SELECT 'canva_seating_charts', 'Canva-powered seating charts', 'text', 'features'
WHERE NOT EXISTS (SELECT 1 FROM public.ai_platform_stats WHERE stat_key = 'canva_seating_charts');

INSERT INTO public.ai_platform_stats (stat_key, stat_value, stat_type, category)
SELECT 'live_streaming', 'Unlimited live streaming', 'text', 'features'
WHERE NOT EXISTS (SELECT 1 FROM public.ai_platform_stats WHERE stat_key = 'live_streaming');
