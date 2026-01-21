-- Ticket and Event Display Templates System
-- Allows tier-based customization of ticket appearance and event map markers

-- =============================================================================
-- DROP EXISTING TABLES (clean slate for new structure)
-- =============================================================================
DROP TABLE IF EXISTS public.event_template_selections CASCADE;
DROP TABLE IF EXISTS public.user_purchased_templates CASCADE;
DROP TABLE IF EXISTS public.event_marker_templates CASCADE;
DROP TABLE IF EXISTS public.ticket_templates CASCADE;

-- =============================================================================
-- TICKET TEMPLATES TABLE
-- =============================================================================
CREATE TABLE public.ticket_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_name JSONB NOT NULL DEFAULT '{"en": "", "et": "", "ru": ""}',
  description JSONB NOT NULL DEFAULT '{"en": "", "et": "", "ru": ""}',
  
  -- Visual properties
  template_type TEXT NOT NULL DEFAULT 'standard', -- standard, premium, vip, luxury
  border_style TEXT NOT NULL DEFAULT 'none', -- none, silver, gold, gradient, animated
  border_color TEXT, -- hex color for custom borders
  background_style TEXT NOT NULL DEFAULT 'solid', -- solid, gradient, pattern, image
  background_colors JSONB, -- array of colors for gradients: ["#FF0000", "#00FF00"]
  background_pattern TEXT, -- pattern name: dots, lines, waves, geometric
  background_image_url TEXT, -- custom background image URL
  text_color TEXT DEFAULT '#000000',
  accent_color TEXT DEFAULT '#6366f1',
  
  -- Advanced styling
  font_family TEXT DEFAULT 'Inter',
  corner_radius INTEGER DEFAULT 8, -- border radius in pixels
  shadow_effect TEXT DEFAULT 'medium', -- none, light, medium, heavy, glow
  overlay_effect TEXT, -- shine, holographic, watermark
  qr_code_style TEXT DEFAULT 'standard', -- standard, rounded, dotted, custom
  
  -- Tier access control
  required_tier TEXT NOT NULL DEFAULT 'free', -- free, pro, premium, enterprise
  is_premium BOOLEAN DEFAULT FALSE, -- if true, can be purchased with credits
  credit_price INTEGER DEFAULT 0, -- price in platform credits
  
  -- Metadata
  preview_image_url TEXT, -- preview image for template selector
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_ticket_templates_tier ON public.ticket_templates(required_tier) WHERE is_active = TRUE;
CREATE INDEX idx_ticket_templates_premium ON public.ticket_templates(is_premium) WHERE is_active = TRUE AND is_premium = TRUE;

-- =============================================================================
-- EVENT MAP MARKER TEMPLATES TABLE
-- =============================================================================
CREATE TABLE public.event_marker_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_name JSONB NOT NULL DEFAULT '{"en": "", "et": "", "ru": ""}',
  description JSONB NOT NULL DEFAULT '{"en": "", "et": "", "ru": ""}',
  
  -- Visual properties
  marker_style TEXT NOT NULL DEFAULT 'standard', -- standard, pin, circle, custom
  marker_color TEXT DEFAULT '#6366f1',
  marker_icon TEXT, -- lucide icon name or custom icon URL
  marker_size TEXT DEFAULT 'medium', -- small, medium, large, xl
  
  -- Animation effects
  pulse_effect BOOLEAN DEFAULT FALSE,
  glow_effect BOOLEAN DEFAULT FALSE,
  bounce_on_hover BOOLEAN DEFAULT TRUE,
  
  -- Advanced styling
  border_width INTEGER DEFAULT 2,
  border_color TEXT DEFAULT '#FFFFFF',
  shadow_style TEXT DEFAULT 'medium', -- none, light, medium, heavy
  icon_color TEXT DEFAULT '#FFFFFF',
  
  -- Tier access control
  required_tier TEXT NOT NULL DEFAULT 'free',
  is_premium BOOLEAN DEFAULT FALSE,
  credit_price INTEGER DEFAULT 0,
  
  -- Metadata
  preview_image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_event_marker_templates_tier ON public.event_marker_templates(required_tier) WHERE is_active = TRUE;

