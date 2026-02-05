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

INSERT INTO public.marketing_templates (name, subject_template, body_template, language, category, variables, ai_prompt)
VALUES
(
  'DE B2B - Efficiency (English)',
  'Optimizing ticketing costs and 1.5% fee lock for {companyName}',
  'Hi {companyName},

I have been following {companyName}''s work in the German {category} sector.

I''m Villu, founder of EventNexus, an Estonian-based AI event ecosystem (fully GDPR compliant). We are officially launching our global expansion on {launchDatetime} and I wanted to offer {companyName} a way to drastically reduce overhead for your 2026 events.

We are disrupting the industry by replacing high manual costs with autonomous AI agents, allowing us to offer platform fees of just 1.5% - 5% (compared to the 10-15% industry standard in Germany).

Why EventNexus is the right fit for your German operations:
- AI Global Discovery: Automatic translation into 50+ languages to reach tourists in cities like Berlin and Munich.
- Visual Seating Charts: Design your venue in Canva and turn it into an interactive map instantly.
- Automated Payouts: Funds triggered 2 days after the event via Stripe.

We are releasing only {lifetimeSlots} "Enterprise Lifetime" slots during our Indiegogo launch. This is a one-time opportunity to eliminate recurring monthly software fees forever.

You can view our full technical roadmap and live map here:
{indiegogoUrl}

If you have any questions about the integration or our 1.5% fee lock, simply reply to this email. I would be happy to provide more details.

Best regards,
{senderName}
Founder, EventNexus',
  'en',
  'Indiegogo',
  '["companyName", "category", "indiegogoUrl", "lifetimeSlots", "launchDatetime", "senderName"]'::jsonb,
  'B2B outreach for Germany in English. Focus on cost savings (1.5% fee), GDPR/EU base, and Canva seating. Remove any mention of calls. CTA is to check Indiegogo and reply via email.'
),
(
  'DE B2B - Formal (German)',
  'Kostenoptimierung und 1,5 % Gebuehren-Lock fuer {companyName}',
  'Sehr geehrte Damen und Herren von {companyName},

mein Name ist Villu Kuenapp, Gruender von EventNexus. Ich verfolge Ihre Arbeit im Bereich {category} in Deutschland mit grossem Interesse.

Wir haben eine KI-basierte Event-Plattform aus Estland (EU) entwickelt, die die Branche revolutioniert, indem sie die Plattformgebuehren auf 1,5 % bis 5 % senkt - ein Bruchteil der in Deutschland ueblichen 10-15 %.

Was EventNexus fuer {companyName} bietet:
1. Automatisierte globale Reichweite: KI-Uebersetzung in ueber 50 Sprachen fuer internationales Publikum.
2. Canva-Sitzplan-Integration: Erstellen Sie interaktive Saalplaene direkt ueber Canva.
3. DSGVO-Konformitaet: Entwicklung und Hosting sicher innerhalb der EU.

Am {launchDatetime} starten wir unsere Indiegogo-Kampagne und bieten exklusiv {lifetimeSlots} lebenslange Enterprise-Lizenzen an. Dies ist eine einmalige Gelegenheit, monatliche Abonnementgebuehren dauerhaft zu eliminieren.

Hier koennen Sie die Details und unsere Roadmap einsehen:
{indiegogoUrl}

Sollten Sie Fragen zur technischen Integration oder zu den Konditionen haben, antworten Sie bitte einfach auf diese E-Mail. Ich freue mich auf Ihre Rueckmeldung.

Mit freundlichen Gruessen,
{senderName}
Gruender, EventNexus',
  'de',
  'Indiegogo',
  '["companyName", "category", "indiegogoUrl", "lifetimeSlots", "launchDatetime", "senderName"]'::jsonb,
  'Formal German B2B template. Focus on cost reduction and GDPR. CTA is to visit Indiegogo and reply via email. No phone calls.'
);

