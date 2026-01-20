-- =====================================================
-- HARDCODED ADMINS - מנהלים קשיחים
-- =====================================================
-- inbal@voicely.co.il - מנהלת ראשית
-- info@compumit.com - מנהל מערכת
-- =====================================================

-- Update is_admin function to include hardcoded admin emails
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_email TEXT;
BEGIN
  -- Service role always has access
  IF auth.role() = 'service_role' THEN
    RETURN TRUE;
  END IF;

  -- Get current user's email
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = auth.uid();

  -- Hardcoded admin emails - always have access
  IF v_email IN ('inbal@voicely.co.il', 'info@compumit.com') THEN
    RETURN TRUE;
  END IF;

  -- Check if user is admin in users table
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also create a helper function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_email TEXT;
BEGIN
  -- Service role always has access
  IF auth.role() = 'service_role' THEN
    RETURN TRUE;
  END IF;

  -- Get current user's email
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = auth.uid();

  -- Only hardcoded emails are super admins
  RETURN v_email IN ('inbal@voicely.co.il', 'info@compumit.com');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