-- =============================================================================
-- USER PURCHASED TEMPLATES (for premium templates bought with credits)
-- =============================================================================
CREATE TABLE public.user_purchased_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL, -- 'ticket' or 'marker'
  template_id UUID NOT NULL, -- references ticket_templates.id or event_marker_templates.id
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  credits_spent INTEGER NOT NULL,
  
  UNIQUE(user_id, template_type, template_id)
);

CREATE INDEX idx_user_purchased_templates_user ON public.user_purchased_templates(user_id);

-- =============================================================================
-- EVENT TEMPLATE SELECTIONS (tracks which templates an event uses)
-- =============================================================================
CREATE TABLE public.event_template_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  
  -- Ticket template selections (can be different per ticket type)
  standard_ticket_template_id UUID REFERENCES public.ticket_templates(id),
  vip_ticket_template_id UUID REFERENCES public.ticket_templates(id),
  early_bird_ticket_template_id UUID REFERENCES public.ticket_templates(id),
  
  -- Map marker template
  marker_template_id UUID REFERENCES public.event_marker_templates(id),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(event_id)
);

CREATE INDEX idx_event_template_selections_event ON public.event_template_selections(event_id);

-- =============================================================================
-- INSERT DEFAULT TEMPLATES
-- =============================================================================

-- Free Tier Ticket Templates
INSERT INTO public.ticket_templates (name, display_name, description, template_type, required_tier, sort_order) VALUES
('basic-white', '{"en": "Basic White", "et": "Tavaline Valge", "ru": "Базовый Белый"}', 
 '{"en": "Simple white ticket with black text", "et": "Lihtne valge pilet musta tekstiga", "ru": "Простой белый билет с черным текстом"}',
 'standard', 'free', 1),

('basic-gray', '{"en": "Basic Gray", "et": "Tavaline Hall", "ru": "Базовый Серый"}',
 '{"en": "Professional gray ticket", "et": "Professionaalne hall pilet", "ru": "Профессиональный серый билет"}',
 'standard', 'free', 2);

-- Pro Tier Ticket Templates (Create up to 20 events/month)
INSERT INTO public.ticket_templates (name, display_name, description, template_type, border_style, border_color, background_style, background_colors, required_tier, sort_order) VALUES
('silver-border', '{"en": "Silver Border", "et": "Hõbedane Ääris", "ru": "Серебряная Рамка"}',
 '{"en": "Elegant silver bordered ticket", "et": "Elegantne hõbedase äärisega pilet", "ru": "Элегантный билет с серебряной рамкой"}',
 'premium', 'silver', '#C0C0C0', 'gradient', '["#FFFFFF", "#F5F5F5"]', 'pro', 3),

('gradient-modern', '{"en": "Modern Gradient", "et": "Kaasaegne Gradient", "ru": "Современный Градиент"}',
 '{"en": "Contemporary gradient design", "et": "Kaasaegne gradiendi disain", "ru": "Современный градиентный дизайн"}',
 'premium', 'gradient', NULL, 'gradient', '["#667eea", "#764ba2"]', 'pro', 4);

-- Premium Tier Ticket Templates (Up to 100 events/month)
INSERT INTO public.ticket_templates (name, display_name, description, template_type, border_style, border_color, background_style, background_colors, shadow_effect, required_tier, sort_order) VALUES
('gold-vip', '{"en": "Gold VIP", "et": "Kuldne VIP", "ru": "Золотой VIP"}',
 '{"en": "Luxurious gold ticket for VIP guests", "et": "Luksuslik kuldne pilet VIP külalistele", "ru": "Роскошный золотой билет для VIP гостей"}',
 'vip', 'gold', '#FFD700', 'gradient', '["#FFF8DC", "#FFE4B5"]', 'heavy', 'premium', 5);

