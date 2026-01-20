-- =====================================================
-- ADD ADMIN USERS TO PUBLIC.USERS TABLE
-- =====================================================
-- This creates admin profiles for the hardcoded admin emails
-- Run after users have signed in via Google OAuth

-- Insert admin users (if they exist in auth.users but not in public.users)
INSERT INTO public.users (id, email, name, role, created_at, updated_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
  'admin'::user_role,
  NOW(),
  NOW()
FROM auth.users au
WHERE au.email IN ('inbal@voicely.co.il', 'info@compumit.com')
  AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = au.id)
ON CONFLICT (id) DO UPDATE SET role = 'admin', updated_at = NOW();

-- Update existing users to admin if they have admin emails
UPDATE public.users
SET role = 'admin', updated_at = NOW()
WHERE email IN ('inbal@voicely.co.il', 'info@compumit.com')
  AND role != 'admin';
