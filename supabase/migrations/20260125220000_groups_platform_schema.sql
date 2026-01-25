-- =====================================================
-- VOICELY GROUPS PLATFORM - DATABASE SCHEMA
-- Version: 1.0
-- Date: 2026-01-25
-- Description: Complete schema for groups/juniors platform
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================

-- Exercise categories
CREATE TYPE exercise_category AS ENUM ('warmup', 'technique', 'song', 'breathing', 'rhythm');

-- Difficulty levels
CREATE TYPE exercise_difficulty AS ENUM ('easy', 'medium', 'advanced');

-- Age groups
CREATE TYPE age_group AS ENUM ('10-12', '13-14');

-- Practice plan status
CREATE TYPE practice_status AS ENUM ('pending', 'in_progress', 'completed', 'skipped');

-- Analysis status
CREATE TYPE analysis_status AS ENUM ('queued', 'processing', 'complete', 'failed');

-- Leaderboard display mode
CREATE TYPE leaderboard_mode AS ENUM ('full', 'semi', 'private');

-- Challenge status
CREATE TYPE challenge_status AS ENUM ('draft', 'active', 'ended', 'archived');

-- =====================================================
-- TABLE: group_students
-- Extended student profile for groups platform
-- =====================================================

CREATE TABLE IF NOT EXISTS group_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Parent info
  parent_email TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  parent_phone TEXT,

  -- Student info
  student_name TEXT NOT NULL,
  student_name_en TEXT,
  age INTEGER NOT NULL CHECK (age >= 10 AND age <= 14),
  birth_date DATE,
  avatar_url TEXT,
  avatar_emoji TEXT DEFAULT '🎤',

  -- Group association
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,

  -- Consent & privacy
  consent_audio_recording BOOLEAN DEFAULT false,
  consent_data_processing BOOLEAN DEFAULT false,
  consent_peer_sharing BOOLEAN DEFAULT false,
  consent_date TIMESTAMPTZ,
  consent_parent_signature TEXT,

  -- Settings
  age_group age_group GENERATED ALWAYS AS (
    CASE WHEN age <= 12 THEN '10-12'::age_group ELSE '13-14'::age_group END
  ) STORED,
  ui_theme TEXT DEFAULT 'auto', -- auto, playful, mature
  notification_preferences JSONB DEFAULT '{"daily_reminder": true, "challenge_updates": true, "weekly_report": true}'::jsonb,

  -- Gamification
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_practice_at TIMESTAMPTZ,
  onboarding_completed BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_group_students_user_id ON group_students(user_id);
CREATE INDEX idx_group_students_group_id ON group_students(group_id);
CREATE INDEX idx_group_students_age_group ON group_students(age_group);

-- =====================================================
-- TABLE: practice_exercises
-- Exercise library
-- =====================================================

CREATE TABLE IF NOT EXISTS practice_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  title TEXT NOT NULL,
  title_he TEXT NOT NULL,
  description TEXT,
  description_he TEXT,

  -- Classification
  category exercise_category NOT NULL,
  difficulty exercise_difficulty NOT NULL DEFAULT 'easy',
  age_groups age_group[] NOT NULL DEFAULT ARRAY['10-12'::age_group, '13-14'::age_group],
  tags TEXT[] DEFAULT '{}',

  -- Duration
  duration_minutes INTEGER NOT NULL DEFAULT 5,
  min_duration_seconds INTEGER DEFAULT 30,
  max_duration_seconds INTEGER DEFAULT 90,

  -- Instructions
  instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Format: [{"step": 1, "text_he": "...", "text_en": "...", "duration_sec": 10}]

  -- Media
  audio_demo_url TEXT,
  video_demo_url TEXT,
  thumbnail_url TEXT,
  reference_pitch_data JSONB, -- For pitch matching exercises

  -- Success criteria
  success_criteria JSONB DEFAULT '{
    "min_duration_percent": 80,
    "pitch_accuracy_threshold": 60,
    "breath_steadiness_threshold": 70
  }'::jsonb,

  -- AI feedback templates (Hebrew)
  ai_feedback_templates JSONB DEFAULT '{
    "excellent": ["מעולה! 🌟", "וואו, איזה שיפור!", "את/ה כוכב/ת!"],
    "good": ["יפה מאוד!", "ממשיכים להתקדם!", "עבודה טובה!"],
    "needs_work": ["בואו ננסה שוב", "עוד קצת תרגול ונגיע לשם", "לא נורא, זה חלק מהתהליך"]
  }'::jsonb,

  -- Metadata
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_practice_exercises_category ON practice_exercises(category);
CREATE INDEX idx_practice_exercises_difficulty ON practice_exercises(difficulty);
CREATE INDEX idx_practice_exercises_age_groups ON practice_exercises USING GIN(age_groups);

