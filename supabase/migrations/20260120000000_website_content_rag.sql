-- Website Content RAG System
-- Stores content from voicely.co.il and juniors.voicely.co.il for semantic search

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Create enum for content sources
CREATE TYPE public.website_source AS ENUM ('voicely_main', 'voicely_juniors', 'blog');

-- Create enum for content types
CREATE TYPE public.content_type AS ENUM (
  'page',           -- Main pages (about, pricing, etc.)
  'service',        -- Service descriptions
  'course',         -- Course/program info
  'faq',            -- FAQ entries
  'testimonial',    -- Reviews/testimonials
  'blog_post',      -- Blog articles
  'pricing',        -- Pricing information
  'teacher_bio'     -- Teacher information
);

-- Main content table
CREATE TABLE public.website_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source identification
  source website_source NOT NULL,
  source_url TEXT NOT NULL,
  content_type content_type NOT NULL,

  -- Content
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,

  -- Structured metadata (JSONB for flexibility)
  metadata JSONB DEFAULT '{}'::jsonb,
  -- Example metadata:
  -- { "price": 200, "currency": "ILS", "age_group": "10-14", "tags": ["שירה", "ילדים"] }

  -- Sync tracking
  content_hash TEXT, -- MD5 hash to detect changes
  last_scraped_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

  -- Unique constraint on source URL
  UNIQUE(source_url)
);

-- Chunked content with embeddings for vector search
CREATE TABLE public.website_content_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES public.website_content(id) ON DELETE CASCADE NOT NULL,

  -- Chunk content
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,

  -- Vector embedding (1536 dimensions for OpenAI ada-002)
  embedding extensions.vector(1536),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

  UNIQUE(content_id, chunk_index)
);

-- Scrape log for tracking
CREATE TABLE public.website_scrape_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source website_source NOT NULL,
  status TEXT NOT NULL, -- 'started', 'completed', 'failed'
  pages_scraped INTEGER DEFAULT 0,
  pages_added INTEGER DEFAULT 0,
  pages_updated INTEGER DEFAULT 0,
  pages_failed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS (public read for website content)
ALTER TABLE public.website_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_content_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_scrape_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Website content is PUBLIC (anyone can read)
CREATE POLICY "Anyone can view website content"
  ON public.website_content FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view website content chunks"
  ON public.website_content_chunks FOR SELECT
  USING (true);

-- Only service role can modify website content
CREATE POLICY "Service role can manage website content"
  ON public.website_content FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage content chunks"
  ON public.website_content_chunks FOR ALL
  USING (auth.role() = 'service_role');

-- Authenticated users can view scrape log
CREATE POLICY "Authenticated can view scrape log"
  ON public.website_scrape_log FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage scrape log"
  ON public.website_scrape_log FOR ALL
  USING (auth.role() = 'service_role');

-- Create indexes
CREATE INDEX idx_website_content_source ON public.website_content(source);
CREATE INDEX idx_website_content_type ON public.website_content(content_type);
CREATE INDEX idx_website_content_source_url ON public.website_content(source_url);
CREATE INDEX idx_website_content_chunks_content_id ON public.website_content_chunks(content_id);

