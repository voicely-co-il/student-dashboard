-- Integrate name resolution with transcript user_id linking
-- This connects student_name_mappings to the user_id system

-- Step 1: Add user_id column to student_name_mappings for direct linking
ALTER TABLE public.student_name_mappings
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_student_name_mappings_user ON public.student_name_mappings(user_id);

-- Step 2: Update resolve_student_name to use mappings table first
CREATE OR REPLACE FUNCTION public.resolve_student_name(p_student_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_resolved_name TEXT;
BEGIN
  -- First check student_name_mappings (manual corrections have highest priority)
  SELECT snm.user_id, snm.resolved_name INTO v_user_id, v_resolved_name
  FROM student_name_mappings snm
  WHERE snm.original_name = p_student_name
  AND snm.status IN ('approved', 'auto_matched');

  IF v_user_id IS NOT NULL THEN
    RETURN v_user_id;
  END IF;

  -- If resolved_name exists but no user_id, try to match by name
  IF v_resolved_name IS NOT NULL THEN
    SELECT id INTO v_user_id
    FROM users
    WHERE LOWER(name) = LOWER(v_resolved_name);

    IF v_user_id IS NOT NULL THEN
      RETURN v_user_id;
    END IF;
  END IF;

  -- Then check student_name_aliases
  SELECT user_id INTO v_user_id
  FROM student_name_aliases
  WHERE transcript_name = p_student_name;

  IF v_user_id IS NOT NULL THEN
    RETURN v_user_id;
  END IF;

  -- Try exact match with users
  SELECT id INTO v_user_id
  FROM users
  WHERE LOWER(name) = LOWER(p_student_name);

  IF v_user_id IS NOT NULL THEN
    RETURN v_user_id;
  END IF;

  -- Try contains match
  SELECT id INTO v_user_id
  FROM users
  WHERE LOWER(name) LIKE '%' || LOWER(p_student_name) || '%'
     OR LOWER(p_student_name) LIKE '%' || LOWER(name) || '%'
  LIMIT 1;

  RETURN v_user_id;
END;
$$;

-- Step 3: Function to sync transcript names to mappings table
CREATE OR REPLACE FUNCTION public.sync_transcript_names_to_mappings()
RETURNS TABLE (
  new_names INTEGER,
  updated_counts INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_names INTEGER := 0;
  v_updated_counts INTEGER := 0;
BEGIN
  -- Insert new names
  INSERT INTO student_name_mappings (original_name, transcript_count, last_seen_at, status)
  SELECT
    t.student_name,
    COUNT(*),
    MAX(t.lesson_date),
    CASE
      WHEN EXISTS (SELECT 1 FROM users u WHERE LOWER(u.name) = LOWER(t.student_name))
      THEN 'auto_matched'
      ELSE 'pending'
    END
  FROM transcripts t
  WHERE t.student_name IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM student_name_mappings snm WHERE snm.original_name = t.student_name
  )
  GROUP BY t.student_name
  ON CONFLICT (original_name) DO NOTHING;

  GET DIAGNOSTICS v_new_names = ROW_COUNT;

  -- Update counts for existing names
  UPDATE student_name_mappings snm
  SET
    transcript_count = sub.cnt,
    last_seen_at = sub.last_seen
  FROM (
    SELECT student_name, COUNT(*) as cnt, MAX(lesson_date) as last_seen
    FROM transcripts
    WHERE student_name IS NOT NULL
    GROUP BY student_name
  ) sub
  WHERE snm.original_name = sub.student_name
  AND (snm.transcript_count != sub.cnt OR snm.last_seen_at IS DISTINCT FROM sub.last_seen);

  GET DIAGNOSTICS v_updated_counts = ROW_COUNT;

  -- Auto-set user_id for approved/auto_matched mappings that don't have one
  UPDATE student_name_mappings snm
  SET user_id = (
    SELECT id FROM users u
    WHERE LOWER(u.name) = LOWER(COALESCE(snm.resolved_name, snm.original_name))
    LIMIT 1
  )
  WHERE snm.status IN ('approved', 'auto_matched')
  AND snm.user_id IS NULL
  AND EXISTS (
    SELECT 1 FROM users u
    WHERE LOWER(u.name) = LOWER(COALESCE(snm.resolved_name, snm.original_name))
  );

  RETURN QUERY SELECT v_new_names, v_updated_counts;
END;
$$;

-- Step 4: Update transcripts user_id when mapping is approved
CREATE OR REPLACE FUNCTION public.trigger_update_transcripts_from_mapping()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When a mapping is approved/auto_matched and has user_id, update transcripts
  IF NEW.status IN ('approved', 'auto_matched') AND NEW.user_id IS NOT NULL THEN
    UPDATE transcripts
    SET user_id = NEW.user_id
    WHERE student_name = NEW.original_name
    AND (user_id IS NULL OR user_id != NEW.user_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_mapping_update_transcripts ON public.student_name_mappings;

CREATE TRIGGER on_mapping_update_transcripts
AFTER INSERT OR UPDATE ON public.student_name_mappings
FOR EACH ROW
WHEN (NEW.status IN ('approved', 'auto_matched') AND NEW.user_id IS NOT NULL)
EXECUTE FUNCTION public.trigger_update_transcripts_from_mapping();

-- Step 5: Run initial sync
SELECT * FROM sync_transcript_names_to_mappings();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.sync_transcript_names_to_mappings TO service_role;

COMMENT ON FUNCTION public.sync_transcript_names_to_mappings IS 'Syncs unique student names from transcripts to the mappings table';
