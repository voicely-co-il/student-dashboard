-- =====================================================
-- VOICELY ANALYTICS MODULE
-- =====================================================
-- Materialized views and tables for admin analytics
-- on 828+ lesson transcripts with pgvector
-- =====================================================

-- =====================================================
-- STEP 0: ENSURE HELPER FUNCTIONS EXIST
-- =====================================================

-- Create is_admin function if it doesn't exist
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- =====================================================
-- STEP 1: ANALYTICS CACHE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.analytics_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage analytics cache"
ON public.analytics_cache FOR ALL
USING (public.is_admin());

CREATE POLICY "Service role can manage analytics cache"
ON public.analytics_cache FOR ALL
USING (auth.role() = 'service_role');

-- =====================================================
-- STEP 2: MATERIALIZED VIEWS FOR TOPIC STATS
-- =====================================================

-- Topic statistics aggregation
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_topic_stats AS
SELECT
  unnest(ti.key_topics) AS topic,
  COUNT(*) AS mention_count,
  COUNT(DISTINCT t.student_name) AS student_count,
  MIN(t.lesson_date) AS first_seen,
  MAX(t.lesson_date) AS last_seen
FROM public.transcript_insights ti
JOIN public.transcripts t ON t.id = ti.transcript_id
WHERE ti.key_topics IS NOT NULL
  AND array_length(ti.key_topics, 1) > 0
GROUP BY 1
ORDER BY mention_count DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_topic_stats_topic
ON public.mv_topic_stats (topic);

-- =====================================================
-- STEP 3: MATERIALIZED VIEWS FOR SKILL STATS
-- =====================================================

-- Skill statistics aggregation
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_skill_stats AS
SELECT
  unnest(ti.skills_practiced) AS skill,
  COUNT(*) AS practice_count,
  COUNT(DISTINCT t.student_name) AS student_count,
  MIN(t.lesson_date) AS first_seen,
  MAX(t.lesson_date) AS last_seen
FROM public.transcript_insights ti
JOIN public.transcripts t ON t.id = ti.transcript_id
WHERE ti.skills_practiced IS NOT NULL
  AND array_length(ti.skills_practiced, 1) > 0
GROUP BY 1
ORDER BY practice_count DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_skill_stats_skill
ON public.mv_skill_stats (skill);

-- =====================================================
-- STEP 4: MATERIALIZED VIEW FOR MONTHLY TRENDS
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_monthly_topic_trends AS
SELECT
  unnest(ti.key_topics) AS topic,
  DATE_TRUNC('month', t.lesson_date) AS month,
  COUNT(*) AS mention_count,
  COUNT(DISTINCT t.student_name) AS student_count
FROM public.transcript_insights ti
JOIN public.transcripts t ON t.id = ti.transcript_id
WHERE t.lesson_date IS NOT NULL
  AND ti.key_topics IS NOT NULL
GROUP BY 1, 2
ORDER BY month DESC, mention_count DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_monthly_topic_trends
ON public.mv_monthly_topic_trends (topic, month);

-- Skill trends over time
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_monthly_skill_trends AS
SELECT
  unnest(ti.skills_practiced) AS skill,
  DATE_TRUNC('month', t.lesson_date) AS month,
  COUNT(*) AS practice_count,
  COUNT(DISTINCT t.student_name) AS student_count
FROM public.transcript_insights ti
JOIN public.transcripts t ON t.id = ti.transcript_id
WHERE t.lesson_date IS NOT NULL
  AND ti.skills_practiced IS NOT NULL
GROUP BY 1, 2
ORDER BY month DESC, practice_count DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_monthly_skill_trends
ON public.mv_monthly_skill_trends (skill, month);

-- =====================================================
-- STEP 5: MATERIALIZED VIEW FOR MOOD DISTRIBUTION
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_mood_stats AS
SELECT
  ti.student_mood AS mood,
  COUNT(*) AS count,
  COUNT(DISTINCT t.student_name) AS student_count
FROM public.transcript_insights ti
JOIN public.transcripts t ON t.id = ti.transcript_id
WHERE ti.student_mood IS NOT NULL
  AND ti.student_mood != ''
GROUP BY 1
ORDER BY count DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_mood_stats_mood
ON public.mv_mood_stats (mood);

