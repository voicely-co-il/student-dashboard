-- Add lesson pricing settings to cashflow
-- Prices are WITH VAT (18%)

-- Pricing settings
INSERT INTO cashflow_settings (setting_key, setting_value) VALUES
  ('price_1on1_new', '200'),           -- New 1:1 students: 200₪/lesson (45min)
  ('price_1on1_veteran', '180'),       -- Veteran 1:1 students: 180₪/lesson (45min)
  ('price_group_monthly', '410'),      -- Group students: 410₪/month
  ('vat_rate', '0.18'),                -- VAT rate: 18%
  ('income_tax_rate', '0.30'),         -- Estimated income tax: 30%
  ('social_security_rate', '0.12')     -- Social security (Bituach Leumi): 12%
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- Add tax expense categories if not exist
INSERT INTO cashflow_categories (name, type, sort_order, is_default) VALUES
  ('מע"מ לתשלום', 'expense', 20, true),
  ('מס הכנסה', 'expense', 21, true),
  ('ביטוח לאומי', 'expense', 22, true)
ON CONFLICT DO NOTHING;
