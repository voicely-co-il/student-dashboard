-- NotebookLM Content Table
-- Stores generated content from NotebookLM (podcasts, slides, infographics, Q&A)

CREATE TABLE notebooklm_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Source notebook
  notebook_id TEXT NOT NULL,
  notebook_name TEXT,

  -- Content type
  content_type TEXT NOT NULL CHECK (content_type IN ('podcast', 'slides', 'infographic', 'question')),

  -- Generation settings
  settings JSONB DEFAULT '{}',
  prompt TEXT,

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  task_id TEXT,
  progress_percent INTEGER DEFAULT 0,

  -- Results
  content_url TEXT,
  thumbnail_url TEXT,
  transcript TEXT,
  answer TEXT, -- for question type
  duration_seconds INTEGER,

  -- Metadata
  title TEXT,
  description TEXT,
  error_message TEXT
);

-- Enable RLS
ALTER TABLE notebooklm_content ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can access (marketing feature)
CREATE POLICY "Admins can manage notebooklm_content"
  ON notebooklm_content FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Indexes for common queries
CREATE INDEX idx_notebooklm_content_status ON notebooklm_content(status);
CREATE INDEX idx_notebooklm_content_type ON notebooklm_content(content_type);
CREATE INDEX idx_notebooklm_content_created_by ON notebooklm_content(created_by);
CREATE INDEX idx_notebooklm_content_created_at ON notebooklm_content(created_at DESC);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_notebooklm_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notebooklm_content_updated_at
  BEFORE UPDATE ON notebooklm_content
  FOR EACH ROW
  EXECUTE FUNCTION update_notebooklm_content_updated_at();

-- Comment
COMMENT ON TABLE notebooklm_content IS 'Stores AI-generated content from NotebookLM integration';
