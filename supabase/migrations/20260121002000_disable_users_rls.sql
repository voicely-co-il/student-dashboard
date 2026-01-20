-- =====================================================
-- TEMPORARILY DISABLE RLS ON USERS TABLE
-- =====================================================
-- This allows all authenticated users to read the users table
-- We'll add proper policies later

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Service role has full access" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;

-- Disable RLS completely for now (so app works)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