-- =====================================================
-- TABLE: daily_practice_plans
-- Auto-generated daily exercise plans
-- =====================================================

CREATE TABLE IF NOT EXISTS daily_practice_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES group_students(id) ON DELETE CASCADE,

  -- Date
  plan_date DATE NOT NULL,

  -- Exercises (ordered list)
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Format: [{"exercise_id": "uuid", "order": 1, "type": "warmup"}]

  -- Progress tracking
  completed_exercises UUID[] DEFAULT '{}',
  status practice_status DEFAULT 'pending',

  -- Time tracking
  estimated_duration_minutes INTEGER DEFAULT 20,
  actual_duration_minutes INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Performance summary
  avg_score INTEGER,
  exercises_count INTEGER DEFAULT 0,
  completed_count INTEGER DEFAULT 0,

  -- XP earned this day
  xp_earned INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint: one plan per student per day
  UNIQUE(student_id, plan_date)
);

-- Indexes
CREATE INDEX idx_daily_practice_plans_student_date ON daily_practice_plans(student_id, plan_date DESC);
CREATE INDEX idx_daily_practice_plans_status ON daily_practice_plans(status);

-- =====================================================
-- TABLE: exercise_recordings
-- Student exercise recordings with AI analysis
-- =====================================================

CREATE TABLE IF NOT EXISTS exercise_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES group_students(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES practice_exercises(id) ON DELETE CASCADE,
  daily_plan_id UUID REFERENCES daily_practice_plans(id) ON DELETE SET NULL,

  -- Audio file
  audio_url TEXT NOT NULL,
  audio_format TEXT DEFAULT 'opus',
  duration_seconds INTEGER NOT NULL,
  file_size_bytes INTEGER,

  -- Analysis
  analysis_status analysis_status DEFAULT 'queued',
  analysis_started_at TIMESTAMPTZ,
  analysis_completed_at TIMESTAMPTZ,

  -- AI Analysis results
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  -- Format: {
  --   "pitch_accuracy": 78,
  --   "rhythm_accuracy": 85,
  --   "breath_control": 72,
  --   "energy_level": 80,
  --   "resonance_quality": "good",
  --   "detected_issues": ["nasal", "breath_support"],
  --   "strengths": ["pitch_matching", "timing"]
  -- }

  -- Scores
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  pitch_score INTEGER CHECK (pitch_score >= 0 AND pitch_score <= 100),
  rhythm_score INTEGER CHECK (rhythm_score >= 0 AND rhythm_score <= 100),
  breath_score INTEGER CHECK (breath_score >= 0 AND breath_score <= 100),
  energy_score INTEGER CHECK (energy_score >= 0 AND energy_score <= 100),

  -- Feedback
  ai_feedback_text TEXT,
  ai_feedback_he TEXT,
  ai_suggestions JSONB DEFAULT '[]'::jsonb,

  -- Teacher feedback (optional)
  teacher_feedback TEXT,
  teacher_score INTEGER CHECK (teacher_score >= 0 AND teacher_score <= 100),

  -- XP earned
  xp_earned INTEGER DEFAULT 0,

  -- Metadata
  device_info JSONB,
  attempt_number INTEGER DEFAULT 1,
  is_best_attempt BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_exercise_recordings_student ON exercise_recordings(student_id, created_at DESC);
CREATE INDEX idx_exercise_recordings_exercise ON exercise_recordings(exercise_id);
CREATE INDEX idx_exercise_recordings_analysis_status ON exercise_recordings(analysis_status);
CREATE INDEX idx_exercise_recordings_daily_plan ON exercise_recordings(daily_plan_id);

-- =====================================================
-- TABLE: weekly_challenges
-- Group challenges created by teachers
-- =====================================================

CREATE TABLE IF NOT EXISTS weekly_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,

  -- Challenge info
  title TEXT NOT NULL,
  title_he TEXT NOT NULL,
  description TEXT,
  description_he TEXT,

  -- Song/content
  song_title TEXT NOT NULL,
  song_artist TEXT,
  song_excerpt_start_sec INTEGER DEFAULT 0,
  song_excerpt_end_sec INTEGER NOT NULL,
  reference_audio_url TEXT,
  lyrics_text TEXT,
  lyrics_he TEXT,

  -- Rules
  criteria JSONB DEFAULT '{
    "min_pitch_accuracy": 70,
    "min_energy_level": 60,
    "no_breaks": true,
    "duration_range": [15, 30]
  }'::jsonb,
  max_attempts INTEGER DEFAULT 5,

  -- Scoring weights
  scoring_weights JSONB DEFAULT '{
    "ai_score": 0.4,
    "teacher_score": 0.3,
    "effort_score": 0.2,
    "participation_bonus": 0.1
  }'::jsonb,

  -- Display settings
  leaderboard_mode leaderboard_mode DEFAULT 'semi',
  allow_comments BOOLEAN DEFAULT true,
  show_scores_publicly BOOLEAN DEFAULT true,

  -- Prizes/rewards
  prizes JSONB DEFAULT '{
    "first": {"xp": 100, "badge": "challenge_winner"},
    "second": {"xp": 75},
    "third": {"xp": 50},
    "participation": {"xp": 25}
  }'::jsonb,

  -- Timeline
  status challenge_status DEFAULT 'draft',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  results_announced_at TIMESTAMPTZ,

  -- Creator
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_weekly_challenges_group ON weekly_challenges(group_id);
CREATE INDEX idx_weekly_challenges_status ON weekly_challenges(status);
CREATE INDEX idx_weekly_challenges_dates ON weekly_challenges(starts_at, ends_at);

