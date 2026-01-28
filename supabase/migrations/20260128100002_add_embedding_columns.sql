-- Add embedding status columns to transcripts table
-- This is a separate migration to ensure the columns are added

-- Add columns if they don't exist
DO $$
BEGIN
  -- embedding_status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'transcripts'
    AND column_name = 'embedding_status'
  ) THEN
    ALTER TABLE public.transcripts
    ADD COLUMN embedding_status TEXT DEFAULT 'pending';
  END IF;

  -- embedding_error
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'transcripts'
    AND column_name = 'embedding_error'
  ) THEN
    ALTER TABLE public.transcripts
    ADD COLUMN embedding_error TEXT;
  END IF;

  -- chunks_count
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'transcripts'
    AND column_name = 'chunks_count'
  ) THEN
    ALTER TABLE public.transcripts
    ADD COLUMN chunks_count INTEGER DEFAULT 0;
  END IF;

  -- embedding_started_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'transcripts'
    AND column_name = 'embedding_started_at'
  ) THEN
    ALTER TABLE public.transcripts
    ADD COLUMN embedding_started_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- embedding_completed_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'transcripts'
    AND column_name = 'embedding_completed_at'
  ) THEN
    ALTER TABLE public.transcripts
    ADD COLUMN embedding_completed_at TIMESTAMP WITH TIME ZONE;
  END IF;
END;
$$;

-- Add check constraint
ALTER TABLE public.transcripts
DROP CONSTRAINT IF EXISTS transcripts_embedding_status_check;

ALTER TABLE public.transcripts
ADD CONSTRAINT transcripts_embedding_status_check
CHECK (embedding_status IN ('pending', 'queued', 'processing', 'completed', 'error'));

-- Create index for finding transcripts needing embeddings
CREATE INDEX IF NOT EXISTS idx_transcripts_embedding_status
ON public.transcripts(embedding_status)
WHERE embedding_status IN ('pending', 'queued', 'error');

-- Mark transcripts that already have chunks as completed
UPDATE public.transcripts t
SET
  embedding_status = 'completed',
  chunks_count = (SELECT COUNT(*) FROM public.transcript_chunks tc WHERE tc.transcript_id = t.id)
WHERE EXISTS (
  SELECT 1 FROM public.transcript_chunks tc WHERE tc.transcript_id = t.id
)
AND (t.embedding_status IS NULL OR t.embedding_status = 'pending');

-- Create view for monitoring
CREATE OR REPLACE VIEW public.embedding_stats AS
SELECT
  COALESCE(embedding_status, 'unknown') as embedding_status,
  COUNT(*) as count,
  COALESCE(ROUND(AVG(chunks_count)), 0) as avg_chunks
FROM public.transcripts
GROUP BY embedding_status
ORDER BY
  CASE embedding_status
    WHEN 'pending' THEN 1
    WHEN 'queued' THEN 2
    WHEN 'processing' THEN 3
    WHEN 'completed' THEN 4
    WHEN 'error' THEN 5
    ELSE 6
  END;

-- Grant permissions
GRANT SELECT ON public.embedding_stats TO authenticated;
