-- Create triggers for automatic embedding queue

-- Function to queue a transcript for embedding generation
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
  ON CONFLICT DO NOTHING;

  -- Update transcript status
  UPDATE transcripts
  SET embedding_status = 'queued'
  WHERE id = p_transcript_id
  AND embedding_status = 'pending';
END;
$$;

-- Trigger function for new inserts
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

-- Trigger function for updates
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
     AND (NEW.embedding_status IS NULL OR NEW.embedding_status IN ('pending', 'error')) THEN
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

-- Functions to manage the queue

-- Get next batch of jobs
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

-- Mark job as completed
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

-- Mark job as failed
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.queue_transcript_for_embedding TO service_role;
GRANT EXECUTE ON FUNCTION public.get_embedding_jobs TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_embedding_job TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_embedding_job TO service_role;
