# Voicely Groups Platform - Implementation Plan

**מסמך תכנון פיתוח מקיף**
**תאריך:** 25 ינואר 2026

---

## 📋 סקירה כללית

### מטרת הפרויקט
בניית פלטפורמה לימודית מלאה לקבוצות שירה לילדים (גילאי 10-14) הכוללת:
- דשבורד תלמיד עם מערכת תרגול יומית
- מערכת הקלטה ומשוב AI
- אתגרים קבוצתיים ולידרבורד
- דשבורד מורה עם אנליטיקס

### Tech Stack
- **Frontend:** React 18 + TypeScript + Vite + Tailwind + shadcn/ui
- **Backend:** Supabase (Auth, PostgreSQL, Storage, Edge Functions)
- **AI:** Gemini 2.5 Pro (audio analysis)
- **Deployment:** Vercel + Supabase

---

## 🗓️ שלבי פיתוח

### Phase 1: Foundation (שבועות 1-3)
**מטרה:** תשתית בסיסית + Auth + DB Schema

### Phase 2: Core Features (שבועות 4-7)
**מטרה:** דשבורד תלמיד + מערכת תרגול

### Phase 3: Recording & AI (שבועות 8-10)
**מטרה:** הקלטה + ניתוח AI + משוב

### Phase 4: Social & Challenges (שבועות 11-13)
**מטרה:** אתגרים קבוצתיים + לידרבורד

### Phase 5: Teacher Dashboard (שבועות 14-16)
**מטרה:** דשבורד מורה + אנליטיקס

### Phase 6: Polish & Launch (שבועות 17-18)
**מטרה:** QA + ביצועים + השקה

---

## 📦 Phase 1: Foundation (שבועות 1-3)

### Week 1: Database Schema

#### Tasks:
- [ ] **1.1** יצירת migration לטבלאות בסיס
- [ ] **1.2** הגדרת RLS policies
- [ ] **1.3** יצירת Edge Functions בסיסיות
- [ ] **1.4** הגדרת Storage buckets

#### Database Tables:

```sql
-- 1. Students (extends existing users)
CREATE TABLE group_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  parent_email TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  student_name TEXT NOT NULL,
  age INTEGER CHECK (age >= 10 AND age <= 14),
  avatar_url TEXT,
  group_id UUID REFERENCES groups(id),
  consent_audio_recording BOOLEAN DEFAULT false,
  consent_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Practice Exercises
CREATE TABLE practice_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_he TEXT NOT NULL,
  description TEXT,
  description_he TEXT,
  category TEXT CHECK (category IN ('warmup', 'technique', 'song')),
  age_group TEXT[] CHECK (age_group <@ ARRAY['10-12', '13-14']),
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'advanced')),
  duration_minutes INTEGER,
  instructions JSONB,
  audio_demo_url TEXT,
  video_demo_url TEXT,
  success_criteria JSONB,
  ai_feedback_templates JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Daily Practice Plans
CREATE TABLE daily_practice_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES group_students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  exercises JSONB NOT NULL, -- Array of exercise IDs with order
  completed_exercises JSONB DEFAULT '[]',
  total_duration_minutes INTEGER,
  actual_duration_minutes INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, date)
);

-- 4. Exercise Recordings
CREATE TABLE exercise_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES group_students(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES practice_exercises(id),
  daily_plan_id UUID REFERENCES daily_practice_plans(id),
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  file_size_bytes INTEGER,
  analysis_status TEXT CHECK (analysis_status IN ('queued', 'processing', 'complete', 'failed')) DEFAULT 'queued',
  ai_analysis JSONB,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  feedback_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Weekly Challenges
CREATE TABLE weekly_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_he TEXT NOT NULL,
  description TEXT,
  song_title TEXT NOT NULL,
  song_excerpt_start INTEGER DEFAULT 0, -- seconds
  song_excerpt_end INTEGER, -- seconds
  reference_audio_url TEXT,
  criteria JSONB,
  max_attempts INTEGER DEFAULT 5,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  leaderboard_mode TEXT CHECK (leaderboard_mode IN ('full', 'semi', 'private')) DEFAULT 'semi',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Challenge Entries
CREATE TABLE challenge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES weekly_challenges(id) ON DELETE CASCADE,
  student_id UUID REFERENCES group_students(id) ON DELETE CASCADE,
  recording_url TEXT NOT NULL,
  duration_seconds INTEGER,
  attempt_number INTEGER DEFAULT 1,
  ai_score INTEGER CHECK (ai_score >= 0 AND ai_score <= 100),
  teacher_score INTEGER CHECK (teacher_score >= 0 AND teacher_score <= 100),
  effort_score INTEGER CHECK (effort_score >= 0 AND effort_score <= 100),
  participation_bonus INTEGER DEFAULT 0,
  final_score INTEGER,
  ai_feedback TEXT,
  teacher_feedback TEXT,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Challenge Comments
CREATE TABLE challenge_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID REFERENCES challenge_entries(id) ON DELETE CASCADE,
  author_id UUID REFERENCES group_students(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Student Progress (daily snapshots)
CREATE TABLE student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES group_students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  pitch_accuracy_avg INTEGER,
  rhythm_accuracy_avg INTEGER,
  breath_control_avg INTEGER,
  energy_level_avg INTEGER,
  exercises_completed INTEGER DEFAULT 0,
  exercises_total INTEGER DEFAULT 0,
  practice_minutes INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, date)
);

-- 9. Achievements/Badges
CREATE TABLE student_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES group_students(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  achievement_data JSONB,
  earned_at TIMESTAMPTZ DEFAULT now()
);
```