-- =====================================================
-- TABLE: challenge_entries
-- Student submissions for challenges
-- =====================================================

CREATE TABLE IF NOT EXISTS challenge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES weekly_challenges(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES group_students(id) ON DELETE CASCADE,

  -- Recording
  recording_url TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  attempt_number INTEGER DEFAULT 1,

  -- Scores
  ai_score INTEGER CHECK (ai_score >= 0 AND ai_score <= 100),
  teacher_score INTEGER CHECK (teacher_score >= 0 AND teacher_score <= 100),
  effort_score INTEGER CHECK (effort_score >= 0 AND effort_score <= 100),
  participation_bonus INTEGER DEFAULT 0 CHECK (participation_bonus >= 0 AND participation_bonus <= 10),
  final_score INTEGER CHECK (final_score >= 0 AND final_score <= 100),

  -- Ranking
  rank INTEGER,

  -- AI Analysis
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  ai_feedback TEXT,
  ai_feedback_he TEXT,

  -- Teacher feedback
  teacher_feedback TEXT,
  teacher_feedback_he TEXT,

  -- Sharing
  is_shared BOOLEAN DEFAULT false,
  shared_at TIMESTAMPTZ,

  -- Engagement
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,

  -- XP
  xp_earned INTEGER DEFAULT 0,

  -- Status
  is_best_entry BOOLEAN DEFAULT false,
  is_disqualified BOOLEAN DEFAULT false,
  disqualification_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_challenge_entries_challenge ON challenge_entries(challenge_id);
CREATE INDEX idx_challenge_entries_student ON challenge_entries(student_id);
CREATE INDEX idx_challenge_entries_ranking ON challenge_entries(challenge_id, final_score DESC NULLS LAST);
CREATE INDEX idx_challenge_entries_shared ON challenge_entries(challenge_id, is_shared) WHERE is_shared = true;

-- =====================================================
-- TABLE: challenge_comments
-- Comments on challenge entries
-- =====================================================

CREATE TABLE IF NOT EXISTS challenge_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES challenge_entries(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES group_students(id) ON DELETE CASCADE,

  -- Content
  content TEXT NOT NULL CHECK (length(content) <= 500),

  -- Moderation
  is_approved BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  moderated_by UUID REFERENCES auth.users(id),
  moderated_at TIMESTAMPTZ,
  moderation_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_challenge_comments_entry ON challenge_comments(entry_id);
CREATE INDEX idx_challenge_comments_author ON challenge_comments(author_id);
CREATE INDEX idx_challenge_comments_approved ON challenge_comments(entry_id, is_approved) WHERE is_approved = true;

-- =====================================================
-- TABLE: challenge_likes
-- Likes on challenge entries
-- =====================================================

CREATE TABLE IF NOT EXISTS challenge_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES challenge_entries(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES group_students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Unique: one like per student per entry
  UNIQUE(entry_id, student_id)
);

-- =====================================================
-- TABLE: student_progress
-- Daily progress snapshots for analytics
-- =====================================================

CREATE TABLE IF NOT EXISTS student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES group_students(id) ON DELETE CASCADE,

  -- Date
  progress_date DATE NOT NULL,

  -- Performance metrics (daily averages)
  pitch_accuracy_avg INTEGER CHECK (pitch_accuracy_avg >= 0 AND pitch_accuracy_avg <= 100),
  rhythm_accuracy_avg INTEGER CHECK (rhythm_accuracy_avg >= 0 AND rhythm_accuracy_avg <= 100),
  breath_control_avg INTEGER CHECK (breath_control_avg >= 0 AND breath_control_avg <= 100),
  energy_level_avg INTEGER CHECK (energy_level_avg >= 0 AND energy_level_avg <= 100),
  overall_score_avg INTEGER CHECK (overall_score_avg >= 0 AND overall_score_avg <= 100),

  -- Activity metrics
  exercises_completed INTEGER DEFAULT 0,
  exercises_total INTEGER DEFAULT 0,
  practice_minutes INTEGER DEFAULT 0,
  recordings_count INTEGER DEFAULT 0,

  -- Streak
  streak_days INTEGER DEFAULT 0,
  streak_continued BOOLEAN DEFAULT false,

  -- XP
  xp_earned INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,

  -- Level
  level_at_date INTEGER DEFAULT 1,

  -- Challenges
  challenges_participated INTEGER DEFAULT 0,
  challenge_rank INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Unique: one record per student per day
  UNIQUE(student_id, progress_date)
);

-- Indexes
CREATE INDEX idx_student_progress_student_date ON student_progress(student_id, progress_date DESC);

-- =====================================================
-- TABLE: student_achievements
-- Badges and achievements earned
-- =====================================================

CREATE TABLE IF NOT EXISTS student_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES group_students(id) ON DELETE CASCADE,

  -- Achievement info
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achievement_name_he TEXT NOT NULL,
  achievement_description TEXT,
  achievement_icon TEXT, -- emoji or icon name

  -- Rarity
  rarity TEXT CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')) DEFAULT 'common',

  -- XP reward
  xp_reward INTEGER DEFAULT 0,

  -- Context
  achievement_data JSONB DEFAULT '{}'::jsonb,
  -- e.g., {"streak_days": 7} or {"challenge_id": "uuid", "rank": 1}

  -- Display
  is_displayed BOOLEAN DEFAULT true, -- show on profile

  -- Timestamps
  earned_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_student_achievements_student ON student_achievements(student_id);
CREATE INDEX idx_student_achievements_type ON student_achievements(achievement_type);

-- =====================================================
-- TABLE: exercise_sessions
-- Track practice sessions (for analytics)
-- =====================================================

CREATE TABLE IF NOT EXISTS exercise_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES group_students(id) ON DELETE CASCADE,
  daily_plan_id UUID REFERENCES daily_practice_plans(id) ON DELETE SET NULL,

  -- Session timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,

  -- Activity
  exercises_attempted INTEGER DEFAULT 0,
  exercises_completed INTEGER DEFAULT 0,
  recordings_made INTEGER DEFAULT 0,

  -- Performance
  avg_score INTEGER,
  best_score INTEGER,

  -- XP
  xp_earned INTEGER DEFAULT 0,

  -- Device info
  device_type TEXT, -- mobile, tablet, desktop
  browser TEXT,
  os TEXT
);

