# Voicely Student Dashboard

## Project Overview
מערכת דשבורד לתלמידים של Voicely - מעקב והתקדמות בלמידת קול ושירה באמצעות AI.

## Tech Stack
- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + shadcn/ui
- **State Management:** TanStack Query (React Query)
- **Backend:** Supabase (Auth, Database, Storage)
- **Deployment:** Vercel

## Supabase Project (Production)
- **Project ID:** jldfxkbczzxawdqsznze
- **URL:** https://jldfxkbczzxawdqsznze.supabase.co
- **Dashboard:** https://supabase.com/dashboard/project/jldfxkbczzxawdqsznze

### Database Tables (27 tables)
**Users & Auth:** users, profiles, user_roles, user_sessions, permissions, role_permissions
**Progress:** user_progress, user_stats, user_achievements
**Lessons:** lessons, lesson_participants, groups, group_members
**Recordings:** recordings, user_recordings, ai_analysis, transcriptions
**Content:** vocal_exercises, achievements, leaderboards, leaderboard_entries
**AI:** embeddings, learning_insights
**Analytics:** analytics_events, search_history
**Sync:** notion_sync_log, sync_audit_log

### Key Enums
- `user_role`: student, teacher, admin
- `lesson_type`: one_on_one, group
- `achievement_type`: streak, score, completion, milestone, special
- `badge_rarity`: common, rare, epic, legendary
- `recording_status`: processing, processed, failed

## Repository Info
- **GitHub:** https://github.com/voicely-co-il/student-dashboard
- **Vercel:** https://vercel.com/voicelys-projects-bd7b93d9/student-dashboard
- **Organization:** voicely-co-il

---

## Git & Deployment Configuration

### Git Settings (Local to this project)
```bash
# Project-specific git identity
git config user.name "compumit"
git config user.email "info@compumit.com"

# Remote
git remote set-url origin git@github.com:voicely-co-il/student-dashboard.git
```

### GitHub Access
- **Organization:** voicely-co-il
- **Repository:** student-dashboard
- **SSH Key:** Use the SSH key configured for `voicely-co-il` org
- **Clone URL:** `git@github.com:voicely-co-il/student-dashboard.git`

### Vercel Project
- **Project Name:** voicely-il
- **Team:** voicelys-projects-bd7b93d9
- **Main Domain:** https://voicely-il.vercel.app
- **Auto-Deploy:** Push to `main` triggers production deploy
- **Vercel Token:** Stored in `.env` as `VERCEL_TOKEN`

### Module Domains
| מודול | דומיין | Route |
|-------|--------|-------|
| תלמיד | https://voicely-student.vercel.app | `/student` |
| מורה | https://voicely-teacher.vercel.app | `/teacher` |
| צ'אט | https://voicely-chat.vercel.app | `/student/chat` |
| צ'אטבוט | https://voicely-chatbot.vercel.app | `/chat` |

### Supabase Project
- **Project ID:** jldfxkbczzxawdqsznze
- **Region:** (check dashboard)
- **CLI Config:** `supabase link --project-ref jldfxkbczzxawdqsznze`

### Important: Avoid Cross-Project Conflicts
**CRITICAL:** When working in this project:
1. **Always verify working directory** before git/supabase commands
2. **Use project-specific credentials** - never use global defaults
3. **Check `git remote -v`** before pushing
4. **This project path:** `/Users/mit/Documents/GitHub/Voicely/Student Dash`
5. **Do NOT confuse with MAMA project:** `/Users/mit/Documents/GitHub/MAMA`

### Deployment Commands
```bash
# Deploy to production (via git)
git add . && git commit -m "message" && git push origin main

# Direct Vercel deploy (if needed)
vercel --prod

# Supabase migrations
supabase db push
supabase gen types typescript --project-id jldfxkbczzxawdqsznze > src/integrations/supabase/types.ts
```

---

## Project Structure
```
src/
├── components/     # React components
│   └── ui/         # shadcn/ui components
├── hooks/          # Custom React hooks
├── integrations/   # External service integrations
│   └── supabase/   # Supabase client & types
├── lib/            # Utility functions
├── pages/          # Page components
└── App.tsx         # Main app component
```

## Environment Variables
Environment variables are stored in `.env` (local) and configured in Vercel for production.

**Required variables:**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon/public key

**IMPORTANT:** Never commit API keys or secrets to the repository.

## Development Commands
```bash
npm install     # Install dependencies
npm run dev     # Start dev server (port 8080)
npm run build   # Production build
npm run preview # Preview production build
npm run lint    # Run ESLint
npm run sync    # Incremental sync from Google Drive
npm run sync:full  # Full sync from Google Drive (all transcripts)
```

## Vector Search & AI Features

### Architecture
```
Google Drive (25K+ transcripts)
        ↓
   Sync Script (scripts/sync-gdrive.ts)
        ↓
┌───────────────────────────────────┐
│         Supabase                  │
├───────────────────────────────────┤
│ PostgreSQL    │  pgvector         │
│ - transcripts │  - chunks         │
│ - insights    │  - embeddings     │
└───────────────────────────────────┘
        ↓
   Edge Functions (Claude/OpenAI)
        ↓
   Dashboard UI
```

