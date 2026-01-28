-- Automatic Embeddings System
-- Based on Supabase best practices: https://supabase.com/blog/automatic-embeddings
-- This creates a queue-based system for generating embeddings automatically

-- Step 1: Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Step 2: Add embedding status columns to transcripts
ALTER TABLE public.transcripts
ADD COLUMN IF NOT EXISTS embedding_status TEXT DEFAULT 'pending'
  CHECK (embedding_status IN ('pending', 'queued', 'processing', 'completed', 'error')),
ADD COLUMN IF NOT EXISTS embedding_error TEXT,
ADD COLUMN IF NOT EXISTS chunks_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS embedding_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS embedding_completed_at TIMESTAMP WITH TIME ZONE;

-- Create index for finding transcripts needing embeddings
CREATE INDEX IF NOT EXISTS idx_transcripts_embedding_status
  ON public.transcripts(embedding_status)
  WHERE embedding_status IN ('pending', 'queued', 'error');

-- Step 3: Create embeddings_queue table for job management
CREATE TABLE IF NOT EXISTS public.embeddings_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID NOT NULL REFERENCES public.transcripts(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(transcript_id, status)
);

CREATE INDEX IF NOT EXISTS idx_embeddings_queue_status ON public.embeddings_queue(status, created_at);

-- Enable RLS
ALTER TABLE public.embeddings_queue ENABLE ROW LEVEL SECURITY;

-- Only service role can access queue
CREATE POLICY "Service role full access to embeddings_queue"
  ON public.embeddings_queue FOR ALL
  USING (auth.role() = 'service_role');

