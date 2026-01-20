-- =====================================================
-- FIX RLS FOR USERS TABLE
-- =====================================================
-- Allow authenticated users to read their own profile

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow admins to view all users
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
    auth.jwt()->>'email' IN ('inbal@voicely.co.il', 'info@compumit.com')
  );

-- Allow service role full access (for triggers and admin operations)
CREATE POLICY "Service role has full access"
  ON public.users
  FOR ALL
  USING (auth.role() = 'service_role');
