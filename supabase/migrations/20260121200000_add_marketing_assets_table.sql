-- Marketing Assets Table for AI-generated content
CREATE TABLE IF NOT EXISTS marketing_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Creator info
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Asset type
  asset_type TEXT NOT NULL CHECK (asset_type IN ('image', 'video', 'audio', 'voice')),

  -- AI Service used
  service TEXT NOT NULL, -- 'astria', 'heygen', 'elevenlabs', 'runway', etc.

  -- Generation details
  prompt TEXT,
  negative_prompt TEXT,
  settings JSONB DEFAULT '{}', -- aspect_ratio, model, etc.

  -- Result
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  url TEXT, -- Final asset URL
  thumbnail_url TEXT,

  -- Metadata
  title TEXT,
  description TEXT,
  tags TEXT[],

  -- Usage tracking
  used_in_campaigns TEXT[], -- Track where this asset was used

  -- Cost tracking (for budget monitoring)
  estimated_cost_usd DECIMAL(10, 4) DEFAULT 0
);

-- Indexes
CREATE INDEX idx_marketing_assets_type ON marketing_assets(asset_type);
CREATE INDEX idx_marketing_assets_status ON marketing_assets(status);
CREATE INDEX idx_marketing_assets_created_at ON marketing_assets(created_at DESC);
CREATE INDEX idx_marketing_assets_created_by ON marketing_assets(created_by);

-- RLS
ALTER TABLE marketing_assets ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admins can manage marketing assets"
  ON marketing_assets
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Updated at trigger
CREATE TRIGGER update_marketing_assets_updated_at
  BEFORE UPDATE ON marketing_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
