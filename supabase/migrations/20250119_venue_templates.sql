/**
 * Venue Templates Table
 * 
 * Stores reusable venue seating layouts for event organizers.
 * Allows organizers to design a venue layout once and reuse it across multiple events,
 * improving efficiency and maintaining consistent venue configurations.
 * 
 * Features:
 * - User ownership (cascade delete on user removal)
 * - Canvas dimensions (customizable stage size)
 * - Items as JSONB (flexible storage of seats, tables, decorations)
 * - Optional background image for venue visualization
 * - Automatic timestamps for audit trail
 */
CREATE TABLE IF NOT EXISTS venue_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  canvas_width integer NOT NULL DEFAULT 800,
  canvas_height integer NOT NULL DEFAULT 600,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  background_image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Performance indexes for common queries
-- Lookup templates by user (fast filtering)
CREATE INDEX idx_venue_templates_user ON venue_templates(user_id);
-- Recent templates first (reverse chronological)
CREATE INDEX idx_venue_templates_created ON venue_templates(created_at DESC);

-- Enable Row Level Security for privacy and access control
-- Each organizer only sees and manages their own templates
ALTER TABLE venue_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Enforce user isolation at database level
-- Users can only access, create, modify, and delete their own venue templates
CREATE POLICY "Users can view their own templates"
  ON venue_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create templates"
  ON venue_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON venue_templates FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON venue_templates FOR DELETE
  USING (auth.uid() = user_id);

-- Automatic timestamp management: updates updated_at when record changes
-- Maintains accurate audit trail and enables sorting by modification time
CREATE OR REPLACE FUNCTION update_venue_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: automatically update updated_at timestamp on any record modification
CREATE TRIGGER set_venue_templates_updated_at
  BEFORE UPDATE ON venue_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_venue_templates_updated_at();