#### RLS Policies:
```sql
-- Students can only see their own data
ALTER TABLE group_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own profile"
  ON group_students FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Students can update own profile"
  ON group_students FOR UPDATE
  USING (user_id = auth.uid());

-- Teachers can see their group's students
CREATE POLICY "Teachers can view group students"
  ON group_students FOR SELECT
  USING (
    group_id IN (
      SELECT id FROM groups WHERE teacher_id = auth.uid()
    )
  );

-- Recordings: students see own, teachers see group
ALTER TABLE exercise_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can CRUD own recordings"
  ON exercise_recordings FOR ALL
  USING (
    student_id IN (
      SELECT id FROM group_students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view group recordings"
  ON exercise_recordings FOR SELECT
  USING (
    student_id IN (
      SELECT gs.id FROM group_students gs
      JOIN groups g ON gs.group_id = g.id
      WHERE g.teacher_id = auth.uid()
    )
  );
```

### Week 2: Authentication & Onboarding

#### Tasks:
- [ ] **2.1** Registration flow (parent + student)
- [ ] **2.2** Consent form component
- [ ] **2.3** Welcome wizard (3 steps)
- [ ] **2.4** Mic permission & test
- [ ] **2.5** Age-based routing

#### Components:
```
src/components/groups/
├── auth/
│   ├── ParentRegistrationForm.tsx
│   ├── StudentDetailsForm.tsx
│   ├── ConsentForm.tsx
│   └── PaymentStep.tsx
├── onboarding/
│   ├── WelcomeWizard.tsx
│   ├── MicTest.tsx
│   ├── IntroVideo.tsx
│   └── FirstExercise.tsx
```

### Week 3: Core Layout & Navigation

#### Tasks:
- [ ] **3.1** Student dashboard layout
- [ ] **3.2** Bottom navigation (mobile)
- [ ] **3.3** Sidebar navigation (desktop)
- [ ] **3.4** Age-based theme switching
- [ ] **3.5** RTL optimization

#### Components:
```
src/components/groups/
├── layout/
│   ├── StudentLayout.tsx
│   ├── BottomNav.tsx
│   ├── Sidebar.tsx
│   └── Header.tsx
├── ui/
│   ├── ProgressCard.tsx
│   ├── ExerciseCard.tsx
│   ├── ChallengeCard.tsx
│   └── LeaderboardRow.tsx
```

---

## 📦 Phase 2: Core Features (שבועות 4-7)

### Week 4: Student Dashboard

#### Tasks:
- [ ] **4.1** Dashboard home page
- [ ] **4.2** Next lesson widget
- [ ] **4.3** Weekly progress chart
- [ ] **4.4** Today's exercises list
- [ ] **4.5** Group status widget

#### Pages:
```
src/pages/groups/
├── StudentDashboard.tsx
├── Exercises.tsx
├── Challenges.tsx
├── Group.tsx
└── Settings.tsx
```

### Week 5: Practice System

#### Tasks:
- [ ] **5.1** Exercise list view
- [ ] **5.2** Exercise detail/instruction view
- [ ] **5.3** Daily practice plan generation (algorithm)
- [ ] **5.4** Progress tracking (completion %)
- [ ] **5.5** Streak system

