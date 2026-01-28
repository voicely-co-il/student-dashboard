-- Create embeddings_queue table for job management

CREATE TABLE IF NOT EXISTS public.embeddings_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID NOT NULL REFERENCES public.transcripts(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_embeddings_queue_status ON public.embeddings_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_embeddings_queue_transcript ON public.embeddings_queue(transcript_id);

-- Enable RLS
ALTER TABLE public.embeddings_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Service role full access to embeddings_queue" ON public.embeddings_queue;

-- Only service role can access queue
CREATE POLICY "Service role full access to embeddings_queue"
  ON public.embeddings_queue FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
