-- Student Name Mappings Table
-- Maps transcript student names to corrected/canonical names

CREATE TABLE IF NOT EXISTS student_name_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_name TEXT NOT NULL UNIQUE,        -- Raw name from transcript
  resolved_name TEXT,                         -- Corrected name (null = not yet resolved)
  crm_match TEXT,                            -- Suggested match from Notion CRM
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'auto_matched')),
  transcript_count INTEGER DEFAULT 0,         -- Number of transcripts with this name
  last_seen_at TIMESTAMPTZ,                  -- Most recent transcript date
  notes TEXT,                                 -- Admin notes
  updated_by UUID REFERENCES auth.users(id), -- Who made the change
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_student_name_mappings_original ON student_name_mappings(original_name);
CREATE INDEX IF NOT EXISTS idx_student_name_mappings_status ON student_name_mappings(status);
CREATE INDEX IF NOT EXISTS idx_student_name_mappings_resolved ON student_name_mappings(resolved_name) WHERE resolved_name IS NOT NULL;

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_student_name_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER student_name_mappings_updated_at
  BEFORE UPDATE ON student_name_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_student_name_mappings_updated_at();

-- History table for undo functionality
CREATE TABLE IF NOT EXISTS student_name_mapping_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mapping_id UUID REFERENCES student_name_mappings(id) ON DELETE CASCADE,
  previous_resolved_name TEXT,
  previous_status TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mapping_history_mapping_id ON student_name_mapping_history(mapping_id);
CREATE INDEX IF NOT EXISTS idx_mapping_history_changed_at ON student_name_mapping_history(changed_at DESC);

-- RLS Policies (admins only)
ALTER TABLE student_name_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_name_mapping_history ENABLE ROW LEVEL SECURITY;

-- Allow read for authenticated users
CREATE POLICY "Allow read for authenticated users" ON student_name_mappings
  FOR SELECT TO authenticated USING (true);

-- Allow all for admins (using hardcoded admin check pattern from other migrations)
CREATE POLICY "Allow all for admins" ON student_name_mappings
  FOR ALL TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

-- History policies
CREATE POLICY "Allow read history for authenticated" ON student_name_mapping_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert history for admins" ON student_name_mapping_history
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

-- Function to save history before update
CREATE OR REPLACE FUNCTION save_mapping_history()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.resolved_name IS DISTINCT FROM NEW.resolved_name
     OR OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO student_name_mapping_history (mapping_id, previous_resolved_name, previous_status, changed_by)
    VALUES (OLD.id, OLD.resolved_name, OLD.status, NEW.updated_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER mapping_history_trigger
  BEFORE UPDATE ON student_name_mappings
  FOR EACH ROW
  EXECUTE FUNCTION save_mapping_history();

-- Comment
COMMENT ON TABLE student_name_mappings IS 'Maps raw student names from transcripts to corrected canonical names';