-- Indexes
CREATE INDEX idx_exercise_sessions_student ON exercise_sessions(student_id, started_at DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE group_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_practice_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_sessions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS: group_students
-- =====================================================

-- Students can view and update their own profile
CREATE POLICY "Students can view own profile"
  ON group_students FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Students can update own profile"
  ON group_students FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Teachers can view students in their groups
CREATE POLICY "Teachers can view group students"
  ON group_students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_students.group_id
      AND g.teacher_id = auth.uid()
    )
  );

-- Admins have full access
CREATE POLICY "Admins have full access to group_students"
  ON group_students FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- =====================================================
-- RLS: practice_exercises
-- =====================================================

-- Everyone can view active exercises
CREATE POLICY "Anyone can view active exercises"
  ON practice_exercises FOR SELECT
  USING (is_active = true);

-- Teachers and admins can manage exercises
-- Using text cast to avoid enum compatibility issues
CREATE POLICY "Teachers can manage exercises"
  ON practice_exercises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role::text IN ('admin', 'teacher')
    )
  );

-- =====================================================
-- RLS: daily_practice_plans
-- =====================================================

-- Students can view and update their own plans
CREATE POLICY "Students can view own plans"
  ON daily_practice_plans FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM group_students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Students can update own plans"
  ON daily_practice_plans FOR UPDATE
  USING (
    student_id IN (
      SELECT id FROM group_students WHERE user_id = auth.uid()
    )
  );