#### Edge Functions:
```typescript
// supabase/functions/generate-daily-plan/index.ts
// Generates personalized daily exercises based on:
// - Age group
// - Recent performance
// - Weakest areas
// - Engagement level

// supabase/functions/calculate-streak/index.ts
// Updates streak counter on practice completion
```

### Week 6: Exercise Player

#### Tasks:
- [ ] **6.1** Exercise player UI
- [ ] **6.2** Instructions display (text + video)
- [ ] **6.3** Timer/countdown
- [ ] **6.4** Demo audio playback
- [ ] **6.5** VU meter visualization

#### Components:
```
src/components/groups/practice/
├── ExercisePlayer.tsx
├── InstructionsPanel.tsx
├── Timer.tsx
├── DemoPlayer.tsx
├── VUMeter.tsx
└── ExerciseComplete.tsx
```

### Week 7: Results & Feedback UI

#### Tasks:
- [ ] **7.1** Results screen
- [ ] **7.2** Score display (animated)
- [ ] **7.3** AI feedback display
- [ ] **7.4** Compare with previous attempts
- [ ] **7.5** Share to challenge (optional)

---

## 📦 Phase 3: Recording & AI (שבועות 8-10)

### Week 8: Audio Recording

#### Tasks:
- [ ] **8.1** Mic permission handling
- [ ] **8.2** Recording component (Web Audio API)
- [ ] **8.3** Waveform visualization
- [ ] **8.4** Playback preview
- [ ] **8.5** Upload to Supabase Storage

#### Components:
```
src/components/groups/recording/
├── RecordingButton.tsx
├── RecordingOverlay.tsx
├── WaveformVisualizer.tsx
├── PlaybackPreview.tsx
└── UploadProgress.tsx
```

#### Hooks:
```typescript
// src/hooks/useAudioRecording.ts
// Manages recording state, permissions, upload

// src/hooks/useAudioPlayback.ts
// Audio playback with waveform
```

### Week 9: AI Analysis Integration

#### Tasks:
- [ ] **9.1** Gemini Audio API integration
- [ ] **9.2** Edge function for analysis
- [ ] **9.3** Feedback parsing & display
- [ ] **9.4** Error handling & retry
- [ ] **9.5** Hebrew feedback templates

#### Edge Functions:
```typescript
// supabase/functions/analyze-recording/index.ts
// Sends audio to Gemini, parses response, updates DB

// Prompt structure:
// - Context: exercise type, expected technique
// - Analysis: pitch, rhythm, breath, energy
// - Feedback: Hebrew, age-appropriate, encouraging
```

### Week 10: Analysis Dashboard

#### Tasks:
- [ ] **10.1** Weekly progress visualization
- [ ] **10.2** Strength/weakness indicators
- [ ] **10.3** Historical comparison
- [ ] **10.4** Recommendations panel
- [ ] **10.5** Parent view (read-only)

---

## 📦 Phase 4: Social & Challenges (שבועות 11-13)

### Week 11: Challenge System

#### Tasks:
- [ ] **11.1** Challenge list view
- [ ] **11.2** Challenge detail page
- [ ] **11.3** Join challenge flow
- [ ] **11.4** Record challenge entry
- [ ] **11.5** Submit & scoring

#### Pages:
```
src/pages/groups/challenges/
├── ChallengeList.tsx
├── ChallengeDetail.tsx
├── RecordEntry.tsx
├── ReviewEntry.tsx
└── ChallengeResults.tsx
```

### Week 12: Leaderboard & Comments

#### Tasks:
- [ ] **12.1** Leaderboard component (3 modes)
- [ ] **12.2** Entry playback
- [ ] **12.3** Comments system
- [ ] **12.4** Comment moderation (teacher)
- [ ] **12.5** Notifications

#### Components:
```
src/components/groups/challenges/
├── Leaderboard.tsx
├── LeaderboardRow.tsx
├── EntryPlayer.tsx
├── CommentsSection.tsx
└── CommentInput.tsx
```

### Week 13: Group Features

#### Tasks:
- [ ] **13.1** Group overview page
- [ ] **13.2** Members list
- [ ] **13.3** Group achievements
- [ ] **13.4** Upcoming lessons widget
- [ ] **13.5** Group activity feed

---

## 📦 Phase 5: Teacher Dashboard (שבועות 14-16)