INSERT INTO public.marketing_templates (name, subject_template, body_template, language, category, variables, ai_prompt)
VALUES
(
  'EE B2B - Global Ambition',
  'Eesti sundmustehnoloogia laheb globaalseks: Partnerluspakkumine {companyName}',
  'Tere {companyName} tiim!

Kirjutan teile, kuna olete Eesti sundmusmaastiku uks suunaseadjaid.

Olen Villu Kunnap, kodumaise startupi EventNexus asutaja. Oleme loonud tehisintellektil pohineva sundmuste okosusteemi, mis haldab tanaseks juba ule 1100 linna maailmas. Alustame {launchDatetime} suurt rahvusvahelist Indiegogo kampaaniat ja soovime kaasata Eesti tipptegijaid.

Miks EventNexus on {companyName} jaoks strateegiline valik?
- Madalaimad tasud: Meie platvormitasu on vaid 1.5% - 5% (vorreldes tavaparase 10-15%-ga).
- Automaatne valisturg: AI tolgib teie sundmused reaalajas 50+ keelde, tehes need leitavaks igale turistile ja valistudengile.
- Live-streaming: Taislahendus online-uritustele (piiramatu vaatajate arv).
- Toestatud kasv: Meie kogukond kasvab Facebookis 100+ liitujat paevas ja meil on 13 000+ e-maili tellijat.

Pakume Eesti partneritele piiratud koguses "Lifetime Enterprise" litsentse - uhekordne panus Indiegogos vabastab teid kuutasudest igaveseks.

Vaadake meie kampaaniat ja tehnilist teekaarti siit: {indiegogoUrl}

Olen meeleldi valmis vastama kusimustele ja leidma uhisosa, kuidas {companyName} sundmused maailmakaardil veelgi eredamalt silma paistaksid.

Parimate soovidega,
{senderName}
Asutaja, EventNexus',
  'et',
  'Indiegogo',
  '["companyName", "indiegogoUrl", "senderName", "launchDatetime", "lifetimeSlots"]'::jsonb,
  'High-level B2B outreach for Estonian industry leaders. Emphasize global scale, AI translation, and cost reduction. Professional and ambitious tone.'
),
(
  'EE B2B - Venue Efficiency',
  'Uue polvkonna piletisusteem ja interaktiivsed saaliplaanid {companyName} jaoks',
  'Tere {companyName}!

Kirjutan teile, et tutvustada uut Eesti tehnoloogiat, mis muudab saaliplaanide haldamise ja piletite muugi kordades lihtsamaks.

Olen Villu, sundmuste platvormi EventNexus asutaja. Oleme integreerinud unikaalse Canva-pohise istekohaplaanide mooduli. See tahendab, et saate oma saali plaani kujundada mugavalt Canvas ja me muudame selle sekunditega interaktiivseks piletisusteemiks, kus kulastajad naevad reaalajas vabu kohti.

Mida EventNexus veel pakub?
- Platvormitasu vaid 1.5% - 5%: Saastate markimisvaarselt igalt muudud piletilt.
- Kiired valjamaksed: Raha laekub teie kontole 2 paeva parast urituse toimumist (Stripe Connect).
- AI turunduspakett: Automaatne plakatite ja reklaamtekstide genereerimine.

Kuna avame {launchDatetime} oma globaalse rahastusvooru, pakume {companyName}-le voimalust soetada "Lifetime" litsents, mis kaotab tarkvara kuutasud igaveseks.

Kampaaniat ja saaliplaani tehnoloogiat naete siit: {indiegogoUrl}

Kui soovite naha kiiret demo, vastake lihtsalt sellele kirjale.

Edukat hooaega soovides,
{senderName}
EventNexus',
  'et',
  'Indiegogo',
  '["companyName", "indiegogoUrl", "senderName", "launchDatetime"]'::jsonb,
  'Targeting venues and theaters. Focus on Canva seating charts, low fees, and quick payouts via Stripe. Practical and efficient tone.'
),
(
  'EE B2B - Agency Growth',
  'AI-pohised tooriistad {companyName} urituste turundamiseks ja haldamiseks',
  'Tere {companyName}!

Uritusturundusagentuurina teate, kui palju aega kulub sundmuste ettevalmistamisele ja visuaalide loomisele. Olen Villu, Eesti startupi EventNexus asutaja, ja meil on lahendus, mis saastab teie tiimi aega ja raha.

Oleme loonud maailma esimese AI-pohise sundmuste okosusteemi, mis pakub agentuuridele:
- AI Marketing Suite: Genereerige professionaalseid postreid ja reklaame sekunditega (kasutades Imagen 3 tehnoloogiat).
- White-label lahendus: Kasutage meie voimast piletisusteemi oma brandi ja domeeni alt.
- Mangustatud kasutajakogemus: Tostke osalejate kaasatust labi XP-susteemi ja digitaalsete markide.
- Eksklusiivselt madalad tasud: Ainult 1.5% - 2.5% piletimuugilt.

Oleme {launchDatetime} avamas Indiegogo kampaaniat, kus pakume agentuuridele "Enterprise Lifetime" pakette. See on uhekordne investeering, mis annab teile tipptehnoloogia kasutamise oiguse igaveseks ilma kuutasudeta.

Tutvuge meie tehnoloogia ja kampaaniaga siin: {indiegogoUrl}

Kas oleksite huvitatud luhikesest ulevaatest, kuidas see saaks teie jargmisi projekte toetada?

Tervitades,
{senderName}
Asutaja, EventNexus',
  'et',
  'Indiegogo',
  '["companyName", "indiegogoUrl", "senderName", "launchDatetime"]'::jsonb,
  'Targeting event marketing agencies. Focus on AI Marketing Suite, white-labeling, and cost savings. Innovative and partnership-oriented tone.'
);