### Edge Functions
- `search-transcripts` - Semantic search across all lessons
- `search-website` - Semantic search in website content (RAG)
- `generate-lesson-plan` - AI-generated lesson plans based on history
- `teacher-chat` - AI chat with context from transcripts & website

### Database Tables (pgvector)
**Transcripts:**
- `transcripts` - Full transcript metadata & content
- `transcript_chunks` - Chunked content with vector embeddings
- `transcript_insights` - AI-extracted insights
- `gdrive_sync_log` - Sync tracking

**Website RAG:**
- `website_content` - Scraped website pages with metadata
- `website_content_chunks` - Chunked content with vector embeddings
- `website_scrape_log` - Scrape tracking

### Website Content (RAG)
Sources indexed for semantic search:
- **voicely.co.il** - Main website (services, pricing, testimonials)
- **juniors.voicely.co.il** - Kids program (ages 10-14)

Content types: `page`, `service`, `course`, `faq`, `testimonial`, `blog_post`, `pricing`, `teacher_bio`

```bash
npm run scrape          # Scrape all websites
npm run scrape:main     # Scrape main site only
npm run scrape:juniors  # Scrape juniors site only
```

### Google Drive Integration
- MCP Server: `@modelcontextprotocol/server-gdrive`
- Credentials: `~/.google/gcp-oauth.keys.json`
- Source folder: `1phKpNENjzPvc7FvMdJaySoFWVIu797f1` (תמלולים עדכניים)

## RTL Support
The app is configured for RTL (Hebrew) by default:
- `<html lang="he" dir="rtl">`
- Font: Assistant (Google Fonts)

## Deployment
- Push to `main` branch triggers auto-deploy to Vercel
- Preview deployments for pull requests

## Notion Integration

### API Access
יש גישה מלאה ל-Notion API לניהול משימות ו-CRM.

**Credentials (in .env):**
- `NOTION_API_KEY` - Notion Integration Token
- `NOTION_CRM_DATABASE_ID` - CRM Database (תלמידים)
- `NOTION_TASKS_DATABASE_ID` - Tasks Database (משימות פרויקט)

### Notion Databases
- **CRM:** https://www.notion.so/compumit/09c40931bcd34dd0a624d7fdd975e2a7
- **Tasks:** https://www.notion.so/compumit/2ed946caa5da80cca804c4d425850efe

### Tasks Management Script
```bash
npx tsx scripts/notion-tasks.ts --list          # List all tasks
npx tsx scripts/notion-tasks.ts --sync          # Sync tasks
npx tsx scripts/notion-tasks.ts --add "Task" --status "בתהליך" --category "דשבורד"
```

**Status options:** `הושלם`, `בתהליך`, `לא התחיל`
**Categories:** `תלמיד`, `מורה`, `צ'אט`, `צ'אטבוט`

### Claude Instructions for Notion
**IMPORTANT:** When working on tasks:
1. **Always use Notion API** to track task status changes
2. Run `npx tsx scripts/notion-tasks.ts --add "Task name" --status "בתהליך" --category "קטגוריה"` when starting a new task
3. Update task status to `הושלם` when done
4. Use the Tasks database as the single source of truth

### Task Completion Protocol
**When completing a task, ALWAYS update Notion:**

```bash
# Update task status to completed
npx tsx -e '
import "dotenv/config";
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const TASKS_DB = process.env.NOTION_TASKS_DATABASE_ID;

async function complete(taskName) {
  const res = await fetch(`https://api.notion.com/v1/databases/${TASKS_DB}/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${NOTION_API_KEY}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
    body: JSON.stringify({ filter: { property: "משימה", title: { contains: taskName } } })
  });
  const { results } = await res.json();
  if (results[0]) {
    await fetch(`https://api.notion.com/v1/pages/${results[0].id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${NOTION_API_KEY}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
      body: JSON.stringify({ properties: { "סטטוס": { select: { name: "הושלם" } } } })
    });
    console.log("✅ Task completed:", taskName);
  }
}
complete("TASK_NAME_HERE");
'
```

**Category Guide:**
| קטגוריה | מה נכנס לכאן |
|---------|-------------|
| `תלמיד` | דשבורד תלמיד, Auth, הקלטות, גיימיפיקציה, UI תלמיד |
| `מורה` | דשבורד מורה, אנליטיקס, ניהול שיעורים, כלי מורה |
| `צ'אט` | צ'אט חי, צ'אט מורה, Widget, העברה לנציג |
| `צ'אטבוט` | AI, RAG, סנכרון, Edge Functions, צ'אטבוט לקוח |

### Notion API Usage (Direct)
```typescript
// Query CRM
const response = await fetch(`https://api.notion.com/v1/databases/${NOTION_CRM_DATABASE_ID}/query`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${NOTION_API_KEY}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ page_size: 100 })
});
```

## Related Projects
- **MAMA (Senior Dashboard):** /Users/mit/Documents/GitHub/MAMA/src
