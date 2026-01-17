-- Communication Preferences & Regional Settings
-- AI needs to know: language, communication method, timezone, regional context

-- 1. Add communication preferences to prospects
ALTER TABLE public.marketing_prospects 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Tallinn',
ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'phone', 'both', 'email_only')),
ADD COLUMN IF NOT EXISTS call_availability TEXT, -- e.g., "Mon-Fri 9-17 EET"
ADD COLUMN IF NOT EXISTS region TEXT; -- 'Europe', 'North America', 'Asia', etc.

COMMENT ON COLUMN public.marketing_prospects.preferred_contact_method IS 
'email_only = never call, email = prefer email, phone = prefer calls, both = either OK';

-- 2. Admin language capabilities & preferences
INSERT INTO public.template_variables (variable_name, variable_value, variable_type, description, category) VALUES
('admin_languages_fluent', 'et,en', 'text', 'Languages admin can speak fluently (comma-separated)', 'personal'),
('admin_languages_written', 'et,en,fi,sv,lv,lt,no,da,de', 'text', 'Languages admin can write (comma-separated)', 'personal'),
('admin_call_languages', 'et,en', 'text', 'Languages admin accepts calls in', 'personal'),
('admin_timezone', 'Europe/Tallinn', 'text', 'Admin timezone', 'personal'),
('admin_call_hours', 'Mon-Fri 9:00-17:00 EET', 'text', 'Admin available for calls', 'personal')
ON CONFLICT (variable_name) DO UPDATE SET
  variable_value = EXCLUDED.variable_value,
  updated_at = NOW();

-- 3. Language routing rules
CREATE TABLE IF NOT EXISTS public.ai_language_routing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code TEXT NOT NULL UNIQUE, -- 'et', 'en', 'fi', etc.
  language_name TEXT NOT NULL,
  region TEXT, -- 'Europe', 'North America', etc.
  admin_can_call BOOLEAN DEFAULT false, -- Can admin handle calls in this language?
  admin_can_write BOOLEAN DEFAULT false, -- Can admin write emails in this language?
  ai_quality TEXT CHECK (ai_quality IN ('native', 'fluent', 'good', 'basic')), -- AI translation quality
  requires_human_review BOOLEAN DEFAULT false, -- Should emails be reviewed before sending?
  default_contact_method TEXT DEFAULT 'email', -- 'email', 'email_only', 'phone'
  timezone_hint TEXT, -- Common timezone for this language
  cultural_notes TEXT, -- E.g., "Formal titles important", "Direct communication OK"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Insert language routing rules
INSERT INTO public.ai_language_routing (language_code, language_name, region, admin_can_call, admin_can_write, ai_quality, default_contact_method, timezone_hint, cultural_notes) VALUES
('et', 'Estonian', 'Europe', true, true, 'native', 'both', 'Europe/Tallinn', 'Direct communication. First names common in business.'),
('en', 'English', 'Global', true, true, 'native', 'both', 'UTC', 'Standard international business language.'),
('fi', 'Finnish', 'Europe', false, true, 'fluent', 'email', 'Europe/Helsinki', 'Formal initial contact. First names after rapport.'),
('sv', 'Swedish', 'Europe', false, true, 'fluent', 'email', 'Europe/Stockholm', 'Professional but friendly.'),
('lv', 'Latvian', 'Europe', false, true, 'fluent', 'email', 'Europe/Riga', 'Similar culture to Estonian.'),
('lt', 'Lithuanian', 'Europe', false, true, 'fluent', 'email', 'Europe/Vilnius', 'Formal business communication preferred.'),
('no', 'Norwegian', 'Europe', false, true, 'good', 'email', 'Europe/Oslo', 'Direct and egalitarian culture.'),
('da', 'Danish', 'Europe', false, true, 'good', 'email', 'Europe/Copenhagen', 'Informal and direct communication.'),
('de', 'German', 'Europe', false, true, 'good', 'email', 'Europe/Berlin', 'Formal titles important. Use "Sie" form.'),
('fr', 'French', 'Europe', false, false, 'good', 'email_only', 'Europe/Paris', 'Formal. Use "vous". Requires human review.'),
('es', 'Spanish', 'Global', false, false, 'good', 'email_only', 'Europe/Madrid', 'Formal business communication. Requires review.'),
('pl', 'Polish', 'Europe', false, false, 'good', 'email_only', 'Europe/Warsaw', 'Formal. Requires human review.'),
('ru', 'Russian', 'Europe', false, false, 'basic', 'email_only', 'Europe/Moscow', 'Very formal. Must be reviewed by native speaker.');

