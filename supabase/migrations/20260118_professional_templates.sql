-- Professional Email Templates & Variables Setup
-- Admin: Villu Künnap | villu@mail.eventnexus.eu

-- 1. Update template variables with professional info
UPDATE public.template_variables SET variable_value = 'Villu Künnap' WHERE variable_name = 'admin_name';
UPDATE public.template_variables SET variable_value = 'Partnership Manager' WHERE variable_name = 'admin_title';
UPDATE public.template_variables SET variable_value = 'villu@mail.eventnexus.eu' WHERE variable_name = 'admin_email';
UPDATE public.template_variables SET variable_value = '+372 5XXX XXXX' WHERE variable_name = 'admin_phone';

-- 2. Insert professional email templates

-- Template 1: Initial Outreach (English)
INSERT INTO public.marketing_templates (
  name, subject_template, body_template, language, category, 
  from_name, from_email, reply_to, signature, ai_prompt, is_active
) VALUES (
  'Initial Partnership Outreach - EN',
  'Partnership Opportunity: {{company_name}} & EventNexus',
  'Hi {{recipient_name}},

I''m reaching out from EventNexus, an AI-powered event discovery and ticketing platform that''s transforming how people find and experience events across Europe.

**Why I''m contacting you:**
{{category}} businesses like {{prospect_company}} are perfectly positioned to benefit from our platform''s reach and technology. We currently serve {{total_events}}+ active events and are seeing strong growth in the {{country}} market.

**What we offer:**
• AI-powered event promotion reaching targeted audiences
• Seamless ticketing with 2.5% platform fee (industry-leading)
• Multi-language support (9 languages including Estonian)
• Real-time analytics and insights
• White-label options for enterprises

**Recent platform updates:**
{{recent_features}}

**Next steps:**
I''d love to schedule a brief 15-minute call to explore how EventNexus could support {{prospect_company}}''s goals. Are you available next week?

Looking forward to connecting!

Best regards,
{{admin_name}}
{{admin_title}}
EventNexus
{{admin_email}} | {{company_website}}',
  'en',
  'Technology',
  'Villu Künnap',
  'villu@mail.eventnexus.eu',
  'villu@mail.eventnexus.eu',
  'Villu Künnap | Partnership Manager | EventNexus',
  'Generate personalized B2B outreach email. Emphasize platform benefits relevant to their industry. Professional yet friendly tone. Include specific platform stats.',
  true
), (
  'Initial Partnership Outreach - ET',
  'Partnerluse võimalus: {{company_name}} & EventNexus',
  'Tere {{recipient_name}},

Võtan ühendust EventNexusest - AI-põhine ürituste avastamise ja piletimüügi platvorm, mis muudab ürituste leidmise ja osavõtu kogemust kogu Euroopas.

**Miks võtan ühendust:**
{{category}} valdkonna ettevõtted nagu {{prospect_company}} on ideaalses positsioonis meie platvormi ulatusest ja tehnoloogiast kasu saama. Praegu teenindame {{total_events}}+ aktiivset üritust ja näeme tugevat kasvu {{country}} turul.

**Mida me pakume:**
• AI-põhine ürituste reklaam, mis jõuab sihitud auditooriumini
• Sujuv piletimüük 2,5% platvormitasuga (tööstuse parim)
• Mitmekeelne tugi (9 keelt sh. eesti keel)
• Reaalajas analüütika ja ülevaated
• White-label lahendused suurettevõtetele

**Viimased platvormi uuendused:**
{{recent_features}}

**Järgmised sammud:**
Soovin kokku leppida lühikese 15-minutilise kõne, et arutada kuidas EventNexus saaks toetada {{prospect_company}} eesmärke. Kas teil sobib järgmisel nädalal?

Ootan huviga koostöövõimalusi!

Lugupidamisega,
{{admin_name}}
{{admin_title}}
EventNexus
{{admin_email}} | {{company_website}}',
  'et',
  'Technology',
  'Villu Künnap',
  'villu@mail.eventnexus.eu',
  'villu@mail.eventnexus.eu',
  'Villu Künnap | Partnerlussuhete Juht | EventNexus',
  'Genereeri isikupärastatud B2B kirja. Rõhuta platvormi eeliseid, mis on asjakohased nende tööstusharu jaoks. Professionaalne aga sõbralik toon.',
  true
);