-- HNSW index for fast vector similarity search
CREATE INDEX idx_website_content_chunks_embedding ON public.website_content_chunks
  USING hnsw (embedding extensions.vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- GIN index for JSONB metadata queries
CREATE INDEX idx_website_content_metadata ON public.website_content USING GIN (metadata);

-- Add updated_at trigger
CREATE TRIGGER update_website_content_updated_at
  BEFORE UPDATE ON public.website_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Semantic search function for website content
CREATE OR REPLACE FUNCTION public.search_website_content(
  query_embedding extensions.vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_source website_source DEFAULT NULL,
  filter_content_type content_type DEFAULT NULL
)
RETURNS TABLE (
  chunk_id UUID,
  content_id UUID,
  source website_source,
  content_type content_type,
  title TEXT,
  chunk_content TEXT,
  source_url TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    wcc.id as chunk_id,
    wc.id as content_id,
    wc.source,
    wc.content_type,
    wc.title,
    wcc.content as chunk_content,
    wc.source_url,
    wc.metadata,
    1 - (wcc.embedding <=> query_embedding) as similarity
  FROM website_content_chunks wcc
  JOIN website_content wc ON wc.id = wcc.content_id
  WHERE
    (filter_source IS NULL OR wc.source = filter_source)
    AND (filter_content_type IS NULL OR wc.content_type = filter_content_type)
    AND wcc.embedding IS NOT NULL
    AND 1 - (wcc.embedding <=> query_embedding) > match_threshold
  ORDER BY wcc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to get all website content for a specific topic (without embedding)
CREATE OR REPLACE FUNCTION public.get_website_content_by_type(
  p_content_type content_type,
  p_source website_source DEFAULT NULL,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  source website_source,
  source_url TEXT,
  title TEXT,
  content TEXT,
  summary TEXT,
  metadata JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    wc.id,
    wc.source,
    wc.source_url,
    wc.title,
    wc.content,
    wc.summary,
    wc.metadata
  FROM website_content wc
  WHERE wc.content_type = p_content_type
    AND (p_source IS NULL OR wc.source = p_source)
  ORDER BY wc.updated_at DESC
  LIMIT p_limit;
$$;

-- Combined search function (transcripts + website content)
CREATE OR REPLACE FUNCTION public.search_all_content(
  query_embedding extensions.vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  include_transcripts BOOLEAN DEFAULT true,
  include_website BOOLEAN DEFAULT true,
  filter_student_id UUID DEFAULT NULL
)
RETURNS TABLE (
  source_type TEXT,
  chunk_id UUID,
  parent_id UUID,
  title TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  (
    -- Website content
    SELECT
      'website'::TEXT as source_type,
      wcc.id as chunk_id,
      wc.id as parent_id,
      wc.title,
      wcc.content,
      jsonb_build_object(
        'source', wc.source,
        'content_type', wc.content_type,
        'source_url', wc.source_url,
        'metadata', wc.metadata
      ) as metadata,
      1 - (wcc.embedding <=> query_embedding) as similarity
    FROM website_content_chunks wcc
    JOIN website_content wc ON wc.id = wcc.content_id
    WHERE include_website
      AND wcc.embedding IS NOT NULL
      AND 1 - (wcc.embedding <=> query_embedding) > match_threshold

    UNION ALL

    -- Transcript content
    SELECT
      'transcript'::TEXT as source_type,
      tc.id as chunk_id,
      t.id as parent_id,
      t.title,
      tc.content,
      jsonb_build_object(
        'student_id', tc.student_id,
        'lesson_date', tc.lesson_date
      ) as metadata,
      1 - (tc.embedding <=> query_embedding) as similarity
    FROM transcript_chunks tc
    JOIN transcripts t ON t.id = tc.transcript_id
    WHERE include_transcripts
      AND (filter_student_id IS NULL OR tc.student_id = filter_student_id)
      AND tc.embedding IS NOT NULL
      AND 1 - (tc.embedding <=> query_embedding) > match_threshold
  )
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Insert initial content from websites (this will be updated by scraper)
-- Static seed data for immediate use

INSERT INTO public.website_content (source, source_url, content_type, title, content, summary, metadata) VALUES

-- Main Voicely website content
('voicely_main', 'https://www.voicely.co.il/', 'page', 'דף הבית - Voicely',
'Voicely היא פלטפורמה ללימודי פיתוח קול מקוונים. המייסדים הם ענבל (מורה ווקאלית) ואיליה (יזם טכנולוגי), המשלבים חינוך מוזיקלי עם כלים טכנולוגיים. אנחנו מלמדים יותר מ-100 כוכבים ווקאליים.',
'פלטפורמה ללימודי שירה ופיתוח קול מקוונים',
'{"founders": ["ענבל", "איליה"], "students_count": 100}'::jsonb),

('voicely_main', 'https://www.voicely.co.il/services/private', 'service', 'שיעורים אישיים 1:1',
'שיעורים מותאמים אישית בזום עם ענבל. כל שיעור מותאם לצרכים הספציפיים שלך עם משוב מותאם אישית. שיעור נסיון של 20 דקות זמין להזמנה דרך הקלנדר באתר.',
'שיעורי שירה פרטיים בזום',
'{"type": "private", "trial_duration_minutes": 20, "platform": "zoom"}'::jsonb),

('voicely_main', 'https://www.voicely.co.il/services/group', 'service', 'שיעורים קבוצתיים',
'מפגשי זום קבוצתיים, מלאי אנרגיה ולמידה משותפת. השיעורים הקבוצתיים מאפשרים למידה חברתית ותרגול עם אחרים.',
'שיעורי שירה קבוצתיים בזום',
'{"type": "group", "platform": "zoom"}'::jsonb),

('voicely_main', 'https://www.voicely.co.il/ages/kids', 'course', 'שיעורים לילדים מגיל 6',
'חוויה כיפית ואינטראקטיבית לילדים. השיעורים מותאמים לגיל ומשלבים משחק עם למידה.',
'שיעורי שירה לילדים',
'{"age_min": 6, "style": "interactive"}'::jsonb),

('voicely_main', 'https://www.voicely.co.il/ages/teens', 'course', 'שיעורים לבני נוער',
'שליטה קולית וחיזוק ביטחון עצמי. השיעורים עוזרים לבני נוער לפתח את הקול שלהם ולהרגיש בטוחים יותר.',
'שיעורי שירה לנוער',
'{"age_group": "teens", "focus": ["vocal_control", "confidence"]}'::jsonb),

('voicely_main', 'https://www.voicely.co.il/ages/adults', 'course', 'שיעורים למבוגרים',
'שחרור מתח וביטוי עצמי. השירה היא דרך נפלאה להירגע ולבטא את עצמך.',
'שיעורי שירה למבוגרים',
'{"age_group": "adults", "focus": ["stress_relief", "self_expression"]}'::jsonb),

('voicely_main', 'https://www.voicely.co.il/ages/seniors', 'course', 'שיעורים לגיל 60+',
'שירה מחזקת את המוח, משפרת את הזיכרון. פעילות מועילה לבריאות הקוגניטיבית.',
'שיעורי שירה לגיל הזהב',
'{"age_min": 60, "benefits": ["brain_health", "memory", "social"]}'::jsonb),

('voicely_main', 'https://www.voicely.co.il/shop/microphone', 'pricing', 'מיקרופון',
'מיקרופון איכותי לשיעורי שירה מקוונים. מחיר: ₪200',
'מיקרופון לשיעורי שירה',
'{"price": 200, "currency": "ILS", "category": "equipment"}'::jsonb),

('voicely_main', 'https://www.voicely.co.il/shop/headphones', 'pricing', 'אוזניות',
'אוזניות איכותיות לשיעורי שירה. מחיר: ₪350',
'אוזניות לשיעורי שירה',
'{"price": 350, "currency": "ILS", "category": "equipment"}'::jsonb),

('voicely_main', 'https://www.voicely.co.il/shop/lights', 'pricing', 'אורות טבעיים לצילום',
'תאורה איכותית לשיעורים בזום. מחיר: ₪100',
'תאורה לשיעורי שירה',
'{"price": 100, "currency": "ILS", "category": "equipment"}'::jsonb),

('voicely_main', 'https://www.voicely.co.il/benefits', 'page', 'יתרונות הלמידה המקוונת',
'1. עלות מופחתת - חסכון בזמן והוצאות נסיעה. 2. נגישות - שיעורים מתועדים עם תובנות אישיות. 3. נוחות - לימוד מהבית בשעות גמישות.',
'יתרונות לימוד שירה אונליין',
'{"benefits": ["cost_savings", "accessibility", "convenience", "recorded_lessons"]}'::jsonb),

-- Juniors website content
('voicely_juniors', 'https://juniors.voicely.co.il/', 'page', 'דף הבית - Voicely Juniors',
'שיעורי שירה חיים בזום לילדים 10-14 בקבוצות קטנות עם ליווי אישי. השיעורים כוללים דיקציה, נשימה והרמוניה.',
'שיעורי שירה לילדים ונוער',
'{"age_min": 10, "age_max": 14, "format": "small_groups", "skills": ["diction", "breathing", "harmony"]}'::jsonb),

('voicely_juniors', 'https://juniors.voicely.co.il/program', 'course', 'תוכנית הלימודים - Juniors',
'קבוצות קטנות עם ליווי אישי. הילדים לומדים דיקציה (הגייה נכונה), נשימה (טכניקות נשימה לשירה), והרמוניה (שירה רב קולית).',
'תוכנית שירה לילדים',
'{"age_min": 10, "age_max": 14, "group_size": "small", "curriculum": ["diction", "breathing", "harmony"]}'::jsonb);

-- Add testimonials
INSERT INTO public.website_content (source, source_url, content_type, title, content, summary, metadata) VALUES
('voicely_main', 'https://www.voicely.co.il/testimonials/1', 'testimonial', 'המלצה - הורה',
'הילדה רק מחכה להגיע לכיתה',
'המלצה חיובית מהורה',
'{"source": "google", "rating": 5}'::jsonb),

('voicely_main', 'https://www.voicely.co.il/testimonials/2', 'testimonial', 'המלצה - תלמידה',
'ענבל היא אישיות אמפטית רגישה',
'המלצה חיובית מתלמידה',
'{"source": "google", "rating": 5}'::jsonb);

-- Teacher bio
INSERT INTO public.website_content (source, source_url, content_type, title, content, summary, metadata) VALUES
('voicely_main', 'https://www.voicely.co.il/about/inbal', 'teacher_bio', 'ענבל - מורה ווקאלית',
'ענבל היא מורה ווקאלית מנוסה ואחת ממייסדות Voicely. היא משלבת חינוך מוזיקלי עם גישה אישית וחמה לכל תלמיד.',
'מייסדת ומורה ראשית',
'{"role": "founder", "specialty": "vocal_coaching"}'::jsonb);
