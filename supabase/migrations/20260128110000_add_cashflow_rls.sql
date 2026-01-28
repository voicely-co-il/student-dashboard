-- Add RLS policies for cashflow tables to allow admin access

-- Enable RLS on cashflow tables (if not already enabled)
ALTER TABLE IF EXISTS cashflow_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cashflow_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cashflow_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin can read cashflow_categories" ON cashflow_categories;
DROP POLICY IF EXISTS "Admin can insert cashflow_categories" ON cashflow_categories;
DROP POLICY IF EXISTS "Admin can update cashflow_categories" ON cashflow_categories;
DROP POLICY IF EXISTS "Admin can delete cashflow_categories" ON cashflow_categories;

DROP POLICY IF EXISTS "Admin can read cashflow_entries" ON cashflow_entries;
DROP POLICY IF EXISTS "Admin can insert cashflow_entries" ON cashflow_entries;
DROP POLICY IF EXISTS "Admin can update cashflow_entries" ON cashflow_entries;
DROP POLICY IF EXISTS "Admin can delete cashflow_entries" ON cashflow_entries;

DROP POLICY IF EXISTS "Admin can read cashflow_settings" ON cashflow_settings;
DROP POLICY IF EXISTS "Admin can manage cashflow_settings" ON cashflow_settings;

-- Create policies for cashflow_categories
CREATE POLICY "Admin can read cashflow_categories"
  ON cashflow_categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin can insert cashflow_categories"
  ON cashflow_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin can update cashflow_categories"
  ON cashflow_categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin can delete cashflow_categories"
  ON cashflow_categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create policies for cashflow_entries
CREATE POLICY "Admin can read cashflow_entries"
  ON cashflow_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin can insert cashflow_entries"
  ON cashflow_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin can update cashflow_entries"
  ON cashflow_entries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin can delete cashflow_entries"
  ON cashflow_entries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create policies for cashflow_settings
CREATE POLICY "Admin can read cashflow_settings"
  ON cashflow_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin can manage cashflow_settings"
  ON cashflow_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