-- Template 2: Follow-up (English)
INSERT INTO public.marketing_templates (
  name, subject_template, body_template, language, category,
  from_name, from_email, reply_to, signature, ai_prompt, is_active
) VALUES (
  'Follow-up Email - EN',
  'Re: Partnership with EventNexus',
  'Hi {{recipient_name}},

I wanted to follow up on my previous message about a potential partnership between {{prospect_company}} and EventNexus.

**Quick recap:**
EventNexus is seeing exceptional growth - {{growth_rate}}% increase in event listings over the past week alone. The {{country}} market is particularly active, and I believe {{prospect_company}} could benefit significantly from our platform.

**What makes us different:**
✓ AI-powered matching connects events with ideal audiences
✓ Zero upfront costs - only 2.5% per successful ticket sale
✓ Multilingual support (serving 9+ markets)
✓ Enterprise-grade analytics

**Time-sensitive opportunity:**
We''re currently onboarding select partners in your region with preferential terms. This window closes {{deadline}}.

**Can we talk?**
Even a brief 10-minute conversation could open doors to significant opportunities. What does your calendar look like this week?

Best regards,
{{admin_name}}
{{admin_title}}
EventNexus
{{admin_email}} | {{admin_phone}}',
  'en',
  'Technology',
  'Villu Künnap',
  'villu@mail.eventnexus.eu',
  'villu@mail.eventnexus.eu',
  'Villu Künnap | Partnership Manager | EventNexus',
  'Generate follow-up email. Reference previous contact. Add urgency without being pushy. Include specific growth metrics.',
  true
);

-- Template 3: Demo Invitation (English)
INSERT INTO public.marketing_templates (
  name, subject_template, body_template, language, category,
  from_name, from_email, reply_to, signature, ai_prompt, is_active
) VALUES (
  'Platform Demo Invitation - EN',
  '15-min EventNexus Demo for {{company_name}}',
  'Hi {{recipient_name}},

Thank you for your interest in EventNexus! I''d like to invite you to a personalized 15-minute platform demonstration.

**What you''ll see:**
→ Live demo of our AI-powered event discovery system
→ Backend analytics dashboard walkthrough
→ Ticketing & payment flow demonstration
→ Custom integration possibilities for {{prospect_company}}
→ Real examples from {{total_events}}+ active events

**Recent success stories:**
Our platform partners are seeing:
• 3-5x increase in event visibility
• 40% higher ticket conversion rates
• 60% reduction in manual promotion work
• Real-time insights driving better decisions

**Pick a time:**
{{calendar_link}}

Or suggest an alternative time that works better for you.

**What to prepare:**
Nothing! Just bring your questions. This is a no-pressure conversation to explore if EventNexus fits your needs.

Looking forward to showing you what''s possible!

{{admin_name}}
{{admin_title}}
EventNexus
{{admin_email}} | Schedule: {{calendar_link}}',
  'en',
  'Technology',
  'Villu Künnap',
  'villu@mail.eventnexus.eu',
  'villu@mail.eventnexus.eu',
  'Villu Künnap | Partnership Manager | EventNexus',
  'Generate demo invitation email. Emphasize value and convenience. Include social proof. Low-pressure approach.',
  true
);

-- Template 4: Meeting Follow-up (English)
INSERT INTO public.marketing_templates (
  name, subject_template, body_template, language, category,
  from_name, from_email, reply_to, signature, ai_prompt, is_active
) VALUES (
  'Post-Meeting Follow-up - EN',
  'Great connecting! Next steps for {{company_name}}',
  'Hi {{recipient_name}},

Thank you for taking the time to speak with me today! I really enjoyed learning more about {{prospect_company}}''s goals and challenges.

**Key takeaways from our conversation:**
{{meeting_notes}}

**As discussed, here''s what happens next:**
1. {{next_step_1}}
2. {{next_step_2}}
3. {{next_step_3}}

**Resources I mentioned:**
• Platform overview: {{company_website}}
• Case studies: {{company_website}}/success-stories
• Technical documentation: {{company_website}}/docs
• Pricing details: {{company_website}}/pricing

**Questions from the call:**
{{question_1}} - {{answer_1}}
{{question_2}} - {{answer_2}}

**Timeline:**
Based on our discussion, I''ll follow up on {{follow_up_date}} with {{deliverable}}.

**In the meantime:**
Feel free to reach me anytime at {{admin_email}} or {{admin_phone}}. I''m here to support you through this process.

Excited about the potential partnership!

{{admin_name}}
{{admin_title}}
EventNexus
{{admin_email}} | {{admin_phone}}',
  'en',
  'Technology',
  'Villu Künnap',
  'villu@mail.eventnexus.eu',
  'villu@mail.eventnexus.eu',
  'Villu Künnap | Partnership Manager | EventNexus',
  'Generate meeting follow-up email. Summarize key points. List clear next steps. Reference specific discussion topics.',
  true
);

