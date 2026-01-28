-- Enable RLS on cashflow tables
ALTER TABLE cashflow_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashflow_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashflow_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "cashflow_categories_select" ON cashflow_categories;
DROP POLICY IF EXISTS "cashflow_entries_select" ON cashflow_entries;
DROP POLICY IF EXISTS "cashflow_settings_select" ON cashflow_settings;
DROP POLICY IF EXISTS "cashflow_categories_all" ON cashflow_categories;
DROP POLICY IF EXISTS "cashflow_entries_all" ON cashflow_entries;
DROP POLICY IF EXISTS "cashflow_settings_all" ON cashflow_settings;

-- Create public read policies (admin area - internal tool)
CREATE POLICY "cashflow_categories_select" ON cashflow_categories FOR SELECT USING (true);
CREATE POLICY "cashflow_entries_select" ON cashflow_entries FOR SELECT USING (true);
CREATE POLICY "cashflow_settings_select" ON cashflow_settings FOR SELECT USING (true);

-- Create public write policies
CREATE POLICY "cashflow_categories_all" ON cashflow_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "cashflow_entries_all" ON cashflow_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "cashflow_settings_all" ON cashflow_settings FOR ALL USING (true) WITH CHECK (true);
