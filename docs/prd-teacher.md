# PRD: מורה (Teacher Dashboard)
> Product Requirements Document v1.0

## Overview
דשבורד למורים של Voicely - ניהול תלמידים, אנליטיקס, ותזמון שיעורים.

---

## Status Summary (from Notion)

| Status | Count |
|--------|-------|
| ✅ הושלם | 3 |
| 🟡 בתהליך | 1 |
| ❌ לא התחיל | 5 |

---

## User Roles

### Inbal (Admin)
- Full access to all features
- Can see all students across all teachers
- Business analytics and revenue
- System administration

### Other Teachers (Limited)
- See only their assigned students
- Cannot access other teachers' data
- No business analytics
- No system settings

---

## ✅ Completed Features

### Database & Schema
- [x] **סכמת Database לשיעורים** - Lessons schema with teacher_id, student_id, group_id

### Analytics Foundation
- [x] **דשבורד אנליטיקס** - Analytics dashboard structure
- [x] **ויזואליזציות** - Charts and visualizations (using Recharts)

---

## 🟡 In Progress Features

### 1. חיבור Hooks לנתונים (Connect Hooks to Real Data)
**Description:** Wire analytics dashboard to real Supabase data

**Requirements:**
- Teacher sees only their students' data (RLS enforced)
- Admin sees aggregate data across all teachers
- Real-time updates for live metrics

**Data Points:**
| Metric | Source Table |
|--------|--------------|
| Total students | `profiles` (role='student', teacher_id=current) |
| Active students | `user_sessions` (last 7 days) |
| Total lessons | `lessons` |
| Practice hours | `user_stats.total_practice_minutes` |
| Avg streak | `user_stats.current_streak` |

**Acceptance Criteria:**
- [ ] Dashboard shows real student count
- [ ] Charts use real data, not mock
- [ ] Admin view shows all; teacher view shows own
- [ ] Loading states while fetching

---

## ❌ Not Started Features

### 2. UI לתזמון שיעורים (Lesson Scheduling UI)
**Priority:** High
**Description:** Interface for scheduling 1-on-1 and group lessons

**Requirements:**
- Calendar view (weekly/monthly)
- Create new lesson with date, time, duration, student/group
- Edit/cancel existing lessons
- Recurring lessons support
- Conflict detection

**Integration:**
- Optional: Cal.com integration (see צ'אטבוט PRD)
- Supabase `lessons` table

**Acceptance Criteria:**
- [ ] Calendar displays all scheduled lessons
- [ ] Can create new lesson with form
- [ ] Can edit/delete lessons
- [ ] Shows conflicts if double-booked
- [ ] Students see lessons in their dashboard

---

### 3. הצטרפות לשיעור (Lesson Join)
**Priority:** Medium
**Description:** Join link/button for online lessons

**Requirements:**
- Generate unique lesson link
- "Join Now" button appears 10 min before lesson
- Integration options: Zoom, Google Meet, or custom
- Track attendance automatically

**Acceptance Criteria:**
- [ ] Lesson has join link
- [ ] Button appears at appropriate time
- [ ] Attendance logged when student joins
- [ ] Works on mobile

---

### 4. ניהול שיעורי קבוצה (Group Lessons Management)
**Priority:** Medium
**Description:** Manage group lessons and membership

**Requirements:**
- Create/edit groups
- Add/remove students from groups
- Schedule group lessons
- Track group attendance
- Group analytics (who attended, who missed)

**Database:** `groups`, `group_members`, `lessons` (with group_id)

**Acceptance Criteria:**
- [ ] Can create new group
- [ ] Can add students to group
- [ ] Can schedule group lesson
- [ ] Attendance tracked per student
- [ ] Analytics show group stats

---

### 5. ייצוא נתונים (Data Export)
**Priority:** Low
**Description:** Export reports for business/tax purposes

**Export Types:**
| Report | Format | Contents |
|--------|--------|----------|
| Student list | CSV/Excel | Name, email, lessons count, status |
| Lessons report | CSV | Date, student, duration, notes |
| Revenue report | CSV | Student, amount, date (Admin only) |
| Progress report | PDF | Individual student progress summary |

**Acceptance Criteria:**
- [ ] Can export student list as CSV
- [ ] Can export lessons report with date filter
- [ ] Admin can export revenue report
- [ ] PDF generation for progress reports

---

### 6. תזכורות שיעורים (Lesson Reminders)
**Priority:** Medium
**Description:** Automated reminders for upcoming lessons

**Reminder Schedule:**
| When | Channel |
|------|---------|
| 1 day before | Email + WhatsApp |
| 1 hour before | Push notification + WhatsApp |
| 10 min before | Push notification |

**Requirements:**
- Configurable reminder settings per student
- Teacher can disable for specific lessons
- Track delivery status

**Technical:**
- Vercel Cron job checks upcoming lessons
- Edge function sends notifications
- WhatsApp via Business API (see צ'אטבוט PRD)

**Acceptance Criteria:**
- [ ] Reminders sent at configured times
- [ ] Student can configure preferences
- [ ] Delivery status logged
- [ ] No duplicate reminders

---

## Database Schema (Relevant Tables)

```sql
-- Lessons
lessons: id, teacher_id, student_id, group_id, scheduled_at,
         duration_minutes, lesson_type, status, notes,
         join_link, created_at, updated_at

-- Groups
groups: id, name, teacher_id, description, max_students,
        created_at, updated_at

group_members: id, group_id, user_id, joined_at, status

-- Analytics (aggregated)
analytics_events: id, event_type, user_id, teacher_id,
                  metadata, created_at
```

---

## UI Components Needed

| Component | Status | Location |
|-----------|--------|----------|
| `TeacherDashboard` | ✅ Exists | `src/pages/teacher/` |
| `AnalyticsCharts` | ✅ Exists | Uses Recharts |
| `LessonCalendar` | ❌ Missing | - |
| `LessonForm` | ❌ Missing | - |
| `GroupManager` | ❌ Missing | - |
| `ExportModal` | ❌ Missing | - |

---

## Permission Matrix

| Action | Admin | Teacher | Student |
|--------|-------|---------|---------|
| View all students | ✅ | ❌ (own only) | ❌ |
| Schedule lessons | ✅ | ✅ (own) | ❌ |
| View analytics | ✅ (all) | ✅ (own) | ❌ |
| Export data | ✅ | ✅ (own) | ❌ |
| Business reports | ✅ | ❌ | ❌ |
| System settings | ✅ | ❌ | ❌ |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Lessons scheduled via platform | 80%+ |
| Reminder effectiveness | <5% no-shows |
| Teacher daily usage | 1+ session/day |
| Data export usage | Monthly |