-- 5. Regional smart filters
CREATE TABLE IF NOT EXISTS public.ai_regional_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_code TEXT NOT NULL UNIQUE, -- 'EU', 'NA', 'APAC', etc.
  region_name TEXT NOT NULL,
  countries TEXT[], -- Array of country codes
  typical_languages TEXT[], -- Most common languages
  business_hours_start TIME DEFAULT '09:00:00',
  business_hours_end TIME DEFAULT '17:00:00',
  typical_timezones TEXT[],
  cultural_context TEXT,
  gdpr_applies BOOLEAN DEFAULT false,
  preferred_contact_day TEXT DEFAULT 'weekday', -- 'weekday', 'any', 'avoid_monday', etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Insert regional settings
INSERT INTO public.ai_regional_settings (region_code, region_name, countries, typical_languages, typical_timezones, cultural_context, gdpr_applies) VALUES
('EU', 'European Union', ARRAY['EE','FI','LV','LT','SE','NO','DK','DE','FR','ES','PL'], ARRAY['en','et','fi','lv','lt','sv','no','da','de','fr','es','pl'], ARRAY['Europe/Tallinn','Europe/Helsinki','Europe/Stockholm'], 'GDPR compliant. Professional communication. Work-life balance valued.', true),
('NA', 'North America', ARRAY['US','CA'], ARRAY['en','fr'], ARRAY['America/New_York','America/Los_Angeles','America/Toronto'], 'Direct communication. Fast-paced business culture. Phone calls common.', false),
('UK', 'United Kingdom', ARRAY['GB'], ARRAY['en'], ARRAY['Europe/London'], 'Polite and indirect communication. GDPR applies.', true),
('NORDICS', 'Nordic Countries', ARRAY['SE','NO','DK','FI','IS'], ARRAY['sv','no','da','fi','en'], ARRAY['Europe/Stockholm','Europe/Oslo','Europe/Copenhagen'], 'Flat hierarchies. Informal after first contact. Email preferred.', true),
('BALTICS', 'Baltic States', ARRAY['EE','LV','LT'], ARRAY['et','lv','lt','en','ru'], ARRAY['Europe/Tallinn','Europe/Riga','Europe/Vilnius'], 'Direct communication. Growing tech scene. English widely spoken.', true);

-- 7. Create smart filter function
CREATE OR REPLACE FUNCTION public.get_communication_strategy(
  prospect_country TEXT,
  prospect_language TEXT
) RETURNS JSONB AS $$
DECLARE
  routing_rule ai_language_routing%ROWTYPE;
  admin_can_call_langs TEXT;
  result JSONB;
BEGIN
  -- Get language routing rule
  SELECT * INTO routing_rule 
  FROM public.ai_language_routing 
  WHERE language_code = prospect_language;

  -- Get admin call languages
  SELECT variable_value INTO admin_can_call_langs
  FROM public.template_variables
  WHERE variable_name = 'admin_call_languages';

  -- Build strategy
  result := jsonb_build_object(
    'language', prospect_language,
    'can_call', routing_rule.admin_can_call,
    'can_write', routing_rule.admin_can_write,
    'recommended_method', 
      CASE 
        WHEN routing_rule.admin_can_call THEN 'both'
        WHEN routing_rule.admin_can_write THEN 'email'
        ELSE 'email_only'
      END,
    'ai_quality', routing_rule.ai_quality,
    'requires_review', routing_rule.requires_human_review,
    'timezone_hint', routing_rule.timezone_hint,
    'cultural_notes', routing_rule.cultural_notes
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 8. Add indexes for filtering
CREATE INDEX IF NOT EXISTS idx_prospects_language ON public.marketing_prospects(language);
CREATE INDEX IF NOT EXISTS idx_prospects_country ON public.marketing_prospects(country);
CREATE INDEX IF NOT EXISTS idx_prospects_contact_method ON public.marketing_prospects(preferred_contact_method);
CREATE INDEX IF NOT EXISTS idx_prospects_region ON public.marketing_prospects(region);

COMMENT ON TABLE public.ai_language_routing IS 'AI agent language capabilities and routing rules';
COMMENT ON TABLE public.ai_regional_settings IS 'Regional business culture and communication preferences';
COMMENT ON FUNCTION public.get_communication_strategy IS 'Returns optimal communication strategy for a prospect based on language/region';
