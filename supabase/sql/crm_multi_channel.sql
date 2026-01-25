-- =====================================================================
-- CRM INTERACTIONS & MULTI-CHANNEL TRACKING
-- Tracks all interactions with B2B prospects across channels
-- =====================================================================

-- Ensure pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CRM Interactions Table (standalone, no foreign key constraints initially)
CREATE TABLE IF NOT EXISTS crm_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN (
    'email_sent',
    'email_reply',
    'email_reply_unknown',
    'email_opened',
    'email_clicked',
    'phone_call',
    'whatsapp_message',
    'meeting_scheduled',
    'meeting_completed',
    'demo_requested',
    'demo_completed',
    'proposal_sent',
    'contract_sent',
    'contract_signed',
    'note_added',
    'status_changed'
  )),
  channel TEXT CHECK (channel IN ('email', 'phone', 'whatsapp', 'in_person', 'video_call', 'other')),
  subject TEXT,
  content TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'question', 'auto_reply')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

-- Add foreign key constraints if parent tables exist
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'marketing_prospects') THEN
    ALTER TABLE crm_interactions
    DROP CONSTRAINT IF EXISTS crm_interactions_prospect_id_fkey,
    ADD CONSTRAINT crm_interactions_prospect_id_fkey 
      FOREIGN KEY (prospect_id) REFERENCES marketing_prospects(id) ON DELETE CASCADE;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    ALTER TABLE crm_interactions
    DROP CONSTRAINT IF EXISTS crm_interactions_created_by_fkey,
    ADD CONSTRAINT crm_interactions_created_by_fkey 
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_interactions_prospect_id ON crm_interactions(prospect_id);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_type ON crm_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_channel ON crm_interactions(channel);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_sentiment ON crm_interactions(sentiment);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_created_at ON crm_interactions(created_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_crm_interactions_prospect_date ON crm_interactions(prospect_id, created_at DESC);

-- =====================================================================
-- PHONE CALLS & WHATSAPP TRACKING
-- =====================================================================

-- Add phone call tracking columns to marketing_prospects (only if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'marketing_prospects') THEN
    -- Add columns without constraints first
    ALTER TABLE marketing_prospects
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT,
    ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT,
    ADD COLUMN IF NOT EXISTS call_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_call_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS whatsapp_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_whatsapp_at TIMESTAMP WITH TIME ZONE;
    
    -- Add constraint only if column exists and doesn't have constraint
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.constraint_column_usage 
      WHERE table_name = 'marketing_prospects' AND column_name = 'preferred_contact_method'
    ) THEN
      ALTER TABLE marketing_prospects
      ADD CONSTRAINT marketing_prospects_preferred_contact_method_check 
      CHECK (preferred_contact_method IN ('email', 'phone', 'whatsapp', 'any'));
    END IF;
  END IF;
END $$;

-- Update marketing_outreach to support multi-channel (dynamic schema detection)
DO $$ 
DECLARE
  mo_schema text;
  channel_exists boolean;
  call_outcome_exists boolean;