-- Step 4: Function to queue a transcript for embedding generation
CREATE OR REPLACE FUNCTION public.queue_transcript_for_embedding(p_transcript_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if transcript exists and has content
  IF NOT EXISTS (
    SELECT 1 FROM transcripts
    WHERE id = p_transcript_id
    AND full_text IS NOT NULL
    AND length(full_text) > 100
  ) THEN
    RETURN;
  END IF;

  -- Check if already queued or processing
  IF EXISTS (
    SELECT 1 FROM embeddings_queue
    WHERE transcript_id = p_transcript_id
    AND status IN ('pending', 'processing')
  ) THEN
    RETURN;
  END IF;

  -- Add to queue
  INSERT INTO embeddings_queue (transcript_id, status)
  VALUES (p_transcript_id, 'pending')
  ON CONFLICT (transcript_id, status) DO NOTHING;

  -- Update transcript status
  UPDATE transcripts
  SET embedding_status = 'queued'
  WHERE id = p_transcript_id
  AND embedding_status = 'pending';
END;
$$;

-- Step 5: Trigger to automatically queue new transcripts
CREATE OR REPLACE FUNCTION public.trigger_queue_transcript_embedding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only queue if has content
  IF NEW.full_text IS NOT NULL AND length(NEW.full_text) > 100 THEN
    PERFORM public.queue_transcript_for_embedding(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_transcript_insert_queue_embedding ON public.transcripts;

-- Create trigger for new inserts
CREATE TRIGGER on_transcript_insert_queue_embedding
AFTER INSERT ON public.transcripts
FOR EACH ROW
EXECUTE FUNCTION public.trigger_queue_transcript_embedding();

-- Also trigger on update if full_text changed and no embeddings yet
CREATE OR REPLACE FUNCTION public.trigger_queue_transcript_embedding_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only queue if full_text changed and doesn't have embeddings yet
  IF (OLD.full_text IS DISTINCT FROM NEW.full_text)
     AND NEW.full_text IS NOT NULL
     AND length(NEW.full_text) > 100
     AND NEW.embedding_status IN ('pending', 'error') THEN
    PERFORM public.queue_transcript_for_embedding(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_transcript_update_queue_embedding ON public.transcripts;

CREATE TRIGGER on_transcript_update_queue_embedding
AFTER UPDATE ON public.transcripts
FOR EACH ROW
EXECUTE FUNCTION public.trigger_queue_transcript_embedding_on_update();

-- Step 6: Function to get next batch from queue
CREATE OR REPLACE FUNCTION public.get_embedding_jobs(p_batch_size INTEGER DEFAULT 5)
RETURNS TABLE (
  job_id UUID,
  transcript_id UUID,
  full_text TEXT,
  student_name TEXT,
  lesson_date TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    UPDATE embeddings_queue eq
    SET
      status = 'processing',
      started_at = now(),
      attempts = attempts + 1
    WHERE eq.id IN (
      SELECT eq2.id
      FROM embeddings_queue eq2
      WHERE eq2.status = 'pending'
      AND eq2.attempts < eq2.max_attempts
      ORDER BY eq2.created_at
      LIMIT p_batch_size
      FOR UPDATE SKIP LOCKED
    )
    RETURNING eq.id, eq.transcript_id
  )
  SELECT
    c.id as job_id,
    c.transcript_id,
    t.full_text,
    t.student_name,
    t.lesson_date
  FROM claimed c
  JOIN transcripts t ON t.id = c.transcript_id;
END;
$$;

-- Step 7: Function to mark job as completed
CREATE OR REPLACE FUNCTION public.complete_embedding_job(
  p_job_id UUID,
  p_chunks_count INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transcript_id UUID;
BEGIN
  -- Get transcript_id and update queue
  UPDATE embeddings_queue
  SET
    status = 'completed',
    completed_at = now()
  WHERE id = p_job_id
  RETURNING transcript_id INTO v_transcript_id;

  -- Update transcript status
  IF v_transcript_id IS NOT NULL THEN
    UPDATE transcripts
    SET
      embedding_status = 'completed',
      chunks_count = p_chunks_count,
      embedding_completed_at = now()
    WHERE id = v_transcript_id;
  END IF;
END;
$$;

-- Step 8: Function to mark job as failed
CREATE OR REPLACE FUNCTION public.fail_embedding_job(
  p_job_id UUID,
  p_error_message TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transcript_id UUID;
  v_attempts INTEGER;
  v_max_attempts INTEGER;
BEGIN
  -- Get job details
  SELECT transcript_id, attempts, max_attempts
  INTO v_transcript_id, v_attempts, v_max_attempts
  FROM embeddings_queue
  WHERE id = p_job_id;

  IF v_attempts >= v_max_attempts THEN
    -- Max retries reached, mark as failed
    UPDATE embeddings_queue
    SET
      status = 'failed',
      error_message = p_error_message,
      completed_at = now()
    WHERE id = p_job_id;

    UPDATE transcripts
    SET
      embedding_status = 'error',
      embedding_error = p_error_message
    WHERE id = v_transcript_id;
  ELSE
    -- Reset to pending for retry
    UPDATE embeddings_queue
    SET
      status = 'pending',
      error_message = p_error_message
    WHERE id = p_job_id;
  END IF;
END;
$$;

-- Step 9: Queue existing transcripts without embeddings
-- This will be processed by the cron job
INSERT INTO embeddings_queue (transcript_id, status)
SELECT t.id, 'pending'
FROM transcripts t
LEFT JOIN transcript_chunks tc ON tc.transcript_id = t.id
WHERE t.full_text IS NOT NULL
AND length(t.full_text) > 100
AND tc.id IS NULL
AND NOT EXISTS (
  SELECT 1 FROM embeddings_queue eq
  WHERE eq.transcript_id = t.id
  AND eq.status IN ('pending', 'processing')
)
ON CONFLICT DO NOTHING;

-- Update status for queued transcripts
UPDATE transcripts t
SET embedding_status = 'queued'
WHERE embedding_status = 'pending'
AND EXISTS (
  SELECT 1 FROM embeddings_queue eq
  WHERE eq.transcript_id = t.id
  AND eq.status = 'pending'
);

-- Mark transcripts that already have chunks as completed
UPDATE transcripts t
SET
  embedding_status = 'completed',
  chunks_count = (SELECT COUNT(*) FROM transcript_chunks tc WHERE tc.transcript_id = t.id)
WHERE embedding_status = 'pending'
AND EXISTS (
  SELECT 1 FROM transcript_chunks tc WHERE tc.transcript_id = t.id
);

-- Step 10: Create view for monitoring
CREATE OR REPLACE VIEW public.embedding_stats AS
SELECT
  embedding_status,
  COUNT(*) as count,
  ROUND(AVG(chunks_count)) as avg_chunks
FROM transcripts
GROUP BY embedding_status
ORDER BY
  CASE embedding_status
    WHEN 'pending' THEN 1
    WHEN 'queued' THEN 2
    WHEN 'processing' THEN 3
    WHEN 'completed' THEN 4
    WHEN 'error' THEN 5
  END;

-- Grant permissions
GRANT SELECT ON public.embedding_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.queue_transcript_for_embedding TO service_role;
GRANT EXECUTE ON FUNCTION public.get_embedding_jobs TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_embedding_job TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_embedding_job TO service_role;

COMMENT ON TABLE public.embeddings_queue IS 'Queue for processing transcript embeddings';
COMMENT ON FUNCTION public.queue_transcript_for_embedding IS 'Add a transcript to the embedding generation queue';
COMMENT ON FUNCTION public.get_embedding_jobs IS 'Get next batch of transcripts to process for embeddings';
