# Voicely PRDs (Product Requirements Documents)

## Quick Status

| Product | Completed | In Progress | Not Started | Total |
|---------|-----------|-------------|-------------|-------|
| [תלמיד](prd-student.md) | 10 | 4 | 5 | 19 |
| [מורה](prd-teacher.md) | 3 | 1 | 5 | 9 |
| [צ'אט](prd-chat.md) | 3 | 1 | 0 | 4 |
| [צ'אטבוט](prd-chatbot.md) | 9 | 0 | 16 | 25 |
| **Total** | **25** | **6** | **26** | **57** |

---

## Priority Tasks (In Progress)

### תלמיד
1. מעקב התקדמות - Dashboard progress tracking
2. UI כרטיסי כוכבים - Achievement cards UI
3. חיבור מטריקות לDB - Connect metrics to database

### מורה
1. חיבור Hooks לנתונים - Wire analytics to real data

### צ'אט
1. העברה לנציג אנושי - Human handoff flow

---

## High Priority (Not Started)

| Product | Task | Why |
|---------|------|-----|
| צ'אטבוט | WhatsApp Business API | Highest ROI for leads |
| צ'אטבוט | Cal.com Integration | Enable booking via chat |
| צ'אטבוט | Recording AI Analysis | Core product value |
| תלמיד | לוגיקת צבירת הישגים | Gamification backend |
| מורה | UI לתזמון שיעורים | Core teacher workflow |

---

## Files

- [prd-student.md](prd-student.md) - Student Dashboard PRD
- [prd-teacher.md](prd-teacher.md) - Teacher Dashboard PRD
- [prd-chat.md](prd-chat.md) - Live Chat System PRD
- [prd-chatbot.md](prd-chatbot.md) - AI Chatbot & Integrations PRD

---

## How to Use These PRDs

### When Starting a Task
```
Reference: docs/prd-{product}.md, section {feature name}
```

### Example Prompt
```
I'm working on "לוגיקת צבירת הישגים" from the תלמיד product.

Context: docs/prd-student.md#achievement-logic

Requirements:
- Edge function to check achievements on user action
- Notification when achievement unlocked
- Prevent duplicate awards

Acceptance criteria:
- [ ] Streak achievements trigger correctly
- [ ] XP milestones trigger correctly
- [ ] User notified of new achievement
- [ ] No duplicate achievements possible

Please implement this feature.
```

---

## Updating PRDs

When a task is completed:
1. Update Notion: `npx tsx scripts/notion-tasks.ts --update "Task Name" --status "הושלם"`
2. The PRD reflects Notion as source of truth

---

## Notion Integration

```bash
# List all tasks
npx tsx scripts/notion-tasks.ts --list

# Add new task
npx tsx scripts/notion-tasks.ts --add "Task Name" --status "בתהליך" --category "תלמיד"

# Update task status
npx tsx scripts/notion-tasks.ts --update "Task Name" --status "הושלם"
```