-- =====================================================
-- STEP 6: RPC FUNCTION FOR ANALYTICS OVERVIEW
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_analytics_overview(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_total_transcripts INTEGER;
  v_total_students INTEGER;
  v_total_lessons INTEGER;
  v_avg_duration NUMERIC;
  v_total_words BIGINT;
BEGIN
  -- Check admin access
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Calculate base metrics
  SELECT
    COUNT(*),
    COUNT(DISTINCT student_id),
    AVG(duration_minutes),
    SUM(word_count)
  INTO
    v_total_transcripts,
    v_total_students,
    v_avg_duration,
    v_total_words
  FROM transcripts
  WHERE
    (p_start_date IS NULL OR lesson_date >= p_start_date)
    AND (p_end_date IS NULL OR lesson_date <= p_end_date);

  -- Count lessons
  SELECT COUNT(*) INTO v_total_lessons
  FROM lessons
  WHERE
    (p_start_date IS NULL OR scheduled_at >= p_start_date)
    AND (p_end_date IS NULL OR scheduled_at <= p_end_date);

  -- Build result object
  SELECT jsonb_build_object(
    'totalTranscripts', v_total_transcripts,
    'totalStudents', v_total_students,
    'totalLessons', v_total_lessons,
    'avgDurationMinutes', ROUND(COALESCE(v_avg_duration, 0), 1),
    'totalWords', COALESCE(v_total_words, 0),
    'topTopics', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('topic', topic, 'count', mention_count)
        ORDER BY mention_count DESC
      ), '[]'::jsonb)
      FROM (SELECT topic, mention_count FROM mv_topic_stats LIMIT 10) t
    ),
    'topSkills', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('skill', skill, 'count', practice_count)
        ORDER BY practice_count DESC
      ), '[]'::jsonb)
      FROM (SELECT skill, practice_count FROM mv_skill_stats LIMIT 10) s
    ),
    'moodDistribution', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('mood', mood, 'count', count)
        ORDER BY count DESC
      ), '[]'::jsonb)
      FROM mv_mood_stats
    ),
    'dateRange', jsonb_build_object(
      'start', p_start_date,
      'end', p_end_date
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- =====================================================
-- STEP 7: RPC FUNCTION FOR TRENDS ANALYSIS
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_analytics_trends(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_granularity TEXT DEFAULT 'month'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Check admin access
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Validate granularity
  IF p_granularity NOT IN ('week', 'month') THEN
    p_granularity := 'month';
  END IF;

  SELECT jsonb_build_object(
    'topicTrends', (
      SELECT COALESCE(jsonb_agg(topic_data), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
          'topic', topic,
          'timeline', (
            SELECT jsonb_agg(
              jsonb_build_object('period', month, 'count', mention_count)
              ORDER BY month
            )
            FROM mv_monthly_topic_trends mtt
            WHERE mtt.topic = outer_topics.topic
              AND (p_start_date IS NULL OR mtt.month >= DATE_TRUNC('month', p_start_date))
              AND (p_end_date IS NULL OR mtt.month <= DATE_TRUNC('month', p_end_date))
          ),
          'totalCount', SUM(mention_count)
        ) AS topic_data
        FROM mv_monthly_topic_trends outer_topics
        WHERE (p_start_date IS NULL OR month >= DATE_TRUNC('month', p_start_date))
          AND (p_end_date IS NULL OR month <= DATE_TRUNC('month', p_end_date))
        GROUP BY topic
        ORDER BY SUM(mention_count) DESC
        LIMIT 15
      ) aggregated
    ),
    'skillTrends', (
      SELECT COALESCE(jsonb_agg(skill_data), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
          'skill', skill,
          'timeline', (
            SELECT jsonb_agg(
              jsonb_build_object('period', month, 'count', practice_count)
              ORDER BY month
            )
            FROM mv_monthly_skill_trends mst
            WHERE mst.skill = outer_skills.skill
              AND (p_start_date IS NULL OR mst.month >= DATE_TRUNC('month', p_start_date))
              AND (p_end_date IS NULL OR mst.month <= DATE_TRUNC('month', p_end_date))
          ),
          'totalCount', SUM(practice_count)
        ) AS skill_data
        FROM mv_monthly_skill_trends outer_skills
        WHERE (p_start_date IS NULL OR month >= DATE_TRUNC('month', p_start_date))
          AND (p_end_date IS NULL OR month <= DATE_TRUNC('month', p_end_date))
        GROUP BY skill
        ORDER BY SUM(practice_count) DESC
        LIMIT 15
      ) aggregated
    ),
    'lessonsOverTime', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('period', period, 'count', count)
        ORDER BY period
      ), '[]'::jsonb)
      FROM (
        SELECT
          DATE_TRUNC(p_granularity, lesson_date) AS period,
          COUNT(*) AS count
        FROM transcripts
        WHERE lesson_date IS NOT NULL
          AND (p_start_date IS NULL OR lesson_date >= p_start_date)
          AND (p_end_date IS NULL OR lesson_date <= p_end_date)
        GROUP BY 1
        ORDER BY 1
      ) lessons_agg
    ),
    'granularity', p_granularity
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- =====================================================
-- STEP 8: FUNCTION TO REFRESH MATERIALIZED VIEWS
-- =====================================================

CREATE OR REPLACE FUNCTION public.refresh_analytics_views()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check admin access
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_topic_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_skill_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_topic_trends;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_skill_trends;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_mood_stats;
END;
$$;

-- =====================================================
-- STEP 9: GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.get_analytics_overview TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_analytics_trends TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_analytics_views TO authenticated;

-- Grant select on materialized views to authenticated users
-- (RPC functions check is_admin() internally)
GRANT SELECT ON public.mv_topic_stats TO authenticated;
GRANT SELECT ON public.mv_skill_stats TO authenticated;
GRANT SELECT ON public.mv_monthly_topic_trends TO authenticated;
GRANT SELECT ON public.mv_monthly_skill_trends TO authenticated;
GRANT SELECT ON public.mv_mood_stats TO authenticated;

-- =====================================================
-- STEP 10: ADD INDEX FOR ANALYTICS CACHE EXPIRY
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires
ON public.analytics_cache (expires_at)
WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_cache_key
ON public.analytics_cache (cache_key);
