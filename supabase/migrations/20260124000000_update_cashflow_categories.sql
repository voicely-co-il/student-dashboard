-- Update cashflow expense categories to match actual Voicely expenses
-- Based on Notion expenses table

-- Remove old generic categories that don't match Voicely's actual expenses
DELETE FROM cashflow_categories WHERE type = 'expense' AND is_default = true;

-- Insert actual expense categories matching the business
INSERT INTO cashflow_categories (name, type, sort_order, is_default) VALUES
  -- Marketing & Advertising
  ('Google Ads', 'expense', 1, true),
  ('Facebook Ads', 'expense', 2, true),
  ('Facebook Meta Verified', 'expense', 3, true),
  ('Youtube Premium', 'expense', 4, true),
  -- Tech Infrastructure
  ('Supabase', 'expense', 5, true),
  ('Digital Ocean', 'expense', 6, true),
  ('Webflow - Website', 'expense', 7, true),
  ('TimeoS - Transcriptions', 'expense', 8, true),
  -- Communication & Office
  ('Google Workspace', 'expense', 9, true),
  ('Zoom', 'expense', 10, true),
  -- Payments & Fees
  ('Credit Card Fees (Morning)', 'expense', 11, true),
  -- General
  ('Studio Rent', 'expense', 12, true),
  ('Insurance', 'expense', 13, true),
  ('Taxes & Fees', 'expense', 14, true),
  ('Other Expenses', 'expense', 15, true);