-- Enterprise Tier Ticket Templates (Unlimited events, white-label)
INSERT INTO public.ticket_templates (name, display_name, description, template_type, border_style, background_style, background_pattern, overlay_effect, shadow_effect, required_tier, sort_order) VALUES
('holographic', '{"en": "Holographic", "et": "Holograafiline", "ru": "Голографический"}',
 '{"en": "Premium holographic effect ticket", "et": "Premium holograafilise efektiga pilet", "ru": "Премиальный билет с голографическим эффектом"}',
 'luxury', 'animated', 'pattern', 'geometric', 'holographic', 'glow', 'enterprise', 6),

('royal-purple', '{"en": "Royal Purple", "et": "Kuninglik Lilla", "ru": "Королевский Пурпурный"}',
 '{"en": "Majestic purple with gold accents", "et": "Majesteetlik lilla kuldse aktsendiga", "ru": "Величественный пурпурный с золотыми акцентами"}',
 'luxury', 'gold', 'gradient', 'waves', 'shine', 'heavy', 'enterprise', 7);

-- Free Tier Map Markers
INSERT INTO public.event_marker_templates (name, display_name, description, marker_style, marker_color, marker_icon, required_tier, sort_order) VALUES
('standard-pin', '{"en": "Standard Pin", "et": "Tavaline Nööpnõel", "ru": "Стандартная Булавка"}',
 '{"en": "Default map pin marker", "et": "Vaikimisi kaardi marker", "ru": "Маркер карты по умолчанию"}',
 'pin', '#6366f1', 'MapPin', 'free', 1);

-- Pro Tier Map Markers
INSERT INTO public.event_marker_templates (name, display_name, description, marker_style, marker_color, marker_icon, pulse_effect, required_tier, sort_order) VALUES
('pulse-circle', '{"en": "Pulse Circle", "et": "Pulseeriv Ring", "ru": "Пульсирующий Круг"}',
 '{"en": "Circular marker with pulse effect", "et": "Ümmargune marker pulssefektiga", "ru": "Круглый маркер с эффектом пульсации"}',
 'circle', '#10b981', 'Zap', TRUE, 'pro', 2);

-- Premium Tier Map Markers
INSERT INTO public.event_marker_templates (name, display_name, description, marker_style, marker_color, marker_icon, glow_effect, marker_size, required_tier, sort_order) VALUES
('glow-star', '{"en": "Glowing Star", "et": "Helendav Täht", "ru": "Светящаяся Звезда"}',
 '{"en": "Star marker with glow effect", "et": "Tähe kujuline marker helendusega", "ru": "Звездный маркер со свечением"}',
 'custom', '#f59e0b', 'Star', TRUE, 'large', 'premium', 3);

-- Enterprise Tier Map Markers
INSERT INTO public.event_marker_templates (name, display_name, description, marker_style, marker_color, marker_icon, pulse_effect, glow_effect, marker_size, required_tier, sort_order) VALUES
('premium-crown', '{"en": "Premium Crown", "et": "Premium Kroon", "ru": "Премиум Корона"}',
 '{"en": "Crown marker for exclusive events", "et": "Krooni kujuline marker eksklusiivsetele üritustele", "ru": "Маркер-корона для эксклюзивных событий"}',
 'custom', '#FFD700', 'Crown', TRUE, TRUE, 'xl', 'enterprise', 4);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.ticket_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_marker_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_purchased_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_template_selections ENABLE ROW LEVEL SECURITY;

-- Everyone can read active templates
CREATE POLICY "Anyone can view active ticket templates"
  ON public.ticket_templates FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Anyone can view active marker templates"
  ON public.event_marker_templates FOR SELECT
  USING (is_active = TRUE);

-- Users can view their purchased templates
CREATE POLICY "Users can view their purchased templates"
  ON public.user_purchased_templates FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert purchased templates (via Edge Function)
CREATE POLICY "Users can purchase templates"
  ON public.user_purchased_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Event organizers can view/update their event template selections
