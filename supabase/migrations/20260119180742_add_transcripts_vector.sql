-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Create transcript source enum
CREATE TYPE public.transcript_source AS ENUM ('zoom', 'manual', 'import');

-- Create transcripts table (stores full transcript metadata)
CREATE TABLE public.transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,

  -- Google Drive metadata
  gdrive_file_id TEXT UNIQUE NOT NULL,
  gdrive_folder_id TEXT,
  gdrive_ai_notes_id TEXT,
  gdrive_recording_id TEXT,

  -- Content
  title TEXT NOT NULL,
  full_text TEXT,
  ai_summary TEXT,

  -- Metadata
  source transcript_source DEFAULT 'zoom',
  lesson_date TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  word_count INTEGER,
  language TEXT DEFAULT 'he',

  -- Sync tracking
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  gdrive_modified_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create transcript_chunks table (for vector search)
CREATE TABLE public.transcript_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID REFERENCES public.transcripts(id) ON DELETE CASCADE NOT NULL,

  -- Chunk content
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,

  -- Vector embedding (1536 dimensions for OpenAI ada-002, can adjust for other models)
  embedding vector(1536),

  -- Metadata for filtering
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  lesson_date TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

  UNIQUE(transcript_id, chunk_index)
);

-- Create AI-generated insights table
CREATE TABLE public.transcript_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID REFERENCES public.transcripts(id) ON DELETE CASCADE NOT NULL,

  -- Structured insights extracted by AI
  key_topics TEXT[],
  skills_practiced TEXT[],
  progress_notes TEXT,
  action_items TEXT[],
  teacher_recommendations TEXT,
  student_mood TEXT,

  -- Raw AI response for reference
  raw_ai_response JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create sync_log table for tracking Google Drive sync
CREATE TABLE public.gdrive_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL, -- 'full', 'incremental'
  status TEXT NOT NULL, -- 'started', 'completed', 'failed'
  files_processed INTEGER DEFAULT 0,
  files_added INTEGER DEFAULT 0,
  files_updated INTEGER DEFAULT 0,
  files_failed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcript_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcript_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdrive_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transcripts
CREATE POLICY "Students can view their own transcripts"
  ON public.transcripts FOR SELECT
  USING (student_id = public.get_student_id(auth.uid()));

CREATE POLICY "Teachers can view all transcripts"
  ON public.transcripts FOR SELECT
  USING (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can insert transcripts"
  ON public.transcripts FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can update transcripts"
  ON public.transcripts FOR UPDATE
  USING (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can delete transcripts"
  ON public.transcripts FOR DELETE
  USING (public.has_role(auth.uid(), 'teacher'));

-- RLS Policies for transcript_chunks
CREATE POLICY "Students can view their own transcript chunks"
  ON public.transcript_chunks FOR SELECT
  USING (student_id = public.get_student_id(auth.uid()));

CREATE POLICY "Teachers can view all transcript chunks"
  ON public.transcript_chunks FOR SELECT
  USING (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can manage transcript chunks"
  ON public.transcript_chunks FOR ALL
  USING (public.has_role(auth.uid(), 'teacher'));

-- RLS Policies for transcript_insights
CREATE POLICY "Students can view their own insights"
  ON public.transcript_insights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.transcripts t
      WHERE t.id = transcript_id
      AND t.student_id = public.get_student_id(auth.uid())
    )
  );

CREATE POLICY "Teachers can view all insights"
  ON public.transcript_insights FOR SELECT
  USING (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can manage insights"
  ON public.transcript_insights FOR ALL
  USING (public.has_role(auth.uid(), 'teacher'));

-- RLS Policies for sync_log (teachers only)
CREATE POLICY "Teachers can view sync log"
  ON public.gdrive_sync_log FOR SELECT
  USING (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can manage sync log"
  ON public.gdrive_sync_log FOR ALL
  USING (public.has_role(auth.uid(), 'teacher'));

-- Create indexes for performance
CREATE INDEX idx_transcripts_student_id ON public.transcripts(student_id);
CREATE INDEX idx_transcripts_lesson_date ON public.transcripts(lesson_date DESC);
CREATE INDEX idx_transcripts_gdrive_file_id ON public.transcripts(gdrive_file_id);
CREATE INDEX idx_transcript_chunks_transcript_id ON public.transcript_chunks(transcript_id);
CREATE INDEX idx_transcript_chunks_student_id ON public.transcript_chunks(student_id);
CREATE INDEX idx_transcript_chunks_lesson_date ON public.transcript_chunks(lesson_date DESC);

-- Create HNSW index for fast vector similarity search
CREATE INDEX idx_transcript_chunks_embedding ON public.transcript_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Add updated_at trigger for transcripts
CREATE TRIGGER update_transcripts_updated_at
  BEFORE UPDATE ON public.transcripts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transcript_insights_updated_at
  BEFORE UPDATE ON public.transcript_insights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function for semantic search
CREATE OR REPLACE FUNCTION public.search_transcripts(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_student_id UUID DEFAULT NULL
)
RETURNS TABLE (
  chunk_id UUID,
  transcript_id UUID,
  student_id UUID,
  content TEXT,
  lesson_date TIMESTAMP WITH TIME ZONE,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.id as chunk_id,
    tc.transcript_id,
    tc.student_id,
    tc.content,
    tc.lesson_date,
    1 - (tc.embedding <=> query_embedding) as similarity
  FROM transcript_chunks tc
  WHERE
    (filter_student_id IS NULL OR tc.student_id = filter_student_id)
    AND tc.embedding IS NOT NULL
    AND 1 - (tc.embedding <=> query_embedding) > match_threshold
  ORDER BY tc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create function to get transcript context for AI
CREATE OR REPLACE FUNCTION public.get_student_transcript_context(
  p_student_id UUID,
  p_limit INT DEFAULT 5
)
RETURNS TABLE (
  transcript_id UUID,
  title TEXT,
  lesson_date TIMESTAMP WITH TIME ZONE,
  ai_summary TEXT,
  key_topics TEXT[],
  skills_practiced TEXT[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id as transcript_id,
    t.title,
    t.lesson_date,
    t.ai_summary,
    ti.key_topics,
    ti.skills_practiced
  FROM transcripts t
  LEFT JOIN transcript_insights ti ON ti.transcript_id = t.id
  WHERE t.student_id = p_student_id
  ORDER BY t.lesson_date DESC
  LIMIT p_limit;
$$;