-- Template 5: Response to Inquiry (English)
INSERT INTO public.marketing_templates (
  name, subject_template, body_template, language, category,
  from_name, from_email, reply_to, signature, ai_prompt, is_active
) VALUES (
  'Response to Inquiry - EN',
  'Re: {{inquiry_subject}}',
  'Hi {{recipient_name}},

Thanks for reaching out to EventNexus! I''m happy to help with your inquiry about {{inquiry_topic}}.

**Direct answer:**
{{answer_summary}}

**Additional context:**
{{additional_info}}

**How EventNexus can help {{company_name}}:**
Based on your inquiry, I think you''d benefit from:
• {{benefit_1}}
• {{benefit_2}}
• {{benefit_3}}

**Platform at a glance:**
→ {{total_events}}+ active events across {{country_count}} countries
→ AI-powered audience targeting
→ 2.5% platform fee (no hidden costs)
→ {{platform_phase}} with strong growth trajectory

**Would you like to learn more?**
I can arrange a quick 15-minute call to discuss your specific needs and show you relevant examples from our platform.

Available times: {{availability}}

Or feel free to ask any follow-up questions here - I typically respond within 2 hours during business days.

Best regards,
{{admin_name}}
{{admin_title}}
EventNexus
{{admin_email}} | {{admin_phone}}',
  'en',
  'Technology',
  'Villu Künnap',
  'villu@mail.eventnexus.eu',
  'villu@mail.eventnexus.eu',
  'Villu Künnap | Partnership Manager | EventNexus',
  'Generate helpful inquiry response. Answer directly first. Then provide additional value. Include call-to-action.',
  true
);

-- Template 6: Partnership Proposal (Estonian)
INSERT INTO public.marketing_templates (
  name, subject_template, body_template, language, category,
  from_name, from_email, reply_to, signature, ai_prompt, is_active
) VALUES (
  'Partnership Proposal - ET',
  'EventNexus partnerluse pakkumine: {{company_name}}',
  'Tere {{recipient_name}},

Tänan teid huvi eest EventNexuse platvormi vastu! Olen koostanud partnerluse pakkumise, mis on spetsiaalselt kohandatud {{prospect_company}} vajadustele.

**Meie pakkumine:**

**1. Platvormi juurdepääs**
• {{total_events}}+ aktiivne üritus platvormil
• AI-põhine sihtrühma leidmine
• 9 keelt (sh. eesti, inglise, soome)
• Reaalajas analüütika

**2. Äritingimused**
• Platvormitasu: 2,5% müüdud piletist
• Esimesed 100 piletit tasuta ({{currency}}{{value}} väärtuses)
• Soodushind suuremahulistele üritustele
• Pühendatud tugi eesti keeles

**3. Lisaväärtus**
• Valge sildiga (white-label) võimalused
• API integratsioon teie süsteemidega
• Kohandatud brändingu tugi
• Prioriteetne klienditugi

**4. Ajakava**
• Seadistamine: 1-2 nädalat
• Integratsioon: 2-4 nädalat
• Käivitus: Vastavalt teie graafikule

**Järgmised sammud:**
1. Vaadake üle ettepanek
2. Lepime kokku 30-minutilises kõnes detailide arutamiseks
3. Alustame pilootprojektiga (soovi korral)

**Küsimused?**
Olen valmis vastama kõigile teie küsimustele. Saadage mulle email või helistage otse.

Ootan teie tagasisidet!

Lugupidamisega,
{{admin_name}}
{{admin_title}}
EventNexus
{{admin_email}} | {{admin_phone}}
{{company_website}}',
  'et',
  'Technology',
  'Villu Künnap',
  'villu@mail.eventnexus.eu',
  'villu@mail.eventnexus.eu',
  'Villu Künnap | Partnerlussuhete Juht | EventNexus',
  'Genereeri detailne partnerluse pakkumine. Sisalda hinnakujundust, ajakava, lisaväärtust. Professionaalne ja selge.',
  true
);

-- 3. Add more template variables for flexibility
INSERT INTO public.template_variables (variable_name, variable_value, variable_type, description, category) VALUES
('calendar_link', 'https://calendly.com/eventnexus/demo', 'url', 'Booking calendar link', 'contact'),
('mobile_phone', '+372 5XXX XXXX', 'phone', 'Mobile phone number', 'contact'),
('office_address', 'Tallinn, Estonia', 'text', 'Office location', 'company'),
('vat_number', 'EE102XXXXXX', 'text', 'VAT registration number', 'legal'),
('company_registration', '16XXXXXX', 'text', 'Company registration number', 'legal'),
('facebook_url', 'https://facebook.com/eventnexus', 'url', 'Facebook page', 'company'),
('twitter_url', 'https://twitter.com/eventnexus', 'url', 'Twitter/X profile', 'company'),
('instagram_url', 'https://instagram.com/eventnexus', 'url', 'Instagram profile', 'company')
ON CONFLICT (variable_name) DO UPDATE SET
  variable_value = EXCLUDED.variable_value,
  updated_at = NOW();

COMMENT ON TABLE public.marketing_templates IS 'Professional email templates with AI customization - Admin: Villu Künnap';
