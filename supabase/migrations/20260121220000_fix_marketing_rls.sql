-- Fix RLS policies for marketing_scenarios and marketing_models
-- Allow public read access for active items

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read active scenarios" ON marketing_scenarios;
DROP POLICY IF EXISTS "Admins can manage scenarios" ON marketing_scenarios;
DROP POLICY IF EXISTS "Anyone can read active models" ON marketing_models;
DROP POLICY IF EXISTS "Admins can manage models" ON marketing_models;

-- Scenarios: Allow anyone (including anon) to read active
CREATE POLICY "Public read active scenarios"
  ON marketing_scenarios FOR SELECT
  USING (is_active = true);

-- Scenarios: Admins can do everything
CREATE POLICY "Admins manage scenarios"
  ON marketing_scenarios FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Models: Allow anyone (including anon) to read active
CREATE POLICY "Public read active models"
  ON marketing_models FOR SELECT
  USING (is_active = true);

-- Models: Admins can do everything
CREATE POLICY "Admins manage models"
  ON marketing_models FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );
