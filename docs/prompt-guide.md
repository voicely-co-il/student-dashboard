# Effective Prompt Guide for Claude Code
> איך לתת הוראות יעילות שחוסכות טוקנים ומקבלות תוצאות טובות

---

## The CONTEXT-TASK-CRITERIA Framework

### 1. CONTEXT (50% of prompt quality)
הנתון הכי חשוב. ככל שהקונטקסט יותר ספציפי, התוצאה יותר טובה.

**Bad:**
```
תבנה לי פיצ'ר של הישגים
```

**Good:**
```
CONTEXT:
- Product: Student Dashboard (docs/prd-student.md)
- Feature: Achievement Logic (לוגיקת צבירת הישגים)
- Related tables: achievements, user_achievements (see schema in PRD)
- Related code: src/hooks/useAchievements.ts (exists but empty)
- Current state: UI exists, backend logic missing
```

---

### 2. TASK (Be Specific)
מה בדיוק צריך לעשות. לא "תבנה פיצ'ר" אלא שלבים מדויקים.

**Bad:**
```
תבנה את הפיצ'ר
```

**Good:**
```
TASK:
1. Create Edge Function `check-achievement` that:
   - Receives: { user_id, action_type, action_data }
   - Checks if any achievements are unlocked
   - Returns: { unlocked: Achievement[] }

2. Create hook `useCheckAchievement` that:
   - Calls the Edge Function
   - Shows toast notification on unlock
   - Updates local cache

3. Integrate in:
   - After lesson completion (src/hooks/useLessons.ts)
   - After streak update (src/hooks/useStreak.ts)
```

---

### 3. CRITERIA (Acceptance Criteria)
איך יודעים שזה עובד? רשימת צ'ק מדויקת.

**Good:**
```
ACCEPTANCE CRITERIA:
- [ ] 7-day streak unlocks "Week Warrior" badge
- [ ] 1000 XP unlocks "Rising Star" badge
- [ ] No duplicate achievements (check before insert)
- [ ] Toast appears with badge name and XP reward
- [ ] Works offline (queues check for later)
```

---

## Prompt Templates

### Template 1: New Feature
```
## Context
Product: {product name} (docs/prd-{product}.md)
Feature: {feature name from PRD}
Related: {existing files/tables}
State: {what exists, what's missing}

## Task
{numbered steps of what to build}

## Constraints
- {technical constraints}
- {don't do X}
- {must use Y}

## Acceptance Criteria
- [ ] {testable criterion 1}
- [ ] {testable criterion 2}
```

### Template 2: Bug Fix
```
## Problem
{describe the bug in one sentence}

## Steps to Reproduce
1. {step 1}
2. {step 2}
3. {expected vs actual}

## Relevant Files
- {file1.ts:line}
- {file2.ts}

## Constraint
Fix only this bug. Don't refactor surrounding code.
```

### Template 3: Research/Exploration
```
## Question
{what you want to understand}

## Scope
- Look in: {folders/files}
- Ignore: {folders to skip}

## Output Format
{how you want the answer - list, table, code examples}
```

---

## Anti-Patterns (What NOT to Do)

### ❌ Vague Request
```
תעשה את זה יותר טוב
```

### ❌ No Context
```
תוסיף כפתור
```
(איפה? איזה כפתור? מה הוא עושה?)

### ❌ Too Broad
```
תבנה את כל הדשבורד
```
(פרק לפיצ'רים קטנים)

### ❌ Assuming Knowledge
```
תתקן את הבאג שדיברנו עליו
```
(תמיד תן קונטקסט מחדש)

---

## Efficient Patterns

### ✅ Reference PRD
```
Implement "UI לתזמון שיעורים" from docs/prd-teacher.md
See acceptance criteria in the PRD.
```

### ✅ Point to Existing Code
```
Similar to how src/hooks/useLiveChat.ts works,
create useTeacherChat.ts for the teacher chat view.
```

### ✅ Specify Output
```
Create the Edge Function.
Don't create tests yet - I'll ask separately.
Don't add comments unless logic is non-obvious.
```

### ✅ Batch Related Tasks
```
Implement all 3 dashboard cards (XP, Streak, DailyGoal)
with real data. They share the same data source.
```

---

## When to Use What

| Situation | Approach |
|-----------|----------|
| New feature | Use Template 1 with PRD reference |
| Bug fix | Use Template 2, be specific |
| Exploration | Ask directly, or use Explore agent |
| Refactor | Specify scope clearly |
| Multiple related tasks | Batch in one prompt |
| Complex multi-step | Use EnterPlanMode |

---

## Token-Saving Tips

1. **PRDs save tokens** - Reference instead of re-explaining
2. **Don't repeat context** - Say "same context as before"
3. **Batch related work** - One prompt > multiple small ones
4. **Be specific** - Fewer iterations = fewer tokens
5. **Explore agents** - Let them search instead of you asking multiple questions

---

## Example: Full Prompt

```
## Context
Product: תלמיד (docs/prd-student.md)
Feature: חיבור מטריקות לDB
Current: Cards exist in src/components/dashboard/ but use mock data
Tables: user_stats, daily_goals (schema in PRD)

## Task
1. Create useStudentStats hook that fetches from user_stats
2. Create useDailyGoals hook that fetches from daily_goals
3. Connect XPLevelCard to useStudentStats
4. Connect StreakCard to useStudentStats
5. Connect DailyGoalCard to useDailyGoals

## Constraints
- Use TanStack Query for caching
- Real-time updates via Supabase subscription
- Handle loading/error states
- Don't modify UI design, only data source

## Acceptance Criteria
- [ ] XP card shows real xp_points from DB
- [ ] Streak card shows real current_streak
- [ ] Daily goal shows today's progress
- [ ] Updates within 2 seconds of DB change
- [ ] Loading skeleton while fetching
- [ ] Error toast if fetch fails
```

---

## Quick Reference

| Need | Say |
|------|-----|
| New feature | "Implement {feature} from docs/prd-{x}.md" |
| Data wiring | "Connect {component} to {table} using {pattern}" |
| Similar code | "Like {existing}, create {new}" |
| Bug fix | "Fix: {symptom}. Cause in {file}:{line}" |
| Don't over-engineer | "Fix only this. Don't refactor." |
| Output format | "Return as {table/list/code}" |
