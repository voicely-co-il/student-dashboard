-- =====================================================
-- ADD INBAL MITIN AS TEACHER/ADMIN
-- =====================================================
-- inbal.mitin@gmail.com - מורה ומנהלת
-- =====================================================

-- Update is_admin function to include inbal.mitin@gmail.com
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
  IF v_email IN ('inbal@voicely.co.il', 'info@compumit.com', 'inbal.mitin@gmail.com') THEN
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

-- Update is_super_admin function to include inbal.mitin@gmail.com
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
  RETURN v_email IN ('inbal@voicely.co.il', 'info@compumit.com', 'inbal.mitin@gmail.com');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update is_teacher function to include inbal.mitin@gmail.com
CREATE OR REPLACE FUNCTION public.is_teacher()
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

  -- Hardcoded teacher/admin emails - always have teacher access
  IF v_email IN ('inbal@voicely.co.il', 'info@compumit.com', 'inbal.mitin@gmail.com') THEN
    RETURN TRUE;
  END IF;

  -- Check if user is teacher or admin in users table
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('teacher', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher() TO authenticated;

-- Create trigger to auto-create user record on first sign-in
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role public.user_role;
  v_name TEXT;
BEGIN
  -- Determine role based on email
  IF NEW.email IN ('inbal@voicely.co.il', 'info@compumit.com', 'inbal.mitin@gmail.com') THEN
    v_role := 'teacher';
  ELSE
    v_role := 'student';
  END IF;

  -- Extract name from email or metadata
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Insert user record if not exists
  INSERT INTO public.users (id, email, name, role, is_active)
  VALUES (NEW.id, NEW.email, v_name, v_role, true)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