CREATE POLICY "Organizers can manage event template selections"
  ON public.event_template_selections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_template_selections.event_id
      AND events.organizer_id = auth.uid()
    )
  );

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to check if user has access to a template (tier or purchased)
CREATE OR REPLACE FUNCTION public.user_has_template_access(
  p_user_id UUID,
  p_template_type TEXT, -- 'ticket' or 'marker'
  p_template_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_required_tier TEXT;
  v_user_tier TEXT;
  v_is_premium BOOLEAN;
  v_tier_order INTEGER;
  v_user_tier_order INTEGER;
BEGIN
  -- Get user's tier
  SELECT subscription_tier INTO v_user_tier
  FROM public.users
  WHERE id = p_user_id;
  
  v_user_tier := COALESCE(v_user_tier, 'free');
  
  -- Get template requirements
  IF p_template_type = 'ticket' THEN
    SELECT required_tier, is_premium INTO v_required_tier, v_is_premium
    FROM public.ticket_templates
    WHERE id = p_template_id;
  ELSE
    SELECT required_tier, is_premium INTO v_required_tier, v_is_premium
    FROM public.event_marker_templates
    WHERE id = p_template_id;
  END IF;
  
  -- Check if template was purchased
  IF v_is_premium THEN
    IF EXISTS (
      SELECT 1 FROM public.user_purchased_templates
      WHERE user_id = p_user_id
      AND template_type = p_template_type
      AND template_id = p_template_id
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  -- Check tier access
  v_tier_order := CASE v_required_tier
    WHEN 'free' THEN 0
    WHEN 'pro' THEN 1
    WHEN 'premium' THEN 2
    WHEN 'enterprise' THEN 3
    ELSE 0
  END;
  
  v_user_tier_order := CASE v_user_tier
    WHEN 'free' THEN 0
    WHEN 'pro' THEN 1
    WHEN 'premium' THEN 2
    WHEN 'enterprise' THEN 3
    ELSE 0
  END;
  
  RETURN v_user_tier_order >= v_tier_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get available templates for a user
CREATE OR REPLACE FUNCTION public.get_user_available_templates(
  p_user_id UUID,
  p_template_type TEXT -- 'ticket' or 'marker'
) RETURNS TABLE (
  template_id UUID,
  name TEXT,
  display_name JSONB,
  description JSONB,
  preview_image_url TEXT,
  required_tier TEXT,
  is_premium BOOLEAN,
  credit_price INTEGER,
  has_access BOOLEAN,
  is_purchased BOOLEAN
) AS $$
BEGIN
  IF p_template_type = 'ticket' THEN
    RETURN QUERY
    SELECT 
      t.id,
      t.name,
      t.display_name,
      t.description,
      t.preview_image_url,
      t.required_tier,
      t.is_premium,
      t.credit_price,
      public.user_has_template_access(p_user_id, 'ticket', t.id) AS has_access,
      EXISTS (
        SELECT 1 FROM public.user_purchased_templates upt
        WHERE upt.user_id = p_user_id
        AND upt.template_type = 'ticket'
        AND upt.template_id = t.id
      ) AS is_purchased
    FROM public.ticket_templates t
    WHERE t.is_active = TRUE
    ORDER BY t.sort_order, t.name;
  ELSE
    RETURN QUERY
    SELECT 
      m.id,
      m.name,
      m.display_name,
      m.description,
      m.preview_image_url,
      m.required_tier,
      m.is_premium,
      m.credit_price,
      public.user_has_template_access(p_user_id, 'marker', m.id) AS has_access,
      EXISTS (
        SELECT 1 FROM public.user_purchased_templates upt
        WHERE upt.user_id = p_user_id
        AND upt.template_type = 'marker'
        AND upt.template_id = m.id
      ) AS is_purchased
    FROM public.event_marker_templates m
    WHERE m.is_active = TRUE
    ORDER BY m.sort_order, m.name;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.ticket_templates IS 'Ticket visual templates with tier-based access';
COMMENT ON TABLE public.event_marker_templates IS 'Event map marker templates with tier-based access';
COMMENT ON TABLE public.user_purchased_templates IS 'Premium templates purchased by users with credits';
COMMENT ON TABLE public.event_template_selections IS 'Template selections for each event';
