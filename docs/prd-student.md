# PRD: תלמיד (Student Dashboard)
> Product Requirements Document v1.0

## Overview
דשבורד אישי לתלמידי Voicely למעקב התקדמות, גיימיפיקציה, והקלטות.

---

## Status Summary (from Notion)

| Status | Count |
|--------|-------|
| ✅ הושלם | 10 |
| 🟡 בתהליך | 4 |
| ❌ לא התחיל | 5 |

---

## ✅ Completed Features

### Authentication & Security
- [x] **התחברות עם אימייל/סיסמה** - Email/password authentication
- [x] **הגנה על Routes** - Protected routes with auth guards
- [x] **RLS Policies** - Row Level Security for data isolation
- [x] **ניהול סשנים** - Session management
- [x] **Audit Log** - Action logging for security

### UI Foundation
- [x] **Header + Navigation** - Top navigation bar
- [x] **Bottom Navigation** - Mobile bottom nav
- [x] **עיצוב דף הבית** - Homepage design

### Database
- [x] **סכמת Database להקלטות** - Recordings schema
- [x] **סכמת Database להישגים** - Achievements/badges schema

---

## 🟡 In Progress Features

### 1. מעקב התקדמות (Progress Tracking)
**Description:** Dashboard showing student progress over time

**Requirements:**
- Display lesson count, hours practiced, current level
- Show progress graph (weekly/monthly)
- Pull data from `user_progress` and `user_stats` tables

**Acceptance Criteria:**
- [ ] Shows total lessons completed
- [ ] Shows current XP level
- [ ] Shows progress graph with trend line
- [ ] RTL layout correct

---

### 2. UI כרטיסי כוכבים (Star/Achievement Cards)
**Description:** Visual cards showing achievements and badges

**Requirements:**
- Badge display by rarity (common/rare/epic/legendary)
- Animation on unlock
- Click to view badge details

**Acceptance Criteria:**
- [ ] Displays earned badges with correct rarity colors
- [ ] Shows locked badges as grayed out
- [ ] Click reveals badge description and earn date

---

### 3. חיבור מטריקות לDB (Connect Metrics to DB)
**Description:** Wire dashboard UI to real Supabase data

**Requirements:**
- Connect XP level card to `user_stats.xp_points`
- Connect streak card to `user_stats.current_streak`
- Connect daily goal to `daily_goals` table
- Real-time updates via Supabase subscriptions

**Acceptance Criteria:**
- [ ] All dashboard cards show real data
- [ ] Updates reflect immediately (no refresh needed)
- [ ] Handles loading and error states

---

## ❌ Not Started Features

### 4. לוח מובילים (Leaderboard)
**Priority:** Medium
**Description:** Weekly leaderboard showing top practicing students

**Requirements:**
- Weekly reset
- Show top 10 students
- Student can see their rank even if not in top 10
- Anonymization option for privacy

**Database:** `leaderboards`, `leaderboard_entries` tables

**Acceptance Criteria:**
- [ ] Shows top 10 with rank, name, XP
- [ ] Current user highlighted
- [ ] Weekly reset happens automatically
- [ ] Privacy mode hides real names

---

### 5. לוגיקת צבירת הישגים (Achievement Logic)
**Priority:** High
**Description:** Backend logic for earning badges/achievements

**Achievement Types:**
| Type | Trigger Example |
|------|-----------------|
| `streak` | 7-day streak reached |
| `score` | 1000 XP earned |
| `completion` | 10 lessons completed |
| `milestone` | First recording uploaded |
| `special` | Holiday events |

**Requirements:**
- Edge function to check achievements on user action
- Notification when achievement unlocked
- Prevent duplicate awards

**Acceptance Criteria:**
- [ ] Streak achievements trigger correctly
- [ ] XP milestones trigger correctly
- [ ] User notified of new achievement
- [ ] No duplicate achievements possible

---

### 6. דף הגדרות (Settings Page)
**Priority:** Low
**Description:** User settings and preferences

**Settings:**
- Profile editing (name, avatar)
- Notification preferences
- Language (Hebrew/English future)
- Privacy settings (leaderboard visibility)
- Account actions (logout, delete account)

**Acceptance Criteria:**
- [ ] Can edit profile name/avatar
- [ ] Can toggle notifications
- [ ] Can hide from leaderboard
- [ ] Logout works correctly
- [ ] Delete account with confirmation

---

### 7. UI להקלטה (Recording UI)
**Priority:** Medium
**Description:** Interface for students to record and upload practice

**Requirements:**
- In-browser audio recording
- Playback before upload
- Upload to Supabase Storage
- Show upload progress

**Technical:**
- Use Web Audio API / MediaRecorder
- Storage bucket: `recordings/{user_id}/`
- Signed URLs for playback

**Acceptance Criteria:**
- [ ] Can start/stop recording
- [ ] Can playback before uploading
- [ ] Upload shows progress bar
- [ ] Recording appears in "My Recordings"

---

### 8. Voice Analysis AI
**Priority:** Low (Phase 3)
**Description:** AI analysis of student recordings

**Features:**
- Pitch accuracy analysis
- Rhythm analysis
- Personalized feedback
- Progress comparison over time

**Dependencies:**
- Recording UI must be complete
- AI model selection (OpenAI Whisper + custom)

---

### 9. Practice Prompts
**Priority:** Low
**Description:** AI-generated daily practice suggestions

**Features:**
- Based on student's recent lessons
- Based on areas for improvement
- Quick-start exercises

**Dependencies:**
- Transcript AI analysis
- User progress data

---

## Database Schema (Relevant Tables)

```sql
-- Core user stats
user_stats: id, user_id, xp_points, current_level, current_streak,
            longest_streak, total_practice_minutes, created_at, updated_at

-- Achievements
achievements: id, name, description, type, criteria, badge_image_url,
              rarity, xp_reward, created_at

user_achievements: id, user_id, achievement_id, earned_at

-- Recordings
recordings: id, user_id, file_url, duration_seconds, status,
            ai_analysis, created_at

-- Daily goals
daily_goals: id, user_id, date, target_minutes, completed_minutes,
             completed, created_at
```

---

## UI Components Needed

| Component | Status | File |
|-----------|--------|------|
| `XPLevelCard` | 🟡 Exists | `src/components/dashboard/XPLevelCard.tsx` |
| `StreakCard` | 🟡 Exists | `src/components/dashboard/StreakCard.tsx` |
| `DailyGoalCard` | 🟡 Exists | `src/components/dashboard/DailyGoalCard.tsx` |
| `BadgesCard` | 🟡 Exists | `src/components/dashboard/BadgesCard.tsx` |
| `Leaderboard` | ❌ Missing | - |
| `SettingsPage` | ❌ Missing | - |
| `RecordingUI` | ❌ Missing | - |

---

## API Endpoints (Edge Functions)

| Endpoint | Status | Purpose |
|----------|--------|---------|
| `check-achievement` | ❌ | Check and award achievements |
| `update-streak` | ❌ | Update daily streak |
| `get-practice-prompts` | ❌ | AI practice suggestions |
| `analyze-recording` | ❌ | AI analysis of recording |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Daily active users | 70% of students |
| Average session time | 5+ minutes |
| Streak retention (7+ days) | 40% of users |
| Recording uploads/week | 2+ per active user |
