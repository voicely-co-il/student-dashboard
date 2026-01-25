-- Cashflow Tracker: Categories, Entries, and Settings
-- 13-Week Weekly + 12-Month Monthly cashflow projection

-- Categories table (income/expense types)
CREATE TABLE IF NOT EXISTS cashflow_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'other_expense')),
  sort_order INT NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Entries table (amounts per category per period)
CREATE TABLE IF NOT EXISTS cashflow_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES cashflow_categories(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
  period_start DATE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (category_id, period_type, period_start)
);

-- Settings table (opening balance, alert threshold, etc.)
CREATE TABLE IF NOT EXISTS cashflow_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_cashflow_categories_type ON cashflow_categories(type);
CREATE INDEX idx_cashflow_entries_period ON cashflow_entries(period_type, period_start);
CREATE INDEX idx_cashflow_entries_category ON cashflow_entries(category_id);

-- RLS
ALTER TABLE cashflow_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashflow_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashflow_settings ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can manage cashflow categories"
  ON cashflow_categories FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage cashflow entries"
  ON cashflow_entries FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage cashflow settings"
  ON cashflow_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Updated at trigger for entries
CREATE TRIGGER update_cashflow_entries_updated_at
  BEFORE UPDATE ON cashflow_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cashflow_settings_updated_at
  BEFORE UPDATE ON cashflow_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Default settings
INSERT INTO cashflow_settings (setting_key, setting_value) VALUES
  ('opening_balance_weekly', '0'),
  ('opening_balance_monthly', '0'),
  ('alert_minimum', '0'),
  ('weekly_start_date', '2026-01-19')
ON CONFLICT (setting_key) DO NOTHING;

-- Default income categories
INSERT INTO cashflow_categories (name, type, sort_order, is_default) VALUES
  ('שיעורים פרטיים', 'income', 1, true),
  ('שיעורים קבוצתיים', 'income', 2, true),
  ('מנויים חודשיים', 'income', 3, true),
  ('קורסים דיגיטליים', 'income', 4, true),
  ('אירועים והופעות', 'income', 5, true),
  ('הכנסות אחרות', 'income', 6, true);

-- Default expense categories
INSERT INTO cashflow_categories (name, type, sort_order, is_default) VALUES
  ('שכירות סטודיו', 'expense', 1, true),
  ('פרסום ושיווק', 'expense', 2, true),
  ('ציוד וכלים', 'expense', 3, true),
  ('תוכנה ומנויים דיגיטליים', 'expense', 4, true),
  ('ביטוח', 'expense', 5, true),
  ('מיסים ואגרות', 'expense', 6, true),
  ('נסיעות', 'expense', 7, true),
  ('חשמל ומים', 'expense', 8, true),
  ('טלפון ואינטרנט', 'expense', 9, true),
  ('משכורות', 'expense', 10, true),
  ('קבלני משנה', 'expense', 11, true),
  ('ציוד משרדי', 'expense', 12, true),
  ('אחזקה ותיקונים', 'expense', 13, true),
  ('הוצאות אחרות', 'expense', 14, true);

-- Default other expense categories
INSERT INTO cashflow_categories (name, type, sort_order, is_default) VALUES
  ('החזרי הלוואות', 'other_expense', 1, true),
  ('רכישות הון', 'other_expense', 2, true),
  ('משיכת בעלים', 'other_expense', 3, true);