### Week 14: Teacher Dashboard Core

#### Tasks:
- [ ] **14.1** Teacher layout
- [ ] **14.2** Group overview
- [ ] **14.3** Student list with status
- [ ] **14.4** Quick actions (message, view)
- [ ] **14.5** Alerts system

#### Pages:
```
src/pages/groups/teacher/
├── TeacherDashboard.tsx
├── StudentDetail.tsx
├── GroupAnalytics.tsx
├── ChallengeManager.tsx
└── ExerciseLibrary.tsx
```

### Week 15: Analytics & Reporting

#### Tasks:
- [ ] **15.1** Weekly statistics
- [ ] **15.2** Student progress cards
- [ ] **15.3** Engagement metrics
- [ ] **15.4** At-risk students alerts
- [ ] **15.5** Export reports

### Week 16: Challenge Management

#### Tasks:
- [ ] **16.1** Create challenge form
- [ ] **16.2** Song library integration
- [ ] **16.3** Scoring adjustments
- [ ] **16.4** Manual feedback entry
- [ ] **16.5** Archive challenges

---

## 📦 Phase 6: Polish & Launch (שבועות 17-18)

### Week 17: QA & Optimization

#### Tasks:
- [ ] **17.1** Cross-browser testing
- [ ] **17.2** Mobile responsiveness
- [ ] **17.3** Performance optimization
- [ ] **17.4** Error handling audit
- [ ] **17.5** Accessibility (a11y)

### Week 18: Launch Prep

#### Tasks:
- [ ] **18.1** Beta testing with real users
- [ ] **18.2** Feedback collection
- [ ] **18.3** Bug fixes
- [ ] **18.4** Documentation
- [ ] **18.5** Production deployment

---

## 🔧 Technical Specifications

### File Structure
```
src/
├── components/
│   └── groups/
│       ├── auth/
│       ├── onboarding/
│       ├── layout/
│       ├── dashboard/
│       ├── practice/
│       ├── recording/
│       ├── challenges/
│       └── teacher/
├── pages/
│   └── groups/
│       ├── student/
│       ├── teacher/
│       └── challenges/
├── hooks/
│   └── groups/
│       ├── useGroupStudent.ts
│       ├── useDailyPlan.ts
│       ├── useAudioRecording.ts
│       ├── useChallenge.ts
│       └── useProgress.ts
├── lib/
│   └── groups/
│       ├── audio.ts
│       ├── scoring.ts
│       └── exercises.ts
└── types/
    └── groups.ts
```

### API Endpoints (Edge Functions)
```
POST /functions/v1/groups/register
POST /functions/v1/groups/generate-daily-plan
POST /functions/v1/groups/upload-recording
POST /functions/v1/groups/analyze-recording
POST /functions/v1/groups/submit-challenge-entry
GET  /functions/v1/groups/student-progress/:id
GET  /functions/v1/groups/challenge/:id/leaderboard
POST /functions/v1/groups/teacher/create-challenge
```

### Environment Variables
```env
# Groups Platform
VITE_GEMINI_API_KEY=xxx
VITE_GROUPS_STORAGE_BUCKET=voicely-recordings
VITE_MAX_RECORDING_DURATION=90
VITE_AI_ANALYSIS_TIMEOUT=30000
```

---

## ✅ Definition of Done (per feature)

- [ ] Code complete & reviewed
- [ ] TypeScript types defined
- [ ] RLS policies tested
- [ ] Mobile responsive
- [ ] RTL support
- [ ] Error handling
- [ ] Loading states
- [ ] Empty states
- [ ] Hebrew translations

---

## 📊 Success Metrics (KPIs)

| Metric | Target (MVP) | Target (6 months) |
|--------|--------------|-------------------|
| Daily active users | 70% | 85% |
| Exercises completed/day | 2 | 3 |
| Challenge participation | 60% | 80% |
| AI feedback satisfaction | 4/5 | 4.5/5 |
| Student retention (monthly) | 80% | 90% |

---

## 🚀 Getting Started

### Prerequisites
```bash
# Install dependencies
npm install

# Setup Supabase
supabase link --project-ref jldfxkbczzxawdqsznze

# Run migrations
supabase db push
```

### Development
```bash
npm run dev
```

### Deployment
```bash
git push origin main  # Auto-deploys to Vercel
```

---

*Plan Version: 1.0*
*Last Updated: January 25, 2026*
