-- =====================================================
-- VOICELY SHORT LINKS
-- =====================================================
-- Permanent short URLs for sharing with students
-- /s/abc123 -> student dashboard
-- /l/xyz789 -> lesson
-- /r/def456 -> recording
-- =====================================================

-- =====================================================
-- STEP 1: CREATE SHORT LINKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.short_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  link_type TEXT NOT NULL CHECK (link_type IN ('student', 'lesson', 'recording')),
  target_id UUID NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  click_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- =====================================================
-- STEP 2: CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_short_links_slug ON public.short_links(slug);
CREATE INDEX IF NOT EXISTS idx_short_links_type_target ON public.short_links(link_type, target_id);

-- =====================================================
-- STEP 3: ENABLE RLS
-- =====================================================

ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

-- Teachers and admins can manage short links
CREATE POLICY "Teachers can manage short links"
ON public.short_links FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'teacher')
  )
);

-- All authenticated users can read (for resolving links)
CREATE POLICY "Authenticated users can read short links"
ON public.short_links FOR SELECT
USING (auth.role() = 'authenticated');

-- Service role can manage all
CREATE POLICY "Service role can manage short links"
ON public.short_links FOR ALL
USING (auth.role() = 'service_role');

-- =====================================================
-- STEP 4: HELPER FUNCTION - GENERATE SLUG
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_short_slug()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 5: CREATE SHORT LINK FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_short_link(
  p_link_type TEXT,
  p_target_id UUID,
  p_custom_slug TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug TEXT;
  v_attempts INTEGER := 0;
BEGIN
  -- Check permissions (teachers and admins only)
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'teacher')
  ) AND auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: Teacher or admin role required';
  END IF;

  -- Validate link type
  IF p_link_type NOT IN ('student', 'lesson', 'recording') THEN
    RAISE EXCEPTION 'Invalid link type: %', p_link_type;
  END IF;

  -- Check if link already exists for this target
  SELECT slug INTO v_slug
  FROM public.short_links
  WHERE link_type = p_link_type AND target_id = p_target_id;

  IF v_slug IS NOT NULL THEN
    RETURN v_slug;
  END IF;

  -- Generate or use custom slug
  IF p_custom_slug IS NOT NULL THEN
    -- Check if custom slug is available
    IF EXISTS (SELECT 1 FROM public.short_links WHERE slug = p_custom_slug) THEN
      RAISE EXCEPTION 'Slug already in use: %', p_custom_slug;
    END IF;
    v_slug := p_custom_slug;
  ELSE
    -- Generate unique slug
    LOOP
      v_slug := public.generate_short_slug();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.short_links WHERE slug = v_slug);
      v_attempts := v_attempts + 1;
      IF v_attempts > 10 THEN
        RAISE EXCEPTION 'Could not generate unique slug after 10 attempts';
      END IF;
    END LOOP;
  END IF;

  -- Insert new short link
  INSERT INTO public.short_links (slug, link_type, target_id, created_by)
  VALUES (v_slug, p_link_type, p_target_id, auth.uid());

  RETURN v_slug;
END;
$$;

-- =====================================================
-- STEP 6: RESOLVE SHORT LINK FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.resolve_short_link(p_slug TEXT)
RETURNS TABLE (link_type TEXT, target_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update click count
  UPDATE public.short_links
  SET click_count = click_count + 1
  WHERE slug = p_slug;

  -- Return link info
  RETURN QUERY
  SELECT sl.link_type, sl.target_id
  FROM public.short_links sl
  WHERE sl.slug = p_slug;
END;
$$;

-- =====================================================
-- STEP 7: GET SHORT LINKS FOR TARGET
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_short_link(
  p_link_type TEXT,
  p_target_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug TEXT;
BEGIN
  SELECT slug INTO v_slug
  FROM public.short_links
  WHERE link_type = p_link_type AND target_id = p_target_id;

  RETURN v_slug;
END;
$$;

-- =====================================================
-- STEP 8: GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.generate_short_slug() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_short_link(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_short_link(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_short_link(TEXT, UUID) TO authenticated;