-- Teachers can view their group's plans
CREATE POLICY "Teachers can view group plans"
  ON daily_practice_plans FOR SELECT
  USING (
    student_id IN (
      SELECT gs.id FROM group_students gs
      JOIN groups g ON gs.group_id = g.id
      WHERE g.teacher_id = auth.uid()
    )
  );

-- =====================================================
-- RLS: exercise_recordings
-- =====================================================

-- Students can CRUD their own recordings
CREATE POLICY "Students can manage own recordings"
  ON exercise_recordings FOR ALL
  USING (
    student_id IN (
      SELECT id FROM group_students WHERE user_id = auth.uid()
    )
  );

-- Teachers can view their group's recordings
CREATE POLICY "Teachers can view group recordings"
  ON exercise_recordings FOR SELECT
  USING (
    student_id IN (
      SELECT gs.id FROM group_students gs
      JOIN groups g ON gs.group_id = g.id
      WHERE g.teacher_id = auth.uid()
    )
  );

-- Teachers can add feedback to recordings
CREATE POLICY "Teachers can update group recordings"
  ON exercise_recordings FOR UPDATE
  USING (
    student_id IN (
      SELECT gs.id FROM group_students gs
      JOIN groups g ON gs.group_id = g.id
      WHERE g.teacher_id = auth.uid()
    )
  );

-- =====================================================
-- RLS: weekly_challenges
-- =====================================================

-- Students can view active challenges for their group
CREATE POLICY "Students can view group challenges"
  ON weekly_challenges FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_students WHERE user_id = auth.uid()
    )
    AND status IN ('active', 'ended')
  );

-- Teachers can manage challenges for their groups
CREATE POLICY "Teachers can manage group challenges"
  ON weekly_challenges FOR ALL
  USING (
    group_id IN (
      SELECT id FROM groups WHERE teacher_id = auth.uid()
    )
  );

-- =====================================================
-- RLS: challenge_entries
-- =====================================================

-- Students can manage their own entries
CREATE POLICY "Students can manage own entries"
  ON challenge_entries FOR ALL
  USING (
    student_id IN (
      SELECT id FROM group_students WHERE user_id = auth.uid()
    )
  );

-- Students can view shared entries from their group
CREATE POLICY "Students can view shared entries"
  ON challenge_entries FOR SELECT
  USING (
    challenge_id IN (
      SELECT wc.id FROM weekly_challenges wc
      JOIN group_students gs ON wc.group_id = gs.group_id
      WHERE gs.user_id = auth.uid()
    )
    AND is_shared = true
  );

-- Teachers can view and update all entries in their challenges
CREATE POLICY "Teachers can manage challenge entries"
  ON challenge_entries FOR ALL
  USING (
    challenge_id IN (
      SELECT wc.id FROM weekly_challenges wc
      JOIN groups g ON wc.group_id = g.id
      WHERE g.teacher_id = auth.uid()
    )
  );

-- =====================================================
-- RLS: challenge_comments
-- =====================================================

-- Students can view approved comments
CREATE POLICY "Students can view approved comments"
  ON challenge_comments FOR SELECT
  USING (
    is_approved = true
    AND entry_id IN (
      SELECT ce.id FROM challenge_entries ce
      JOIN weekly_challenges wc ON ce.challenge_id = wc.id
      JOIN group_students gs ON wc.group_id = gs.group_id
      WHERE gs.user_id = auth.uid()
    )
  );

-- Students can create comments
CREATE POLICY "Students can create comments"
  ON challenge_comments FOR INSERT
  WITH CHECK (
    author_id IN (
      SELECT id FROM group_students WHERE user_id = auth.uid()
    )
  );

-- Students can delete their own comments
CREATE POLICY "Students can delete own comments"
  ON challenge_comments FOR DELETE
  USING (
    author_id IN (
      SELECT id FROM group_students WHERE user_id = auth.uid()
    )
  );

