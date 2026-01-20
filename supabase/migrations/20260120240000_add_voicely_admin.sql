-- =====================================================
-- ADD info@voicely.co.il TO ADMIN LIST
-- =====================================================

-- Update is_admin function to include info@voicely.co.il
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
  IF v_email IN ('inbal@voicely.co.il', 'info@compumit.com', 'info@voicely.co.il') THEN
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

-- Update is_super_admin function
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
  RETURN v_email IN ('inbal@voicely.co.il', 'info@compumit.com', 'info@voicely.co.il');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add info@voicely.co.il to users table as admin (if they exist in auth.users)
INSERT INTO public.users (id, email, name, role, created_at, updated_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
  'admin'::user_role,
  NOW(),
  NOW()
FROM auth.users au
WHERE au.email = 'info@voicely.co.il'
  AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = au.id)
ON CONFLICT (id) DO UPDATE SET role = 'admin', updated_at = NOW();

-- Update existing user to admin if they have this email
UPDATE public.users
SET role = 'admin', updated_at = NOW()
WHERE email = 'info@voicely.co.il'
  AND role != 'admin';

-- Update RLS policy to include info@voicely.co.il
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;

CREATE POLICY "Admins can view all users"
  ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
    )
    OR
    auth.jwt()->>'email' IN ('inbal@voicely.co.il', 'info@compumit.com', 'info@voicely.co.il')
  );
