-- =====================================================================
-- EESTI B2B EMAIL TEMPLATES FOR MARKETING OUTREACH
-- Optimized for Estonian market with multi-channel approach
-- =====================================================================

-- Insert Estonian partnership templates
INSERT INTO marketing_templates (name, subject_template, body_template, language, category, variables, ai_prompt) VALUES

-- Template 1: EVENT ORGANIZER PARTNERSHIP (Estonian)
('Eesti Sündmusteorganisaatoritele - EventNexus Partnerlus',
'EventNexus Beta - Pileti müük 80% odavamalt',
'Tere,

Olen Villu Künnap, EventNexuse asutaja - uudne sündmuste platvorm mis toimib alates 2025 aastast.

**Miks see on teie jaoks oluline:**

• **Kulude kokkuhoid kuni 80%** - meie teenustasu on 1,5%-5%, mitte tööstuse standard 10-15%
• **Globaalne haare** - üle 1169 linna maailmas, automaatne tõlge 50+ keeles
• **AI turundusvahendid** - Gemini 3.0 poolt genereeritud plakati disainid ja sotsiaalmeedia postide sisu
• **Kiire maksete väljamaksmine** - automatiseeritud väljamaksed Stripe kaudu

EventNexus on hetkel beeta faasis ja otsime testpartnereid Eestist.

**Mis see teile tähendab:**
- Tasuta juurdepääs beeta faasis (enne täishinda)
- Otsene suhtlus arendusmeeskonnaga
- Võimalus mõjutada platvormi arengut
- Privaatne tugi läbi WhatsApp/telefon

Kas saaksime selle nädala jooksul 5 minutit rääkida? Saan näidata platvormi otse ja vastata kõikidele küsimustele.

Parimate soovidega,
Villu Künnap
Asutaja, EventNexus
villu@mail.eventnexus.eu
+372 5619 0981
www.eventnexus.eu',
'et',
'Event Organizers',
'["companyName", "contactName", "category", "country"]'::jsonb,
'Targeted at Estonian event organizers (festivals, concerts, sports). Emphasize cost savings and local support. Use informal tone (sinakeel ok for initial approach). Mention multi-channel support (phone/WhatsApp) as this is common in Estonia. Focus on beta testing opportunity with direct founder access.'
),

-- Template 2: TOURISM & HOSPITALITY (Estonian)
('Turism & Külalislahkus - EventNexus Koostöö',
'Turismisektori partnerlus - EventNexus',
'Tere,

Kirjutan teile EventNexusest - innovaatiline sündmuste avastamise platvorm.

Märkasin, et tegelete {category} valdkonnas ja arvasin, et meie platvorm võiks aidata:

**Kuidas EventNexus aitab turismisektorit:**

• **Rahvusvaheline haare** - sündmused on automaatselt tõlgitud 50+ keeles (sh inglise, soome, vene, saksa)
• **Kaardipõhine avastamine** - külastajad leiavad sündmusi otse kaardilt, mitte tekstiotsingust
• **AI turundus** - automaatsed plakatid ja sotsiaalmeedia sisu (Imagen 3 + Gemini 3.0)
• **Läbipaistev hinnakujundus** - teenustasu 1,5%-5% vs tööstuse 10-15%

Otsime Eestist beta teste ja pakume:
- Tasuta juurdepääs platvormile
- Otsene tugi läbi telefon/WhatsApp
- Võimalus mõjutada funktsionaalsusi

5-minutine videokõne sel nädalal? Saan näidata platvormi live ja vastata küsimustele.

Parimate soovidega,
Villu Künnap
Asutaja, EventNexus
villu@mail.eventnexus.eu
+372 5619 0981
www.eventnexus.eu',
'et',
'Tourism',
'["companyName", "category", "contactName"]'::jsonb,
'For Estonian tourism businesses (hotels, tour operators, attractions). Highlight international reach and automatic translation. Mention map-first discovery as this helps tourists. Focus on multi-language support and visual AI tools for international marketing.'
),

-- Template 3: CORPORATE & AGENCIES (Estonian)
('Äriklientidele - EventNexus B2B Lahendus',
'Sündmuste haldus - EventNexus platvorm',
'Tere,

Olen Villu Künnap EventNexusest. Märkasin, et {companyName} tegeleb {category} ja usun, et meie platvorm võiks aidata sündmuste korraldamisel.

**EventNexus äriklientidele:**

• **AI automatiseerimine** - sündmuste kirjeldused, plakatid, sotsiaalmeedia sisu (Gemini 3.0)
• **Ajakokkuhoid** - automatiseeritud piletimüük, QR koodid, maksete väljamaksed
• **Kulude kokkuhoid 80%** - 1,5%-5% teenustasu vs 10-15% standardhind
• **Globaalne haare** - 1169+ linna, automaatne tõlge 50+ keeles

**Beta programm (praegu avatud):**
- Tasuta juurdepääs kõikidele funktsioonidele
- Otsene suhtlus arendajatega (telefon/WhatsApp)
- Võimalus soovitada uusi funktsionaalsusi

Kas saaksime rääkida sel nädalal 5 minutit? Saan näidata demod ja vastata küsimustele.

Parimate soovidega,
Villu Künnap
Asutaja, EventNexus
villu@mail.eventnexus.eu
+372 5619 0981
www.eventnexus.eu',
'et',
'Corporate',
'["companyName", "category", "contactName"]'::jsonb,
'For Estonian corporate clients and agencies. Emphasize time savings and automation. Use professional tone (teiekeeles). Highlight AI features that save time on content creation. Focus on business efficiency and cost reduction.'
),