-- Netherlands B2B Templates (English - Dutch business standard)
INSERT INTO public.marketing_templates (name, subject_template, body_template, language, category, variables, ai_prompt)
VALUES
(
  'NL B2B - Global Festival',
  'Scaling international reach and reducing fees for {companyName}',
  'Hi {companyName},

I have been following your impact on the Dutch {category} scene—your events are world-class.

I''m Villu, founder of EventNexus, an Estonian AI event ecosystem. We are officially launching our global expansion on {launchDatetime} and I wanted to offer {companyName} a way to significantly increase net revenue for your 2026 season.

We are disrupting the industry by offering a 1.5% - 5% fee structure—an 80% reduction compared to the 10-15% industry standard.

Why EventNexus is a game-changer for Dutch festivals:
- AI Discovery & Translation: Our scouts automatically translate your events into 50+ languages to reach global tourists in Amsterdam and beyond.
- Massive Growth: Our community is growing by 100+ new members daily, with 13,000+ active subscribers.
- AI Marketing Suite: Auto-generate professional posters and ads via Imagen 3.

We are releasing only {lifetimeSlots} "Enterprise Lifetime" slots during our Indiegogo launch. This is a one-time opportunity to lock in our lowest fees forever.

Check our roadmap and live map (1,100+ cities) here: {indiegogoUrl}

If you have questions about the 1.5% fee lock, feel free to reply directly to this email.

Best regards,
{senderName}
Founder, EventNexus',
  'en',
  'Indiegogo',
  '["companyName", "category", "indiegogoUrl", "lifetimeSlots", "launchDatetime", "senderName"]'::jsonb,
  'High-level B2B outreach for Dutch festival giants (ID&T, Apenkooi, Friendly Fire, ESNS). Focus on cost savings (80% reduction), AI translation, and global scale. Professional and data-driven tone. Dutch market is highly intelligent and pragmatic—emphasize concrete business value and ROI.'
),
(
  'NL B2B - Venue Tech',
  'Visual Seating Charts and Payout Automation for {companyName}',
  'Hi {companyName},

As a leading venue in the Netherlands, you handle complex logistics and high volumes of ticket sales.

I''m Villu, founder of EventNexus. We''ve built a platform specifically to simplify venue management by integrating a Canva-powered visual seating chart builder. Design your hall in Canva once, and we turn it into an interactive, real-time ticket selection map.

Key benefits for {companyName}:
- Interactive Seating: Real-time availability and multi-tier pricing.
- Automated Payouts: Funds triggered 2 days after the event via Stripe Connect.
- Global Discovery: Our AI ensures international visitors in {location} can find your events in their own language.

Our Indiegogo round starts on {launchDatetime}. We offer a "Lifetime Enterprise" deal for EUR {lifetimePrice} which eliminates all future monthly software fees.

See the technology in action: {indiegogoUrl}

Would you like a brief technical overview via email? Just let me know.

Best regards,
{senderName}
Founder, EventNexus',
  'en',
  'Indiegogo',
  '["companyName", "location", "launchDatetime", "lifetimePrice", "indiegogoUrl", "senderName"]'::jsonb,
  'Targeting Dutch venues (TivoliVredenburg, Effenaar, Parktheater, Muziekgebouw). Focus on Canva seating charts, rapid payouts via Stripe, and AI discovery for international tourists. Technical and efficiency-oriented tone. Emphasize value for money—EUR 950 lifetime pays for itself in 5-6 months of ticket revenue.'
),
(
  'NL B2B - Agency White-Label',
  'AI-Powered Event Infrastructure for {companyName}',
  'Hi {companyName},

As a professional {category} agency, your clients expect innovation and seamless execution. 

I''m Villu, founder of EventNexus. We provide the modern infrastructure for agencies to scale their event offerings without high overhead costs.

Why Dutch agencies are moving to EventNexus:
- Unlimited Live Streaming: Host global virtual or hybrid events directly on the platform.
- White-Labeling: Use our powerful engine under your own brand and domain.
- 1.5% Fees: Keep more revenue for your clients and your agency.
- AI Marketing Suite: Generate high-end visual assets in seconds with Imagen 3.

We are launching our global scaling phase on Indiegogo on {launchDatetime}. We are offering early agency partners a "Lifetime Enterprise" package to lock in these terms forever.

You can view our preview and technical roadmap here: {indiegogoUrl}

Feel free to reply with any questions. We''d love to have {companyName} as a founding partner.

Best,
{senderName}
Founder, EventNexus',
  'en',
  'Indiegogo',
  '["companyName", "category", "launchDatetime", "indiegogoUrl", "senderName"]'::jsonb,
  'Targeting Dutch B2B/MICE agencies (PINO, effectgroep, Rotterdam Business Events). Focus on white-labeling, unlimited live streaming, and AI marketing tools. Partnership-oriented tone. Dutch agencies are algorithm fans—mention ChatGPT and Google AI-crawl as proof of tech leadership.'
);
