-- Table to sync expenses from Notion
CREATE TABLE IF NOT EXISTS notion_expenses_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_page_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  amount DECIMAL(12, 2) DEFAULT 0,
  category TEXT,
  description TEXT,
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_notion_expenses_sync_page_id ON notion_expenses_sync(notion_page_id);
CREATE INDEX IF NOT EXISTS idx_notion_expenses_sync_category ON notion_expenses_sync(category);

-- RLS
ALTER TABLE notion_expenses_sync ENABLE ROW LEVEL SECURITY;

-- Admin-only policy (skip if exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage notion expenses sync') THEN
    CREATE POLICY "Admins can manage notion expenses sync"
      ON notion_expenses_sync FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
  END IF;
END $$;