-- Template 4: INTERNATIONAL PARTNERSHIP (English - Global)
('International Partnership Opportunity - EventNexus',
'Partnership opportunity: Save 80% on event ticketing',
'Hello,

I''m Villu Künnap, founder of EventNexus - an AI-powered event platform revolutionizing how events are discovered and managed.

**Why this matters for {companyName}:**

• **80% cost reduction** - 1.5%-5% platform fees vs industry standard 10-15%
• **Global reach** - 1,169+ cities mapped worldwide
• **AI automation** - Gemini 3.0 translation (50+ languages), Imagen 3 poster generation
• **Fast payouts** - automated Stripe Connect transfers

**Current opportunity - Beta Program:**
We''re expanding globally and seeking testing partners. Benefits:
- Free platform access during beta
- Direct founder support (email + video calls)
- Influence product roadmap
- Priority onboarding

Quick 5-minute call this week to show you the platform live?

Best regards,
Villu Künnap
Founder, EventNexus
villu@mail.eventnexus.eu
+372 5XXX XXXX
www.eventnexus.eu',
'en',
'International',
'["companyName", "category", "country"]'::jsonb,
'For international prospects outside Estonia. Lead with cost savings and AI automation. Professional tone. Focus on beta opportunity with direct founder access. Emphasize global scale and technology advantages. Keep language concise and value-focused.'
),

-- Template 5: FOLLOW-UP AFTER NO RESPONSE (Estonian)
('Järelkontakt - EventNexus',
'Re: EventNexus partnerlus',
'Tere,

Kirjutasin mõni päev tagasi EventNexusest - sündmuste platvorm mis võimaldab kuni 80% kokkuhoidu piletimüügil.

Saan aru, et olete hõivatud. Lihtsalt tahtsin kindlustada, et mu meil jõudis teieni.

**Lühidalt:**
• Teenustasu 1,5%-5% (vs tööstuse 10-15%)
• AI turundus (automaatsed plakatid + tõlked 50 keeles)
• Beta testimine tasuta (praegu avatud)

Kas oleks huvitav 5-minutine vestlus telefoni/WhatsApp teel? Saan vastata küsimustele ja näidata platvormi.

Kui ei ole huvi, anna mulle teada - austan teie aega.

Parimate soovidega,
Villu Künnap
Asutaja, EventNexus
villu@mail.eventnexus.eu
+372 5XXX XXXX
www.eventnexus.eu',
'et',
'Follow-up',
'["companyName", "previousSubject"]'::jsonb,
'Follow-up after no response (7-10 days). Respectful tone acknowledging they''re busy. Brief reminder of key value prop. Easy opt-out option. Suggest quick phone/WhatsApp call as alternative to email. Use casual tone to show understanding.'
),

-- Template 6: POST-DEMO FOLLOW-UP (Multi-language capable)
('EventNexus Demo Järelkontakt',
'Tänan demo eest - EventNexus järgmised sammud',
'Tere,

Tänan demo eest! Loodan, et EventNexus jättis hea mulje.

**Mida nägime:**
• Kaardipõhine sündmuste avastamine
• AI turundusvahendid (plakatid, tõlked, sotsiaalmeedia)
• Piletimüük ja QR skaneerimine
• Automatiseeritud maksete väljamaksed

**Järgmised sammud (teie valik):**
1. **Kohene alustamine** - saan luua teie konto kohe (5 min)
2. **Proovisündmus** - loome koos esimese sündmuse (15 min)
3. **Lisainfot** - vastame küsimustele (telefon/WhatsApp/email)

Mis teile kõige paremini sobiks?

Parimate soovidega,
Villu Künnap
Asutaja, EventNexus
villu@mail.eventnexus.eu
+372 5619 0981
www.eventnexus.eu',
'et',
'Post-Demo',
'["companyName", "demoDate", "featuresShown"]'::jsonb,
'Send after demo/call. Warm tone thanking for their time. Quick recap of what was shown. Clear next steps with options (account creation, test event, or more questions). Multi-channel contact options. No pressure but clear CTAs.'
);

-- =====================================================================
-- TEMPLATE VARIABLES FOR PERSONALIZATION
-- =====================================================================

CREATE TABLE IF NOT EXISTS template_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variable_name TEXT NOT NULL UNIQUE,
  variable_value TEXT NOT NULL,
  description TEXT,
  category TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert current platform stats and contact info
