-- Marketing Scenarios (Quick Templates)
CREATE TABLE IF NOT EXISTS marketing_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_he TEXT NOT NULL,
  emoji TEXT,
  prompt_template TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Marketing Models (Trained Characters)
CREATE TABLE IF NOT EXISTS marketing_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_he TEXT NOT NULL,
  token TEXT NOT NULL, -- e.g., "ohwx woman", "sks man"
  tune_id TEXT NOT NULL, -- Astria tune ID
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_marketing_scenarios_active ON marketing_scenarios(is_active, sort_order);
CREATE INDEX idx_marketing_models_active ON marketing_models(is_active);

-- RLS
ALTER TABLE marketing_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_models ENABLE ROW LEVEL SECURITY;

-- Admin can manage, everyone can read
CREATE POLICY "Anyone can read active scenarios"
  ON marketing_scenarios FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage scenarios"
  ON marketing_scenarios FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Anyone can read active models"
  ON marketing_models FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage models"
  ON marketing_models FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Insert default scenarios (Voicely templates)
INSERT INTO marketing_scenarios (name, name_he, emoji, prompt_template, category, sort_order) VALUES
  ('professional', 'מקצועי', '👔', 'professional portrait in a modern vocal studio, high quality, studio lighting, confident pose', 'portrait', 1),
  ('casual', 'קז''ואל', '👕', 'casual relaxed portrait, natural lighting, comfortable clothing, friendly smile, approachable', 'portrait', 2),
  ('artistic', 'אמנותי', '🎨', 'artistic creative portrait, dramatic lighting, unique composition, expressive mood, musical atmosphere', 'creative', 3),
  ('nature', 'טבע', '🌿', 'outdoor nature portrait, natural environment, golden hour lighting, serene atmosphere, peaceful', 'outdoor', 4),
  ('urban', 'עירוני', '🏙️', 'urban city portrait, modern architecture background, street style, dynamic energy, contemporary', 'outdoor', 5),
  ('vintage', 'וינטג''', '📸', 'vintage retro portrait, classic film aesthetic, warm tones, timeless style, nostalgic', 'creative', 6),
  ('teaching', 'שיעור', '🎤', 'teaching vocal lesson, online meeting setup, professional microphone, warm expression, engaging', 'voicely', 7),
  ('performance', 'הופעה', '🎵', 'performing on stage, concert lighting, passionate expression, musical energy, spotlight', 'voicely', 8),
  ('social', 'רשתות', '📱', 'social media ready portrait, vibrant colors, modern aesthetic, eye-catching, scroll-stopping', 'marketing', 9);

-- Insert Voicely models (Inbal & Ilya only)
INSERT INTO marketing_models (name, name_he, token, tune_id, thumbnail_url) VALUES
  ('inbal', 'ענבל', 'ohwx woman', '2044689', '/avatars/inbal.jpg'),
  ('ilya', 'איליה', 'sks man', '2686043', '/avatars/ilya.jpg');
