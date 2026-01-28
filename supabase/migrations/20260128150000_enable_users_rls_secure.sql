-- =====================================================
-- ENABLE SECURE RLS ON USERS TABLE
-- =====================================================
-- Proper Row Level Security for student privacy
-- Students can only see their own data
-- Teachers can see students in their groups
-- Admins can see all

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTION: Check if user is admin
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check user_roles table
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN TRUE;
  END IF;

  -- Fallback: check hardcoded admin emails
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email IN ('inbal@voicely.co.il', 'info@compumit.com')
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- HELPER FUNCTION: Check if user is teacher
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'teacher'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- POLICIES FOR USERS TABLE
-- =====================================================

-- 1. Users can view their own profile
CREATE POLICY "users_view_own"
ON public.users FOR SELECT
USING (id = auth.uid());

-- 2. Users can update their own profile
CREATE POLICY "users_update_own"
ON public.users FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 3. Admins can view all users
CREATE POLICY "admins_view_all_users"
ON public.users FOR SELECT
USING (public.is_admin());

-- 4. Admins can update all users
CREATE POLICY "admins_update_all_users"
ON public.users FOR UPDATE
USING (public.is_admin());

-- 5. Teachers can view students in their groups
CREATE POLICY "teachers_view_group_students"
ON public.users FOR SELECT
USING (
  public.is_teacher()
  AND EXISTS (
    SELECT 1 FROM public.group_members gm
    JOIN public.groups g ON g.id = gm.group_id
    WHERE gm.user_id = public.users.id
    AND g.teacher_id = auth.uid()
  )
);

-- 6. Service role bypass (for Edge Functions)
CREATE POLICY "service_role_full_access"
ON public.users FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- POLICIES FOR USER_ROLES TABLE
-- =====================================================
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can view their own role
CREATE POLICY "users_view_own_role"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid());

-- Admins can view all roles
CREATE POLICY "admins_view_all_roles"
ON public.user_roles FOR SELECT
USING (public.is_admin());

-- Admins can manage roles
CREATE POLICY "admins_manage_roles"
ON public.user_roles FOR ALL
USING (public.is_admin());

-- Service role bypass
CREATE POLICY "service_role_roles_access"
ON public.user_roles FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- POLICIES FOR GROUP_STUDENTS TABLE (student profiles)
-- =====================================================
ALTER TABLE public.group_students ENABLE ROW LEVEL SECURITY;

-- Students can view their own profile
CREATE POLICY "students_view_own_profile"
ON public.group_students FOR SELECT
USING (user_id = auth.uid());

-- Students can update their own profile
CREATE POLICY "students_update_own_profile"
ON public.group_students FOR UPDATE
USING (user_id = auth.uid());

-- Admins can view all student profiles
CREATE POLICY "admins_view_all_students"
ON public.group_students FOR SELECT
USING (public.is_admin());

-- Teachers can view students in their groups
CREATE POLICY "teachers_view_their_students"
ON public.group_students FOR SELECT
USING (
  public.is_teacher()
  AND EXISTS (
    SELECT 1 FROM public.group_members gm
    JOIN public.groups g ON g.id = gm.group_id
    WHERE gm.student_id = public.group_students.id
    AND g.teacher_id = auth.uid()
  )
);

-- Service role bypass
CREATE POLICY "service_role_students_access"
ON public.group_students FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- VERIFY: Add index for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_groups_teacher_id ON public.groups(teacher_id);
