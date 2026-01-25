-- Transcript Analysis Tables
-- Links transcript analysis to group students

-- =====================================================
-- TABLE: transcript_student_analysis
-- Analysis of individual student participation in transcripts
-- =====================================================

CREATE TABLE IF NOT EXISTS transcript_student_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Links
  transcript_id UUID NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
  student_id UUID REFERENCES group_students(id) ON DELETE SET NULL,

  -- Speaker identification (before student is registered)
  speaker_name TEXT NOT NULL,

  -- Metrics extracted from transcript
  segments_count INTEGER DEFAULT 0,
  word_count INTEGER DEFAULT 0,
  estimated_speaking_seconds NUMERIC(10, 2) DEFAULT 0,
  singing_detected BOOLEAN DEFAULT false,

  -- Topics/keywords mentioned (AI-extracted later)
  topics JSONB DEFAULT '[]'::jsonb,

  -- Speaker segments (detailed breakdown)
  segments JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  analyzed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique: one analysis per speaker per transcript
  UNIQUE(transcript_id, speaker_name)
);

-- Indexes
CREATE INDEX idx_transcript_analysis_transcript ON transcript_student_analysis(transcript_id);
CREATE INDEX idx_transcript_analysis_student ON transcript_student_analysis(student_id);
CREATE INDEX idx_transcript_analysis_speaker ON transcript_student_analysis(speaker_name);

-- =====================================================
-- TABLE: group_lesson_analysis
-- Summary analysis for group lessons
-- =====================================================

CREATE TABLE IF NOT EXISTS group_lesson_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to transcript
  transcript_id UUID NOT NULL UNIQUE REFERENCES transcripts(id) ON DELETE CASCADE,

  -- Lesson metadata
  lesson_date DATE,
  lesson_title TEXT,

  -- Participants
  total_speakers INTEGER DEFAULT 0,
  student_speakers INTEGER DEFAULT 0,
  teacher_speakers INTEGER DEFAULT 0,

  -- Extracted speaker names
  speakers JSONB DEFAULT '[]'::jsonb,
  student_names JSONB DEFAULT '[]'::jsonb,
  teacher_names JSONB DEFAULT '[]'::jsonb,

  -- Session metrics
  total_segments INTEGER DEFAULT 0,
  total_word_count INTEGER DEFAULT 0,
  estimated_duration_minutes NUMERIC(10, 2),

  -- Content analysis
  singing_segments_count INTEGER DEFAULT 0,
  exercise_types JSONB DEFAULT '[]'::jsonb,

  -- AI summary (to be generated later)
  ai_summary TEXT,
  ai_topics JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  analyzed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_group_lesson_analysis_date ON group_lesson_analysis(lesson_date DESC);

-- =====================================================
-- RLS Policies
-- =====================================================

ALTER TABLE transcript_student_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_lesson_analysis ENABLE ROW LEVEL SECURITY;

-- Teachers and admins can view all analysis
CREATE POLICY "Teachers can view transcript analysis"
  ON transcript_student_analysis FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role::text IN ('admin', 'teacher')
    )
  );

CREATE POLICY "Teachers can view group lesson analysis"
  ON group_lesson_analysis FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role::text IN ('admin', 'teacher')
    )
  );

-- Students can view their own analysis
CREATE POLICY "Students can view own transcript analysis"
  ON transcript_student_analysis FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM group_students WHERE user_id = auth.uid()
    )
  );

-- Service role has full access (for scripts)
CREATE POLICY "Service role full access to transcript_student_analysis"
  ON transcript_student_analysis FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to group_lesson_analysis"
  ON group_lesson_analysis FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE transcript_student_analysis IS 'Individual student participation analysis extracted from transcripts';
COMMENT ON TABLE group_lesson_analysis IS 'Summary analysis of group lesson transcripts';