-- Teachers can moderate comments
CREATE POLICY "Teachers can moderate comments"
  ON challenge_comments FOR ALL
  USING (
    entry_id IN (
      SELECT ce.id FROM challenge_entries ce
      JOIN weekly_challenges wc ON ce.challenge_id = wc.id
      JOIN groups g ON wc.group_id = g.id
      WHERE g.teacher_id = auth.uid()
    )
  );

-- =====================================================
-- RLS: challenge_likes
-- =====================================================

-- Students can like/unlike entries
CREATE POLICY "Students can manage likes"
  ON challenge_likes FOR ALL
  USING (
    student_id IN (
      SELECT id FROM group_students WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- RLS: student_progress
-- =====================================================

-- Students can view their own progress
CREATE POLICY "Students can view own progress"
  ON student_progress FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM group_students WHERE user_id = auth.uid()
    )
  );

-- Teachers can view their group's progress
CREATE POLICY "Teachers can view group progress"
  ON student_progress FOR SELECT
  USING (
    student_id IN (
      SELECT gs.id FROM group_students gs
      JOIN groups g ON gs.group_id = g.id
      WHERE g.teacher_id = auth.uid()
    )
  );

-- =====================================================
-- RLS: student_achievements
-- =====================================================

-- Students can view their own achievements
CREATE POLICY "Students can view own achievements"
  ON student_achievements FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM group_students WHERE user_id = auth.uid()
    )
  );

-- Students can view group members' displayed achievements
CREATE POLICY "Students can view group achievements"
  ON student_achievements FOR SELECT
  USING (
    is_displayed = true
    AND student_id IN (
      SELECT gs2.id FROM group_students gs1
      JOIN group_students gs2 ON gs1.group_id = gs2.group_id
      WHERE gs1.user_id = auth.uid()
    )
  );

-- =====================================================
-- RLS: exercise_sessions
-- =====================================================

-- Students can view their own sessions
CREATE POLICY "Students can view own sessions"
  ON exercise_sessions FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM group_students WHERE user_id = auth.uid()
    )
  );

-- Students can create sessions
CREATE POLICY "Students can create sessions"
  ON exercise_sessions FOR INSERT
  WITH CHECK (
    student_id IN (
      SELECT id FROM group_students WHERE user_id = auth.uid()
    )
  );

