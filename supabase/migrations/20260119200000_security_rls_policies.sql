-- =====================================================
-- VOICELY SECURITY: Row Level Security Policies
-- =====================================================
-- This migration adds comprehensive RLS policies for
-- protecting sensitive student and lesson data.
-- =====================================================

-- =====================================================
-- STEP 1: DROP ALL EXISTING POLICIES
-- =====================================================

-- achievements
DROP POLICY IF EXISTS "Admins can manage achievements" ON achievements;
DROP POLICY IF EXISTS "Anyone can view active achievements" ON achievements;
DROP POLICY IF EXISTS "Anyone can view achievements" ON achievements;

-- analytics_events
DROP POLICY IF EXISTS "Instructors can view student events" ON analytics_events;
DROP POLICY IF EXISTS "Users can create their own events" ON analytics_events;
DROP POLICY IF EXISTS "Users can view their own events" ON analytics_events;

-- embeddings
DROP POLICY IF EXISTS "Users can view own embeddings" ON embeddings;

-- groups
DROP POLICY IF EXISTS "Students can view their groups" ON groups;
DROP POLICY IF EXISTS "Teachers can manage groups" ON groups;

-- leaderboard_entries
DROP POLICY IF EXISTS "Anyone can view leaderboard entries" ON leaderboard_entries;
DROP POLICY IF EXISTS "Users can update their own entries" ON leaderboard_entries;

-- leaderboards
DROP POLICY IF EXISTS "Admins can manage leaderboards" ON leaderboards;
DROP POLICY IF EXISTS "Anyone can active leaderboards" ON leaderboards;
DROP POLICY IF EXISTS "Anyone can view leaderboards" ON leaderboards;
DROP POLICY IF EXISTS "Anyone can view active leaderboards" ON leaderboards;

-- learning_insights
DROP POLICY IF EXISTS "Users can view own insights" ON learning_insights;
DROP POLICY IF EXISTS "Users can update own insights" ON learning_insights;
DROP POLICY IF EXISTS "Teachers can view student insights" ON learning_insights;
DROP POLICY IF EXISTS "Admins can manage all insights" ON learning_insights;

-- profiles
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

-- recordings
DROP POLICY IF EXISTS "Users can manage own recordings" ON recordings;
DROP POLICY IF EXISTS "Users can view own recordings" ON recordings;
DROP POLICY IF EXISTS "Users can insert own recordings" ON recordings;
DROP POLICY IF EXISTS "Users can delete own recordings" ON recordings;
DROP POLICY IF EXISTS "Teachers can view student recordings" ON recordings;
DROP POLICY IF EXISTS "Admins can manage all recordings" ON recordings;

-- search_history
DROP POLICY IF EXISTS "Users can manage own searches" ON search_history;

-- transcriptions
DROP POLICY IF EXISTS "Users can view own transcriptions" ON transcriptions;
DROP POLICY IF EXISTS "Teachers can view student transcriptions" ON transcriptions;
DROP POLICY IF EXISTS "Admins can view all transcriptions" ON transcriptions;
DROP POLICY IF EXISTS "Service role can manage transcriptions" ON transcriptions;

-- user_achievements
DROP POLICY IF EXISTS "Users can earn achievements" ON user_achievements;
DROP POLICY IF EXISTS "Users can view their own achievements" ON user_achievements;
DROP POLICY IF EXISTS "Users can view own achievements" ON user_achievements;
DROP POLICY IF EXISTS "Service can manage achievements" ON user_achievements;

-- user_progress
DROP POLICY IF EXISTS "Users can create own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can view own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON user_progress;
DROP POLICY IF EXISTS "Teachers can view student progress" ON user_progress;
DROP POLICY IF EXISTS "Admins can manage all progress" ON user_progress;
DROP POLICY IF EXISTS "Service role can manage progress" ON user_progress;

-- user_recordings
DROP POLICY IF EXISTS "Users can create own recordings" ON user_recordings;
DROP POLICY IF EXISTS "Users can delete own recordings" ON user_recordings;
DROP POLICY IF EXISTS "Users can update own recordings" ON user_recordings;
DROP POLICY IF EXISTS "Users can view own recordings" ON user_recordings;

-- user_roles
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;

-- user_sessions
DROP POLICY IF EXISTS "Instructors can view student sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can create their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can view their own sessions" ON user_sessions;

-- user_stats
DROP POLICY IF EXISTS "Users can view own stats" ON user_stats;
DROP POLICY IF EXISTS "Teachers can view student stats" ON user_stats;
DROP POLICY IF EXISTS "Admins can manage all stats" ON user_stats;

-- users
DROP POLICY IF EXISTS "Service role can do anything" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Teachers can view their students" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;

-- vocal_exercises
DROP POLICY IF EXISTS "Anyone can view vocal exercises" ON vocal_exercises;
DROP POLICY IF EXISTS "Anyone can view exercises" ON vocal_exercises;
DROP POLICY IF EXISTS "Admins can manage exercises" ON vocal_exercises;

-- lessons
DROP POLICY IF EXISTS "Users can view own lessons" ON lessons;
DROP POLICY IF EXISTS "Teachers can manage own lessons" ON lessons;
DROP POLICY IF EXISTS "Admins can manage all lessons" ON lessons;

-- lesson_participants
DROP POLICY IF EXISTS "Users can view own participation" ON lesson_participants;
DROP POLICY IF EXISTS "Teachers can manage lesson participants" ON lesson_participants;
DROP POLICY IF EXISTS "Admins can manage all participants" ON lesson_participants;

