-- Student Name Resolution System
-- מערכת להתאמת שמות תלמידים מתמלולים למשתמשים

-- Step 0: Add user_id column to transcripts if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'transcripts'
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.transcripts
    ADD COLUMN user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END;
$$;

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_transcripts_user_id ON public.transcripts(user_id);

-- Step 1: Create name aliases table for manual corrections
CREATE TABLE IF NOT EXISTS public.student_name_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_name TEXT NOT NULL,  -- שם כפי שמופיע בתמלול
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,  -- המשתמש המתאים
  confidence TEXT DEFAULT 'manual' CHECK (confidence IN ('auto', 'manual', 'verified')),
  notes TEXT,  -- הערות לביקורת
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(transcript_name)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_student_name_aliases_name ON public.student_name_aliases(transcript_name);
CREATE INDEX IF NOT EXISTS idx_student_name_aliases_user ON public.student_name_aliases(user_id);

-- Enable RLS
ALTER TABLE public.student_name_aliases ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Service role full access to name_aliases" ON public.student_name_aliases;
DROP POLICY IF EXISTS "Admins can manage name aliases" ON public.student_name_aliases;

-- Admins and service role can manage aliases
CREATE POLICY "Service role full access to name_aliases"
  ON public.student_name_aliases FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can manage name aliases"
  ON public.student_name_aliases FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'teacher')
    )
  );

-- Step 2: Create function to resolve student name to user_id
CREATE OR REPLACE FUNCTION public.resolve_student_name(p_student_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- First check aliases table (manual corrections have priority)
  SELECT user_id INTO v_user_id
  FROM student_name_aliases
  WHERE transcript_name = p_student_name;

  IF v_user_id IS NOT NULL THEN
    RETURN v_user_id;
  END IF;

  -- Try exact match
  SELECT id INTO v_user_id
  FROM users
  WHERE LOWER(name) = LOWER(p_student_name);

  IF v_user_id IS NOT NULL THEN
    RETURN v_user_id;
  END IF;

  -- Try contains match (name contains the transcript name or vice versa)
  SELECT id INTO v_user_id
  FROM users
  WHERE LOWER(name) LIKE '%' || LOWER(p_student_name) || '%'
     OR LOWER(p_student_name) LIKE '%' || LOWER(name) || '%'
  LIMIT 1;

  RETURN v_user_id;  -- May be NULL if no match found
END;
$$;

-- Step 3: Create function to link transcripts to users
CREATE OR REPLACE FUNCTION public.link_transcripts_to_users()
RETURNS TABLE (
  linked_count INTEGER,
  unlinked_count INTEGER,
  unresolved_names TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_linked INTEGER := 0;
  v_unlinked INTEGER := 0;
  v_unresolved TEXT[] := ARRAY[]::TEXT[];
  v_record RECORD;
  v_user_id UUID;
BEGIN
  -- Process all transcripts without user_id
  FOR v_record IN
    SELECT DISTINCT student_name
    FROM transcripts
    WHERE student_name IS NOT NULL
    AND (user_id IS NULL OR user_id != (SELECT resolve_student_name(student_name)))
  LOOP
    v_user_id := resolve_student_name(v_record.student_name);

    IF v_user_id IS NOT NULL THEN
      -- Update all transcripts with this name
      UPDATE transcripts
      SET user_id = v_user_id
      WHERE student_name = v_record.student_name
      AND (user_id IS NULL OR user_id != v_user_id);

      v_linked := v_linked + 1;
    ELSE
      -- Track unresolved names
      v_unresolved := array_append(v_unresolved, v_record.student_name);
      v_unlinked := v_unlinked + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_linked, v_unlinked, v_unresolved;
END;
$$;

-- Step 4: Trigger to auto-link on transcript insert/update
CREATE OR REPLACE FUNCTION public.trigger_link_transcript_to_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Only try to resolve if student_name exists and user_id is not set
  IF NEW.student_name IS NOT NULL AND NEW.user_id IS NULL THEN
    v_user_id := resolve_student_name(NEW.student_name);
    IF v_user_id IS NOT NULL THEN
      NEW.user_id := v_user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_transcript_link_user ON public.transcripts;

-- Create trigger
CREATE TRIGGER on_transcript_link_user
BEFORE INSERT OR UPDATE ON public.transcripts
FOR EACH ROW
EXECUTE FUNCTION public.trigger_link_transcript_to_user();

-- Step 5: Create view for unresolved names (for Inbal's review)
CREATE OR REPLACE VIEW public.unresolved_student_names AS
SELECT
  t.student_name,
  COUNT(*) as transcript_count,
  MIN(t.lesson_date)::date as first_lesson,
  MAX(t.lesson_date)::date as last_lesson,
  array_agg(DISTINCT SUBSTRING(t.title, 1, 50)) as sample_titles
FROM transcripts t
WHERE t.student_name IS NOT NULL
AND t.user_id IS NULL
AND NOT EXISTS (
  SELECT 1 FROM student_name_aliases a WHERE a.transcript_name = t.student_name
)
GROUP BY t.student_name
ORDER BY COUNT(*) DESC;

-- Grant permissions
GRANT SELECT ON public.unresolved_student_names TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_student_name TO service_role;
GRANT EXECUTE ON FUNCTION public.link_transcripts_to_users TO service_role;

COMMENT ON TABLE public.student_name_aliases IS 'Manual corrections for student name matching';
COMMENT ON FUNCTION public.resolve_student_name IS 'Resolves a transcript student_name to a user_id';
COMMENT ON FUNCTION public.link_transcripts_to_users IS 'Links all unlinked transcripts to users';
COMMENT ON VIEW public.unresolved_student_names IS 'Shows student names that could not be matched - for manual review';