-- Students can update their own sessions
CREATE POLICY "Students can update own sessions"
  ON exercise_sessions FOR UPDATE
  USING (
    student_id IN (
      SELECT id FROM group_students WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update streak
CREATE OR REPLACE FUNCTION update_student_streak()
RETURNS TRIGGER AS $$
BEGIN
  -- If completing a practice plan
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Check if practiced yesterday
    IF EXISTS (
      SELECT 1 FROM daily_practice_plans
      WHERE student_id = NEW.student_id
      AND plan_date = NEW.plan_date - INTERVAL '1 day'
      AND status = 'completed'
    ) THEN
      -- Continue streak
      UPDATE group_students
      SET current_streak = current_streak + 1,
          longest_streak = GREATEST(longest_streak, current_streak + 1),
          last_practice_at = now(),
          updated_at = now()
      WHERE id = NEW.student_id;
    ELSE
      -- Reset streak to 1
      UPDATE group_students
      SET current_streak = 1,
          last_practice_at = now(),
          updated_at = now()
      WHERE id = NEW.student_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for streak update
CREATE TRIGGER trigger_update_streak
  AFTER UPDATE ON daily_practice_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_student_streak();

-- Function to calculate challenge final score
CREATE OR REPLACE FUNCTION calculate_challenge_score()
RETURNS TRIGGER AS $$
DECLARE
  weights JSONB;
BEGIN
  -- Get scoring weights from challenge
  SELECT scoring_weights INTO weights
  FROM weekly_challenges
  WHERE id = NEW.challenge_id;

  -- Calculate final score
  NEW.final_score := ROUND(
    COALESCE(NEW.ai_score, 0) * COALESCE((weights->>'ai_score')::numeric, 0.4) +
    COALESCE(NEW.teacher_score, NEW.ai_score, 0) * COALESCE((weights->>'teacher_score')::numeric, 0.3) +
    COALESCE(NEW.effort_score, 50) * COALESCE((weights->>'effort_score')::numeric, 0.2) +
    COALESCE(NEW.participation_bonus, 0) * COALESCE((weights->>'participation_bonus')::numeric, 0.1)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for score calculation
CREATE TRIGGER trigger_calculate_score
  BEFORE INSERT OR UPDATE ON challenge_entries
  FOR EACH ROW
  WHEN (NEW.ai_score IS NOT NULL OR NEW.teacher_score IS NOT NULL)
  EXECUTE FUNCTION calculate_challenge_score();

-- Function to update likes count
CREATE OR REPLACE FUNCTION update_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE challenge_entries
    SET likes_count = likes_count + 1
    WHERE id = NEW.entry_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE challenge_entries
    SET likes_count = likes_count - 1
    WHERE id = OLD.entry_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for likes count
CREATE TRIGGER trigger_update_likes_count
  AFTER INSERT OR DELETE ON challenge_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_likes_count();

-- Function to update comments count
CREATE OR REPLACE FUNCTION update_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_approved = true THEN
    UPDATE challenge_entries
    SET comments_count = comments_count + 1
    WHERE id = NEW.entry_id;
  ELSIF TG_OP = 'DELETE' AND OLD.is_approved = true THEN
    UPDATE challenge_entries
    SET comments_count = comments_count - 1
    WHERE id = OLD.entry_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.is_approved != NEW.is_approved THEN
    UPDATE challenge_entries
    SET comments_count = comments_count + (CASE WHEN NEW.is_approved THEN 1 ELSE -1 END)
    WHERE id = NEW.entry_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for comments count
CREATE TRIGGER trigger_update_comments_count
  AFTER INSERT OR UPDATE OR DELETE ON challenge_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comments_count();

-- =====================================================
-- STORAGE BUCKET
-- =====================================================

-- Create storage bucket for recordings (run manually in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('voicely-group-recordings', 'voicely-group-recordings', false);

-- =====================================================
-- SEED DATA: Sample Exercises
-- =====================================================

INSERT INTO practice_exercises (title, title_he, category, difficulty, age_groups, duration_minutes, instructions, ai_feedback_templates) VALUES
-- Warmup exercises
('Lip Trills', 'רטט שפתיים', 'warmup', 'easy', ARRAY['10-12'::age_group, '13-14'::age_group], 4,
 '[{"step": 1, "text_he": "נשמו עמוק דרך האף", "duration_sec": 5}, {"step": 2, "text_he": "הוציאו אוויר דרך שפתיים רפויות תוך כדי צליל", "duration_sec": 10}, {"step": 3, "text_he": "חזרו 5 פעמים", "duration_sec": 45}]'::jsonb,
 '{"excellent": ["מעולה! השפתיים שלך רפויות בדיוק כמו שצריך"], "good": ["יפה! נסי להרפות עוד קצת"], "needs_work": ["בואי ננסה שוב - תרפי את השפתיים"]}'::jsonb),

('Sirens', 'צלילי סירנה', 'warmup', 'easy', ARRAY['10-12'::age_group, '13-14'::age_group], 4,
 '[{"step": 1, "text_he": "התחילו מצליל נמוך", "duration_sec": 3}, {"step": 2, "text_he": "עלו לאט לצליל גבוה כמו סירנה", "duration_sec": 8}, {"step": 3, "text_he": "רדו חזרה לאט", "duration_sec": 8}, {"step": 4, "text_he": "חזרו 4 פעמים", "duration_sec": 40}]'::jsonb,
 '{"excellent": ["וואו! המעבר שלך חלק מאוד"], "good": ["יפה! נסי לעשות את המעבר יותר הדרגתי"], "needs_work": ["בואי נתרגל את המעבר בין הצלילים"]}'::jsonb),

('Humming', 'זמזום', 'warmup', 'easy', ARRAY['10-12'::age_group, '13-14'::age_group], 3,
 '[{"step": 1, "text_he": "סגרו את הפה בעדינות", "duration_sec": 2}, {"step": 2, "text_he": "זמזמו mmm בצליל נוח", "duration_sec": 10}, {"step": 3, "text_he": "הרגישו את הרטט באף ובשפתיים", "duration_sec": 10}, {"step": 4, "text_he": "חזרו בצלילים שונים", "duration_sec": 30}]'::jsonb,
 '{"excellent": ["מושלם! הרטט במקום הנכון"], "good": ["טוב מאוד! נסי להרגיש יותר רטט באף"], "needs_work": ["בואי נתמקד ברטט - תרגישי אותו בפנים"]}'::jsonb),

-- Breathing exercises
('Deep Breathing', 'נשימה עמוקה', 'breathing', 'easy', ARRAY['10-12'::age_group, '13-14'::age_group], 5,
 '[{"step": 1, "text_he": "שבו בנוחות, גב ישר", "duration_sec": 3}, {"step": 2, "text_he": "שאפו אוויר דרך האף - ספרו עד 4", "duration_sec": 4}, {"step": 3, "text_he": "החזיקו - ספרו עד 4", "duration_sec": 4}, {"step": 4, "text_he": "הוציאו באיטיות דרך הפה - ספרו עד 8", "duration_sec": 8}, {"step": 5, "text_he": "חזרו 6 פעמים", "duration_sec": 90}]'::jsonb,
 '{"excellent": ["נשימה מעולה! תמשיכי ככה"], "good": ["טוב! נסי להאריך את הנשיפה"], "needs_work": ["בואי נתרגל לאט יותר"]}'::jsonb),

-- Technique exercises
('Pitch Matching', 'התאמת צליל', 'technique', 'medium', ARRAY['10-12'::age_group, '13-14'::age_group], 6,
 '[{"step": 1, "text_he": "האזינו לצליל המוקלט", "duration_sec": 5}, {"step": 2, "text_he": "שירו את אותו הצליל", "duration_sec": 5}, {"step": 3, "text_he": "האזינו שוב ותקנו אם צריך", "duration_sec": 5}, {"step": 4, "text_he": "חזרו עם צלילים שונים", "duration_sec": 60}]'::jsonb,
 '{"excellent": ["מדויק! הצליל שלך בול"], "good": ["קרוב מאוד! עוד קצת ואת שם"], "needs_work": ["בואי ננסה שוב - תקשיבי טוב לצליל"]}'::jsonb),

('Vowel Shapes', 'צורות תנועות', 'technique', 'medium', ARRAY['10-12'::age_group], 5,
 '[{"step": 1, "text_he": "פתחו את הפה לצורת A גדולה", "duration_sec": 5}, {"step": 2, "text_he": "שירו אההה על צליל נוח", "duration_sec": 10}, {"step": 3, "text_he": "עברו לצורת O עגולה", "duration_sec": 5}, {"step": 4, "text_he": "שירו אוווו", "duration_sec": 10}, {"step": 5, "text_he": "המשיכו עם E, I, U", "duration_sec": 30}]'::jsonb,
 '{"excellent": ["צורות מושלמות! הצליל נקי"], "good": ["יפה! נסי לפתוח יותר את הפה"], "needs_work": ["בואי נתרגל את צורת הפה"]}'::jsonb),

-- Advanced technique
('Vibrato Control', 'שליטה בויברטו', 'technique', 'advanced', ARRAY['13-14'::age_group], 8,
 '[{"step": 1, "text_he": "התחילו עם צליל ישר ויציב", "duration_sec": 10}, {"step": 2, "text_he": "הוסיפו תנודה קלה לצליל", "duration_sec": 10}, {"step": 3, "text_he": "שלטו במהירות התנודה", "duration_sec": 15}, {"step": 4, "text_he": "תרגלו עצירה והתחלה של הויברטו", "duration_sec": 30}]'::jsonb,
 '{"excellent": ["ויברטו יפהפה! שליטה מעולה"], "good": ["טוב! נסי לשלוט יותר במהירות"], "needs_work": ["בואי נתחיל עם צליל יציב קודם"]}'::jsonb);

-- =====================================================
-- DONE
-- =====================================================

COMMENT ON TABLE group_students IS 'Extended student profiles for groups platform with gamification';
COMMENT ON TABLE practice_exercises IS 'Library of vocal exercises with instructions and AI feedback templates';
COMMENT ON TABLE daily_practice_plans IS 'Auto-generated daily exercise plans for each student';
COMMENT ON TABLE exercise_recordings IS 'Student recordings with AI analysis results';
COMMENT ON TABLE weekly_challenges IS 'Group challenges created by teachers';
COMMENT ON TABLE challenge_entries IS 'Student submissions for challenges';
COMMENT ON TABLE challenge_comments IS 'Comments on challenge entries (moderated)';
COMMENT ON TABLE student_progress IS 'Daily progress snapshots for analytics';
COMMENT ON TABLE student_achievements IS 'Badges and achievements earned by students';
