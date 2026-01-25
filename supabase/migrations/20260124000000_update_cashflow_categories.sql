-- Update cashflow expense categories to match actual Voicely expenses
-- Based on Notion expenses table (דאשבורד פיננסי / טבלת הוצאות ראשית)

-- Remove old generic categories that don't match Voicely's actual expenses
DELETE FROM cashflow_categories WHERE type = 'expense' AND is_default = true;

-- Insert actual expense categories matching the business
INSERT INTO cashflow_categories (name, type, sort_order, is_default) VALUES
  -- שיווק ופרסום
  ('Google Ads', 'expense', 1, true),
  ('Facebook Ads', 'expense', 2, true),
  ('Facebook Meta Verified', 'expense', 3, true),
  ('Youtube Premium', 'expense', 4, true),
  -- תשתיות טכנולוגיות
  ('Supabase', 'expense', 5, true),
  ('Digital Ocean', 'expense', 6, true),
  ('Webflow - אתר', 'expense', 7, true),
  ('TimeoS - תמלולים', 'expense', 8, true),
  -- תקשורת ומשרד
  ('Google Workspace', 'expense', 9, true),
  ('Zoom', 'expense', 10, true),
  -- תשלומים ועמלות
  ('עמלות כרטיסי אשראי (Morning)', 'expense', 11, true),
  -- כללי
  ('שכירות סטודיו', 'expense', 12, true),
  ('ביטוח', 'expense', 13, true),
  ('מיסים ואגרות', 'expense', 14, true),
  ('הוצאות אחרות', 'expense', 15, true);
