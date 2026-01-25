-- Fix RLS policy for marketing_assets to check is_active on user_roles

-- Drop existing policy
DROP POLICY IF EXISTS "Admins can manage marketing assets" ON marketing_assets;

-- Recreate with is_active check
CREATE POLICY "Admins can manage marketing assets"
  ON marketing_assets
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND is_active = true
    )
  );