BEGIN
  -- Find schema where marketing_outreach exists (prefer public)
  SELECT table_schema INTO mo_schema
  FROM information_schema.tables 
  WHERE table_name = 'marketing_outreach'
  ORDER BY (table_schema = 'public') DESC
  LIMIT 1;
  
  IF mo_schema IS NOT NULL THEN
    RAISE NOTICE 'Found marketing_outreach in schema: %', mo_schema;
    
    -- Try to add columns using format() for SQL injection safety
    BEGIN
      EXECUTE format('ALTER TABLE %I.marketing_outreach ADD COLUMN IF NOT EXISTS channel TEXT', mo_schema);
      EXECUTE format('ALTER TABLE %I.marketing_outreach ADD COLUMN IF NOT EXISTS call_duration_seconds INT', mo_schema);
      EXECUTE format('ALTER TABLE %I.marketing_outreach ADD COLUMN IF NOT EXISTS call_outcome TEXT', mo_schema);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not add columns to marketing_outreach: %', SQLERRM;
    END;
    
    -- Check if channel column now exists
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = mo_schema 
        AND table_name = 'marketing_outreach' 
        AND column_name = 'channel'
    ) INTO channel_exists;
    
    -- Add channel constraint and default only if column exists
    IF channel_exists THEN
      BEGIN
        -- Check if constraint already exists
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          JOIN information_schema.constraint_column_usage ccu 
            ON tc.constraint_name = ccu.constraint_name
          WHERE tc.table_schema = mo_schema
            AND tc.table_name = 'marketing_outreach'
            AND ccu.column_name = 'channel'
            AND tc.constraint_type = 'CHECK'
        ) THEN
          EXECUTE format(
            'ALTER TABLE %I.marketing_outreach ADD CONSTRAINT marketing_outreach_channel_check CHECK (channel IN (''email'',''phone'',''whatsapp'',''other''))',
            mo_schema
          );
        END IF;
        
        -- Set default value
        EXECUTE format('ALTER TABLE %I.marketing_outreach ALTER COLUMN channel SET DEFAULT ''email''', mo_schema);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not update channel column: %', SQLERRM;
      END;
    END IF;
    
    -- Check if call_outcome column exists
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = mo_schema 
        AND table_name = 'marketing_outreach' 
        AND column_name = 'call_outcome'
    ) INTO call_outcome_exists;
    
    -- Add call_outcome constraint only if column exists
    IF call_outcome_exists THEN
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          JOIN information_schema.constraint_column_usage ccu 
            ON tc.constraint_name = ccu.constraint_name
          WHERE tc.table_schema = mo_schema
            AND tc.table_name = 'marketing_outreach'
            AND ccu.column_name = 'call_outcome'
            AND tc.constraint_type = 'CHECK'
        ) THEN
          EXECUTE format(
            'ALTER TABLE %I.marketing_outreach ADD CONSTRAINT marketing_outreach_call_outcome_check CHECK (call_outcome IN (''answered'',''voicemail'',''no_answer'',''busy'',''invalid_number''))',
            mo_schema
          );
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not add call_outcome constraint: %', SQLERRM;
      END;
    END IF;
  ELSE
    RAISE NOTICE 'marketing_outreach table not found in any schema';
  END IF;
END $$;

-- =====================================================================
-- ANALYTICS - Add multi-channel metrics
-- =====================================================================

-- Add columns to marketing_analytics (only if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'marketing_analytics') THEN
    ALTER TABLE marketing_analytics
    ADD COLUMN IF NOT EXISTS phone_calls_made INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS phone_calls_answered INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS whatsapp_messages_sent INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS whatsapp_messages_replied INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS responses_received INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS positive_responses INT DEFAULT 0;
  END IF;
END $$;

-- =====================================================================
-- FUNCTIONS FOR CRM AUTOMATION
-- =====================================================================

-- Function to log interaction and auto-update prospect stats
CREATE OR REPLACE FUNCTION log_crm_interaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Update prospect based on interaction type
  IF NEW.interaction_type = 'email_reply' AND NEW.prospect_id IS NOT NULL THEN
    UPDATE marketing_prospects
    SET 
      last_contacted_at = NEW.created_at,
      contact_count = contact_count + 1
    WHERE id = NEW.prospect_id;
  END IF;

  IF NEW.interaction_type = 'phone_call' AND NEW.prospect_id IS NOT NULL THEN
    UPDATE marketing_prospects
    SET 
      call_count = call_count + 1,
      last_call_at = NEW.created_at,
      last_contacted_at = NEW.created_at
    WHERE id = NEW.prospect_id;
  END IF;

  IF NEW.interaction_type = 'whatsapp_message' AND NEW.prospect_id IS NOT NULL THEN
    UPDATE marketing_prospects
    SET 
      whatsapp_count = whatsapp_count + 1,
      last_whatsapp_at = NEW.created_at,
      last_contacted_at = NEW.created_at
    WHERE id = NEW.prospect_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update prospect stats on interaction
DROP TRIGGER IF EXISTS trigger_log_crm_interaction ON crm_interactions;
CREATE TRIGGER trigger_log_crm_interaction
AFTER INSERT ON crm_interactions
FOR EACH ROW
EXECUTE FUNCTION log_crm_interaction();

-- =====================================================================
-- RLS POLICIES (Admin only for now)
-- =====================================================================

ALTER TABLE crm_interactions ENABLE ROW LEVEL SECURITY;

