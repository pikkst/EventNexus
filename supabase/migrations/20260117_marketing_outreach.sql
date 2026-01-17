-- Marketing Outreach System for B2B Lead Generation
-- Stores companies, contacts, and AI-generated email campaigns

-- Companies/Prospects table
CREATE TABLE IF NOT EXISTS public.marketing_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  website TEXT,
  category TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  description TEXT,
  country TEXT NOT NULL DEFAULT 'Estonia',
  language TEXT NOT NULL DEFAULT 'en', -- Primary language (en, et, fi, etc.)
  source_url TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  last_contacted_at TIMESTAMPTZ,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'responded', 'interested', 'converted', 'not_interested', 'invalid')),
  contact_count INTEGER DEFAULT 0,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Email campaigns/outreach records
CREATE TABLE IF NOT EXISTS public.marketing_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES public.marketing_prospects(id) ON DELETE CASCADE,
  campaign_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'opened', 'replied', 'bounced', 'failed')),
  ai_generated BOOLEAN DEFAULT false,
  personalization_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Campaign templates
CREATE TABLE IF NOT EXISTS public.marketing_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  category TEXT, -- Matches prospect category
  variables JSONB DEFAULT '[]'::jsonb, -- List of variables like {companyName}, {category}
  ai_prompt TEXT, -- Prompt for AI to customize this template
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign analytics
CREATE TABLE IF NOT EXISTS public.marketing_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  emails_sent INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_replied INTEGER DEFAULT 0,
  emails_bounced INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  country TEXT,
  category TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(date, country, category)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_prospects_status ON public.marketing_prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_country ON public.marketing_prospects(country);
CREATE INDEX IF NOT EXISTS idx_prospects_email ON public.marketing_prospects(email);
CREATE INDEX IF NOT EXISTS idx_outreach_prospect ON public.marketing_outreach(prospect_id);
CREATE INDEX IF NOT EXISTS idx_outreach_status ON public.marketing_outreach(status);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON public.marketing_analytics(date);

-- RLS Policies
ALTER TABLE public.marketing_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_outreach ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_analytics ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admin full access to prospects" ON public.marketing_prospects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin full access to outreach" ON public.marketing_outreach
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin full access to templates" ON public.marketing_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin read analytics" ON public.marketing_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Function to update analytics
CREATE OR REPLACE FUNCTION update_marketing_analytics()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Track email opens
    IF NEW.status = 'opened' AND OLD.status != 'opened' THEN
      INSERT INTO public.marketing_analytics (date, emails_opened, country, category)
      SELECT CURRENT_DATE, 1, p.country, p.category
      FROM public.marketing_prospects p
      WHERE p.id = NEW.prospect_id
      ON CONFLICT (date, country, category) DO UPDATE
      SET emails_opened = marketing_analytics.emails_opened + 1;
    END IF;
    
    -- Track replies
    IF NEW.status = 'replied' AND OLD.status != 'replied' THEN
      INSERT INTO public.marketing_analytics (date, emails_replied, country, category)
      SELECT CURRENT_DATE, 1, p.country, p.category
      FROM public.marketing_prospects p
      WHERE p.id = NEW.prospect_id
      ON CONFLICT (date, country, category) DO UPDATE
      SET emails_replied = marketing_analytics.emails_replied + 1;
    END IF;
  ELSIF TG_OP = 'INSERT' AND NEW.status = 'sent' THEN
    -- Track sent emails
    INSERT INTO public.marketing_analytics (date, emails_sent, country, category)
    SELECT CURRENT_DATE, 1, p.country, p.category
    FROM public.marketing_prospects p
    WHERE p.id = NEW.prospect_id
    ON CONFLICT (date, country, category) DO UPDATE
    SET emails_sent = marketing_analytics.emails_sent + 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER marketing_analytics_trigger
AFTER INSERT OR UPDATE ON public.marketing_outreach
FOR EACH ROW EXECUTE FUNCTION update_marketing_analytics();

-- Insert default templates
INSERT INTO public.marketing_templates (name, subject_template, body_template, language, category, variables, ai_prompt) VALUES
(
  'EventNexus Partnership - English',
  'Partnership Opportunity with EventNexus 🎯',
  'Hi {contactName},

I hope this message finds you well!

My name is {senderName} from EventNexus, Estonia''s fastest-growing event discovery and ticketing platform. We''ve been following {companyName}''s incredible work in {category}, and I''m impressed by your commitment to delivering exceptional experiences.

**Why EventNexus?**
• **50,000+ active event-goers** discovering events daily
• **AI-powered promotion** in 50+ languages
• **Zero upfront costs** - only 2.5% per ticket sold
• **Smart ticketing** with QR codes and fraud prevention
• **Real-time analytics** and audience insights

We''re specifically reaching out to {category} professionals like yourself because we believe EventNexus can help you:
✓ Reach new audiences across the Baltics and beyond
✓ Reduce operational overhead with automated ticketing
✓ Gain valuable data-driven insights

Would you be open to a 15-minute call next week to explore how EventNexus could support {companyName}''s growth?

Looking forward to connecting!

Best regards,
{senderName}
EventNexus Platform
www.eventnexus.eu',
  'en',
  'Corporate Events',
  '["contactName", "companyName", "category", "senderName"]',
  'Generate a personalized B2B partnership email for an event organizer. Tone: professional, enthusiastic, value-focused. Highlight EventNexus platform benefits tailored to their category.'
),
(
  'EventNexus Partnership - Estonian',
  'Koostöövõimalus EventNexusega 🎯',
  'Tere {contactName},

Loodan, et kiri leiab Teid heas tujus!

Minu nimi on {senderName} EventNexusest, Eesti kiireimini kasvavast ürituste avastamise ja piletimüügi platvormist. Oleme jälginud {companyName} suurepärast tööd {category} valdkonnas ja olen muljet avaldanud Teie pühendumisest erakordse kogemuse pakkumisel.

**Miks EventNexus?**
• **50 000+ aktiivset üritusekülastajat** kes avastavad üritusi iga päev
• **AI-põhine turundus** 50+ keeles
• **Null ettemaksu** - ainult 2,5% müüdud piletilt
• **Nutikas piletisüsteem** QR-koodide ja pettusekaitsega
• **Reaalajas analüütika** ja publikuinsaidid

Võtame spetsiaalselt ühendust {category} professionaalidega nagu Teie, sest usume, et EventNexus saab aidata Teil:
✓ Jõuda uute publikuni üle Baltimaade ja kaugemal
✓ Vähendada operatiivkulusid automatiseeritud piletimüügiga
✓ Saada väärtuslikke andmepõhiseid teadmisi

Kas oleksite valmis järgmisel nädalal 15-minutiliseks vestluseks, et uurida, kuidas EventNexus saaks toetada {companyName} kasvu?

Ootan Teie vastust!

Lugupidamisega,
{senderName}
EventNexus Platvorm
www.eventnexus.eu',
  'et',
  'Corporate Events',
  '["contactName", "companyName", "category", "senderName"]',
  'Genereeri personaliseeritud B2B partnerluse e-kiri ürituste korraldajale. Toon: professionaalne, entusiastlik, väärtuskeskne. Rõhuta EventNexuse platvormi eeliseid, mis sobivad nende kategooriaga.'
);

COMMENT ON TABLE public.marketing_prospects IS 'B2B prospects for outreach campaigns';
COMMENT ON TABLE public.marketing_outreach IS 'Email outreach records with AI-generated content';
COMMENT ON TABLE public.marketing_templates IS 'Reusable email templates for campaigns';
COMMENT ON TABLE public.marketing_analytics IS 'Daily aggregated marketing performance metrics';