INSERT INTO template_variables (variable_name, variable_value, description, category) VALUES
('admin_name', 'Villu Künnap', 'Founder name', 'contact'),
('admin_email', 'villu@mail.eventnexus.eu', 'Official contact email', 'contact'),
('admin_phone', '+372 5XXX XXXX', 'Contact phone (replace with real)', 'contact'),
('admin_whatsapp', '+372 5XXX XXXX', 'WhatsApp contact (replace with real)', 'contact'),
('platform_url', 'www.eventnexus.eu', 'Main platform URL', 'platform'),
('platform_phase', 'Beta Launch', 'Current development phase', 'platform'),
('total_users', '5+', 'Current user count', 'stats'),
('total_events', '1600+', 'Current event count', 'stats'),
('total_cities', '1169+', 'Cities mapped worldwide', 'stats'),
('platform_fee_min', '1.5%', 'Minimum platform fee', 'pricing'),
('platform_fee_max', '5%', 'Maximum platform fee', 'pricing'),
('industry_fee_avg', '10-15%', 'Industry average fee', 'pricing'),
('languages_supported', '50+', 'Languages supported by AI', 'features'),
('ai_model_translation', 'Gemini 3.0', 'AI translation model', 'features'),
('ai_model_image', 'Imagen 3', 'AI image generation model', 'features')
ON CONFLICT (variable_name) DO UPDATE SET
  variable_value = EXCLUDED.variable_value,
  updated_at = NOW();

-- =====================================================================
-- AI PLATFORM STATS (for AI agent context)
-- =====================================================================

CREATE TABLE IF NOT EXISTS ai_platform_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_key TEXT NOT NULL,
  stat_value TEXT NOT NULL,
  stat_type TEXT CHECK (stat_type IN ('count', 'percentage', 'text', 'date')),
  category TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert platform stats for AI context
INSERT INTO ai_platform_stats (stat_key, stat_value, stat_type, category) VALUES
('total_users', '5+', 'count', 'users'),
('total_events', '1600+', 'count', 'events'),
('total_cities', '1169', 'count', 'reach'),
('platform_phase', 'Beta Launch', 'text', 'status'),
('platform_fee_range', '1.5% - 5%', 'percentage', 'pricing'),
('industry_fee_avg', '10-15%', 'percentage', 'pricing'),
('cost_savings', 'Up to 80%', 'percentage', 'pricing'),
('languages_supported', '50+', 'count', 'features'),
('ai_translation_model', 'Gemini 3.0', 'text', 'features'),
('ai_image_model', 'Imagen 3', 'text', 'features'),
('payment_provider', 'Stripe Connect', 'text', 'features'),
('ticket_format', 'QR Code', 'text', 'features'),
('map_provider', 'OpenStreetMap + PostGIS', 'text', 'features'),
('react_version', '19', 'text', 'tech'),
('launch_date', '2025', 'date', 'timeline')
ON CONFLICT DO NOTHING;

-- =====================================================================
-- AI PLATFORM CHANGELOG (for keeping agents updated)
-- =====================================================================

CREATE TABLE IF NOT EXISTS ai_platform_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('feature', 'improvement', 'bugfix', 'breaking')),
  release_date DATE DEFAULT CURRENT_DATE,
  is_public BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert recent changes (keep AI agents informed)
INSERT INTO ai_platform_changelog (version, title, description, category, release_date) VALUES
('2.5.0', 'AI-Powered Marketing Outreach System', 'B2B lead generation with AI-generated emails, multi-language support, and Resend integration', 'feature', '2026-01-25'),
('2.4.0', 'Multi-Language Event Translation', 'Automatic event translation to 50+ languages using Gemini 3.0', 'feature', '2026-01-20'),
('2.3.0', 'AI Poster Generation', 'Generate event posters using Imagen 3 AI model', 'feature', '2026-01-15'),
('2.2.0', 'Stripe Connect Payouts', 'Automated payout system for event organizers', 'feature', '2026-01-10'),
('2.1.0', 'QR Code Ticketing', 'Contactless ticket scanning with mobile app support', 'feature', '2026-01-05'),
('2.0.0', 'Map-First Event Discovery', 'Rebuilt platform with PostGIS geospatial search', 'feature', '2025-12-01'),
('1.5.0', 'React 19 Upgrade', 'Performance improvements and modern UI patterns', 'improvement', '2025-11-15')
ON CONFLICT DO NOTHING;

-- =====================================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_marketing_templates_language ON marketing_templates(language);
CREATE INDEX IF NOT EXISTS idx_marketing_templates_category ON marketing_templates(category);
CREATE INDEX IF NOT EXISTS idx_template_variables_category ON template_variables(category);
CREATE INDEX IF NOT EXISTS idx_ai_platform_stats_category ON ai_platform_stats(category);
CREATE INDEX IF NOT EXISTS idx_ai_platform_changelog_release_date ON ai_platform_changelog(release_date DESC);

-- =====================================================================
-- ANALYTICS & TRACKING
-- =====================================================================

COMMENT ON TABLE marketing_templates IS 'B2B email templates for multi-language outreach campaigns';
COMMENT ON TABLE template_variables IS 'Dynamic variables for email personalization (stats, contact info, pricing)';
COMMENT ON TABLE ai_platform_stats IS 'Platform statistics for AI agent context generation';
COMMENT ON TABLE ai_platform_changelog IS 'Platform changelog to keep AI agents informed of new features';
