-- =====================================================
-- VOICELY SECURITY: Storage Bucket Policies
-- =====================================================
-- Secure storage for voice recordings (biometric data)
-- =====================================================

-- Create recordings bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recordings',
  'recordings',
  false,  -- PRIVATE bucket
  52428800,  -- 50MB max file size
  ARRAY['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/m4a']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/m4a'];

-- =====================================================
-- STORAGE POLICIES
-- Folder structure: {user_id}/{recording_id}.{ext}
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload own recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own recordings" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can view student recordings" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all recordings" ON storage.objects;

-- Students: Upload to their own folder only
CREATE POLICY "Users can upload own recordings"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'recordings'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Students: View their own recordings only
CREATE POLICY "Users can view own recordings"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'recordings'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Students: Delete their own recordings only
CREATE POLICY "Users can delete own recordings"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'recordings'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Teachers: View their students' recordings
CREATE POLICY "Teachers can view student recordings"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'recordings'
  AND public.get_user_role() = 'teacher'
  AND public.is_teacher_of((storage.foldername(name))[1]::uuid)
);

-- Admins: Full access to all recordings
CREATE POLICY "Admins can manage all recordings"
ON storage.objects FOR ALL
USING (
  bucket_id = 'recordings'
  AND public.is_admin()
);

-- =====================================================
-- HELPER FUNCTION: Generate signed URL with audit
-- Use this instead of direct signed URL generation
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_recording_signed_url(
  p_recording_path TEXT,
  p_expires_in INTEGER DEFAULT 3600  -- 1 hour default
)
RETURNS TEXT AS $$
DECLARE
  v_user_id UUID;
  v_owner_id UUID;
  v_can_access BOOLEAN := false;
BEGIN
  v_user_id := auth.uid();
  v_owner_id := (string_to_array(p_recording_path, '/'))[1]::uuid;

  -- Check access
  IF v_user_id = v_owner_id THEN
    v_can_access := true;
  ELSIF public.get_user_role() = 'teacher' AND public.is_teacher_of(v_owner_id) THEN
    v_can_access := true;
  ELSIF public.is_admin() THEN
    v_can_access := true;
  END IF;

  IF NOT v_can_access THEN
    RAISE EXCEPTION 'Access denied to recording';
  END IF;

  -- Log the access
  PERFORM public.log_audit(
    v_user_id,
    'view_recording',
    'recording',
    v_owner_id,
    jsonb_build_object('path', p_recording_path)
  );

  -- Return signed URL (this would need to be done via Edge Function)
  -- This function just validates access and logs it
  RETURN p_recording_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_recording_signed_url(TEXT, INTEGER) TO authenticated;
