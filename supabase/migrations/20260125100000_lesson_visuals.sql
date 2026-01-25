-- Lesson Visual Images - AI-generated images for student lesson summaries
-- Created automatically from lesson transcripts to reinforce learning

CREATE TABLE IF NOT EXISTS lesson_visuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to transcript/lesson
  transcript_id UUID REFERENCES transcripts(id) ON DELETE SET NULL,
  student_name TEXT, -- From transcript metadata
  lesson_date DATE,

  -- Content source
  source_text TEXT NOT NULL, -- Key points extracted from transcript
  prompt TEXT NOT NULL, -- Generated prompt for image

  -- Image data
  image_url TEXT,
  thumbnail_url TEXT,

  -- Generation details
  model TEXT DEFAULT 'gemini-2.5-flash', -- gemini-2.5-flash, gemini-3-pro, imagen-3
  settings JSONB DEFAULT '{}',

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  error_message TEXT,

  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX idx_lesson_visuals_student ON lesson_visuals(student_name, lesson_date DESC);
CREATE INDEX idx_lesson_visuals_status ON lesson_visuals(status, created_at DESC);
CREATE INDEX idx_lesson_visuals_transcript ON lesson_visuals(transcript_id);
CREATE INDEX idx_lesson_visuals_recent ON lesson_visuals(created_at DESC) WHERE status = 'completed';

-- RLS
ALTER TABLE lesson_visuals ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage lesson visuals"
  ON lesson_visuals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Teachers can view all
CREATE POLICY "Teachers can view lesson visuals"
  ON lesson_visuals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'teacher')
    )
  );

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_lesson_visuals_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lesson_visuals_updated
  BEFORE UPDATE ON lesson_visuals
  FOR EACH ROW
  EXECUTE FUNCTION update_lesson_visuals_timestamp();