-- Admin can do everything (with proper WITH CHECK clause)
DO $$
BEGIN
  -- Drop policy if exists to avoid conflicts
  DROP POLICY IF EXISTS "Admins can manage CRM interactions" ON crm_interactions;
  
  -- Create policy only if users table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    EXECUTE '
      CREATE POLICY "Admins can manage CRM interactions"
      ON crm_interactions
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid()
          AND u.role = ''admin''
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid()
          AND u.role = ''admin''
        )
      )
    ';
  ELSE
    RAISE NOTICE 'users table not found - skipping RLS policy creation';
  END IF;
END $$;

-- =====================================================================
-- HELPER VIEWS
-- =====================================================================

-- View: Recent prospect interactions with full context (only if marketing_prospects exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'marketing_prospects') THEN
    EXECUTE '
      CREATE OR REPLACE VIEW recent_prospect_interactions AS
      SELECT 
        ci.id,
        ci.prospect_id,
        mp.name AS prospect_name,
        mp.email AS prospect_email,
        mp.country,
        mp.category,
        mp.status AS prospect_status,
        ci.interaction_type,
        ci.channel,
        ci.subject,
        ci.content,
        ci.sentiment,
        ci.metadata,
        ci.created_at,
        ci.created_by
      FROM crm_interactions ci
      LEFT JOIN marketing_prospects mp ON ci.prospect_id = mp.id
      ORDER BY ci.created_at DESC
    ';
  END IF;
END $$;

-- View: Prospect activity summary (only if marketing_prospects exists with required columns)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables WHERE table_name = 'marketing_prospects'
  ) AND EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'marketing_prospects' AND column_name = 'call_count'
  ) THEN
    EXECUTE '
      CREATE OR REPLACE VIEW prospect_activity_summary AS
      SELECT 
        mp.id,
        mp.name,
        mp.email,
        mp.country,
        mp.category,
        mp.status,
        mp.contact_count,
        mp.call_count,
        mp.whatsapp_count,
        mp.preferred_contact_method,
        mp.last_contacted_at,
        COUNT(ci.id) AS total_interactions,
        COUNT(ci.id) FILTER (WHERE ci.interaction_type = ''email_sent'') AS emails_sent,
        COUNT(ci.id) FILTER (WHERE ci.interaction_type = ''email_reply'') AS emails_received,
        COUNT(ci.id) FILTER (WHERE ci.interaction_type = ''phone_call'') AS phone_calls,
        COUNT(ci.id) FILTER (WHERE ci.interaction_type = ''whatsapp_message'') AS whatsapp_messages,
        COUNT(ci.id) FILTER (WHERE ci.sentiment = ''positive'') AS positive_interactions,
        COUNT(ci.id) FILTER (WHERE ci.sentiment = ''negative'') AS negative_interactions
      FROM marketing_prospects mp
      LEFT JOIN crm_interactions ci ON mp.id = ci.prospect_id
      GROUP BY mp.id
    ';
  END IF;
END $$;

-- =====================================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================================

-- Insert sample Estonian prospect with phone/WhatsApp (only if table exists with columns)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables WHERE table_name = 'marketing_prospects'
  ) AND EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'marketing_prospects' AND column_name = 'phone'
  ) THEN
    INSERT INTO marketing_prospects (
      name, website, category, email, phone, whatsapp_phone,
      description, country, language, status, preferred_contact_method
    ) VALUES (
      'Test Company OÜ',
      'https://testcompany.ee',
      'Event Organizers',
      'info@testcompany.ee',
      '+372 5XXX XXXX',
      '+372 5XXX XXXX',
      'Estonian event organizer - test prospect',
      'Estonia',
      'et',
      'new',
      'whatsapp'
    ) ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- =====================================================================
-- COMMENTS
-- =====================================================================

COMMENT ON TABLE crm_interactions IS 'Multi-channel interaction tracking for B2B prospects (email, phone, WhatsApp)';
COMMENT ON COLUMN crm_interactions.channel IS 'Communication channel used for interaction';
COMMENT ON COLUMN crm_interactions.sentiment IS 'AI-analyzed sentiment of the interaction';

-- Add comments to views only if they exist
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_views WHERE viewname = 'recent_prospect_interactions') THEN
    COMMENT ON VIEW recent_prospect_interactions IS 'Recent interactions with full prospect context for admin dashboard';
  END IF;
  
  IF EXISTS (SELECT FROM pg_views WHERE viewname = 'prospect_activity_summary') THEN
    COMMENT ON VIEW prospect_activity_summary IS 'Summary of all prospect activities across channels';
  END IF;
END $$;
