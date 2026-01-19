-- Add venue_templates table for reusable venue layouts
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

-- Add indexes
CREATE INDEX idx_venue_templates_user ON venue_templates(user_id);
CREATE INDEX idx_venue_templates_created ON venue_templates(created_at DESC);

-- Enable RLS
ALTER TABLE venue_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for venue_templates
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

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_venue_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_venue_templates_updated_at
  BEFORE UPDATE ON venue_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_venue_templates_updated_at();
