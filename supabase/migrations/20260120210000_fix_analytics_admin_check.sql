-- =====================================================
-- FIX: Allow service_role to access analytics functions
-- =====================================================

-- Update is_admin function to also allow service_role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Service role always has access
  IF auth.role() = 'service_role' THEN
    RETURN TRUE;
  END IF;

  -- Check if user is admin in users table
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate analytics functions with updated check

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
  -- Check admin access (now includes service_role)
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Calculate base metrics
  SELECT
    COUNT(*),
    COUNT(DISTINCT student_name),
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