-- ai_analysis
DROP POLICY IF EXISTS "Users can view own ai_analysis" ON ai_analysis;
DROP POLICY IF EXISTS "Teachers can view student ai_analysis" ON ai_analysis;
DROP POLICY IF EXISTS "Admins can manage all ai_analysis" ON ai_analysis;

-- =====================================================
-- STEP 2: ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE IF EXISTS transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS learning_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lesson_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS vocal_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 3: CREATE HELPER FUNCTIONS
-- =====================================================

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

CREATE OR REPLACE FUNCTION public.is_teacher_of(student_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = student_id
    AND teacher = auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM public.users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 4: CREATE NEW POLICIES
-- =====================================================

-- TRANSCRIPTIONS
CREATE POLICY "Users can view own transcriptions"
ON transcriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view student transcriptions"
ON transcriptions FOR SELECT
USING (
  public.get_user_role() = 'teacher'
  AND public.is_teacher_of(user_id)
);

CREATE POLICY "Admins can view all transcriptions"
ON transcriptions FOR SELECT
USING (public.is_admin());

CREATE POLICY "Service role can manage transcriptions"
ON transcriptions FOR ALL
USING (auth.role() = 'service_role');

-- RECORDINGS
CREATE POLICY "Users can view own recordings"
ON recordings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recordings"
ON recordings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recordings"
ON recordings FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view student recordings"
ON recordings FOR SELECT
USING (
  public.get_user_role() = 'teacher'
  AND public.is_teacher_of(user_id)
);

CREATE POLICY "Admins can manage all recordings"
ON recordings FOR ALL
USING (public.is_admin());

-- AI_ANALYSIS
CREATE POLICY "Users can view own ai_analysis"
ON ai_analysis FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM recordings
    WHERE recordings.id = ai_analysis.recording_id
    AND recordings.user_id = auth.uid()
  )
);

CREATE POLICY "Teachers can view student ai_analysis"
ON ai_analysis FOR SELECT
USING (
  public.get_user_role() = 'teacher'
  AND EXISTS (
    SELECT 1 FROM recordings
    WHERE recordings.id = ai_analysis.recording_id
    AND public.is_teacher_of(recordings.user_id)
  )
);

CREATE POLICY "Admins can manage all ai_analysis"
ON ai_analysis FOR ALL
USING (public.is_admin());

-- LEARNING_INSIGHTS
CREATE POLICY "Users can view own insights"
ON learning_insights FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own insights"
ON learning_insights FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teachers can view student insights"
ON learning_insights FOR SELECT
USING (
  public.get_user_role() = 'teacher'
  AND public.is_teacher_of(user_id)
);

CREATE POLICY "Admins can manage all insights"
ON learning_insights FOR ALL
USING (public.is_admin());

-- USER_STATS
CREATE POLICY "Users can view own stats"
ON user_stats FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view student stats"
ON user_stats FOR SELECT
USING (
  public.get_user_role() = 'teacher'
  AND public.is_teacher_of(user_id)
);

CREATE POLICY "Admins can manage all stats"
ON user_stats FOR ALL
USING (public.is_admin());

-- USER_PROGRESS
-- NOTE: Only SELECT allowed for users. INSERT/UPDATE only via service_role (Edge Functions)
-- This prevents users from faking their progress scores.

CREATE POLICY "Users can view own progress"
ON user_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view student progress"
ON user_progress FOR SELECT
USING (
  public.get_user_role() = 'teacher'
  AND public.is_teacher_of(user_id)
);

CREATE POLICY "Admins can manage all progress"
ON user_progress FOR ALL
USING (public.is_admin());

CREATE POLICY "Service role can manage progress"
ON user_progress FOR ALL
USING (auth.role() = 'service_role');

-- LESSONS
CREATE POLICY "Users can view own lessons"
ON lessons FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM lesson_participants
    WHERE lesson_participants.lesson_id = lessons.id
    AND lesson_participants.student_id = auth.uid()
  )
);

CREATE POLICY "Teachers can manage own lessons"
ON lessons FOR ALL
USING (auth.uid() = teacher_id);

CREATE POLICY "Admins can manage all lessons"
ON lessons FOR ALL
USING (public.is_admin());

-- LESSON_PARTICIPANTS
CREATE POLICY "Users can view own participation"
ON lesson_participants FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Teachers can manage lesson participants"
ON lesson_participants FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM lessons
    WHERE lessons.id = lesson_participants.lesson_id
    AND lessons.teacher_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all participants"
ON lesson_participants FOR ALL
USING (public.is_admin());

-- USER_ACHIEVEMENTS
CREATE POLICY "Users can view own achievements"
ON user_achievements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service can manage achievements"
ON user_achievements FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- ACHIEVEMENTS (public catalog)
CREATE POLICY "Anyone can view achievements"
ON achievements FOR SELECT
USING (true);

CREATE POLICY "Admins can manage achievements"
ON achievements FOR ALL
USING (public.is_admin());

-- VOCAL_EXERCISES (public)
CREATE POLICY "Anyone can view exercises"
ON vocal_exercises FOR SELECT
USING (true);

CREATE POLICY "Admins can manage exercises"
ON vocal_exercises FOR ALL
USING (public.is_admin());

-- LEADERBOARDS (public metadata)
CREATE POLICY "Anyone can view leaderboards"
ON leaderboards FOR SELECT
USING (true);

-- USERS
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = (SELECT role FROM users WHERE id = auth.uid())
);

CREATE POLICY "Teachers can view their students"
ON users FOR SELECT
USING (
  public.get_user_role() = 'teacher'
  AND teacher = auth.uid()::text
);

CREATE POLICY "Admins can manage all users"
ON users FOR ALL
USING (public.is_admin());

-- =====================================================
-- STEP 5: GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher_of(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
