-- Fix search_transcripts function with proper vector schema reference
-- The vector extension is in the 'extensions' schema, so we need to cast properly

DROP FUNCTION IF EXISTS public.search_transcripts(vector, float, int, uuid);
DROP FUNCTION IF EXISTS public.search_transcripts(vector, float, int, text);
DROP FUNCTION IF EXISTS public.search_transcripts(extensions.vector, float, int, text);

CREATE OR REPLACE FUNCTION public.search_transcripts(
  query_embedding extensions.vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_student_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  chunk_id UUID,
  transcript_id UUID,
  student_name TEXT,
  content TEXT,
  lesson_date TIMESTAMP WITH TIME ZONE,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.id as chunk_id,
    tc.transcript_id,
    t.student_name,
    tc.content,
    tc.lesson_date,
    (1 - (tc.embedding <=> query_embedding))::float as similarity
  FROM transcript_chunks tc
  JOIN transcripts t ON t.id = tc.transcript_id
  WHERE
    (filter_student_name IS NULL OR t.student_name ILIKE '%' || filter_student_name || '%')
    AND tc.embedding IS NOT NULL
    AND (1 - (tc.embedding <=> query_embedding)) > match_threshold
  ORDER BY tc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.search_transcripts TO authenticated, service_role;

COMMENT ON FUNCTION public.search_transcripts IS 'Semantic search across transcript chunks using vector similarity';
