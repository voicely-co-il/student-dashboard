/**
 * Notion Tasks Manager
 *
 * This script manages tasks in Notion for the Voicely Dashboard project.
 * It can:
 * - Create a new tasks database
 * - Add/update tasks
 * - Read tasks and their status
 * - Sync with local TASKS.md
 *
 * Usage:
 *   npx tsx scripts/notion-tasks.ts --create-db     # Create tasks database
 *   npx tsx scripts/notion-tasks.ts --sync          # Sync tasks from TASKS.md
 *   npx tsx scripts/notion-tasks.ts --list          # List all tasks
 *   npx tsx scripts/notion-tasks.ts --add "Task name" --status todo
 */

import "dotenv/config";

// Types
interface NotionTask {
  id: string;
  name: string;
  status: "הושלם" | "בתהליך" | "לא התחיל";
  category: string;
  priority: "גבוהה" | "בינונית" | "נמוכה";
  notes?: string;
}

interface NotionPage {
  id: string;
  properties: Record<string, unknown>;
}

// Environment
const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const NOTION_VERSION = "2022-06-28";

// The parent page ID for the tasks database (extract from URL)
// https://www.notion.so/compumit/Vocal-Dashboard-MVP-Actions-2ed946caa5da80cca804c4d425850efe
const TASKS_PAGE_ID = "2ed946caa5da80cca804c4d425850efe";

// Database ID (will be set after creation or read from env)
let TASKS_DATABASE_ID = process.env.NOTION_TASKS_DATABASE_ID || "";

// Helper: Make Notion API request
async function notionRequest(
  endpoint: string,
  method: string = "GET",
  body?: unknown
): Promise<unknown> {
  const url = `https://api.notion.com/v1${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Get page info
async function getPageInfo(pageId: string): Promise<unknown> {
  return notionRequest(`/pages/${pageId}`);
}

// Get block children (to find existing database)
async function getBlockChildren(blockId: string): Promise<{ results: Array<{ type: string; id: string; child_database?: { title: string } }> }> {
  return notionRequest(`/blocks/${blockId}/children`) as Promise<{ results: Array<{ type: string; id: string; child_database?: { title: string } }> }>;
}

// Create tasks database
async function createTasksDatabase(): Promise<string> {
  console.log("Creating tasks database in Notion...");

  const database = await notionRequest("/databases", "POST", {
    parent: {
      type: "page_id",
      page_id: TASKS_PAGE_ID,
    },
    title: [
      {
        type: "text",
        text: { content: "משימות פרויקט - Voicely Dashboard" },
      },
    ],
    properties: {
      // Task name (title)
      "משימה": {
        title: {},
      },
      // Status
      "סטטוס": {
        select: {
          options: [
            { name: "הושלם", color: "green" },
            { name: "בתהליך", color: "yellow" },
            { name: "לא התחיל", color: "red" },
          ],
        },
      },
      // Category
      "קטגוריה": {
        select: {
          options: [
            { name: "אותנטיקציה", color: "blue" },
            { name: "דשבורד", color: "purple" },
            { name: "צ'אט", color: "orange" },
            { name: "אדמין", color: "pink" },
            { name: "הקלטות", color: "red" },
            { name: "שיעורים", color: "green" },
            { name: "גיימיפיקציה", color: "yellow" },
            { name: "AI", color: "gray" },
            { name: "סנכרון", color: "brown" },
          ],
        },
      },
      // Priority
      "עדיפות": {
        select: {
          options: [
            { name: "גבוהה", color: "red" },
            { name: "בינונית", color: "yellow" },
            { name: "נמוכה", color: "gray" },
          ],
        },
      },
      // Notes
      "הערות": {
        rich_text: {},
      },
      // Created date
      "תאריך יצירה": {
        created_time: {},
      },
      // Last edited
      "עודכן לאחרונה": {
        last_edited_time: {},
      },
    },
  });

  const dbId = (database as { id: string }).id;
  console.log(`✅ Database created: ${dbId}`);
  console.log(`\nAdd to .env: NOTION_TASKS_DATABASE_ID="${dbId}"`);

  return dbId;
}

// Find existing database in page
async function findExistingDatabase(): Promise<string | null> {
  try {
    const children = await getBlockChildren(TASKS_PAGE_ID);

    for (const block of children.results) {
      if (block.type === "child_database") {
        console.log(`Found existing database: ${block.child_database?.title}`);
        return block.id;
      }
    }
  } catch {
    console.log("Could not find existing database");
  }
  return null;
}

// Add task to database
async function addTask(
  name: string,
  status: "הושלם" | "בתהליך" | "לא התחיל",
  category: string,
  priority: "גבוהה" | "בינונית" | "נמוכה" = "בינונית",
  notes?: string
): Promise<string> {
  if (!TASKS_DATABASE_ID) {
    throw new Error("TASKS_DATABASE_ID not set. Run with --create-db first.");
  }

  const properties: Record<string, unknown> = {
    "משימה": {
      title: [{ text: { content: name } }],
    },
    "סטטוס": {
      select: { name: status },
    },
    "קטגוריה": {
      select: { name: category },
    },
    "עדיפות": {
      select: { name: priority },
    },
  };

  if (notes) {
    properties["הערות"] = {
      rich_text: [{ text: { content: notes } }],
    };
  }

  const page = await notionRequest("/pages", "POST", {
    parent: { database_id: TASKS_DATABASE_ID },
    properties,
  });

  return (page as { id: string }).id;
}

// Get all tasks from database
async function getTasks(): Promise<NotionTask[]> {
  if (!TASKS_DATABASE_ID) {
    throw new Error("TASKS_DATABASE_ID not set.");
  }

  const response = await notionRequest(
    `/databases/${TASKS_DATABASE_ID}/query`,
    "POST",
    { page_size: 100 }
  ) as { results: NotionPage[] };

  return response.results.map((page) => {
    const props = page.properties as Record<string, { title?: Array<{ plain_text: string }>; select?: { name: string }; rich_text?: Array<{ plain_text: string }> }>;
    return {
      id: page.id,
      name: props["משימה"]?.title?.[0]?.plain_text || "",
      status: (props["סטטוס"]?.select?.name || "לא התחיל") as NotionTask["status"],
      category: props["קטגוריה"]?.select?.name || "",
      priority: (props["עדיפות"]?.select?.name || "בינונית") as NotionTask["priority"],
      notes: props["הערות"]?.rich_text?.[0]?.plain_text,
    };
  });
}

// Update task status
async function updateTaskStatus(
  pageId: string,
  status: "הושלם" | "בתהליך" | "לא התחיל"
): Promise<void> {
  await notionRequest(`/pages/${pageId}`, "PATCH", {
    properties: {
      "סטטוס": {
        select: { name: status },
      },
    },
  });
}

// Update task status and notes
async function updateTask(
  pageId: string,
  updates: { status?: "הושלם" | "בתהליך" | "לא התחיל"; notes?: string }
): Promise<void> {
  const properties: Record<string, unknown> = {};

  if (updates.status) {
    properties["סטטוס"] = { select: { name: updates.status } };
  }
  if (updates.notes) {
    properties["הערות"] = { rich_text: [{ text: { content: updates.notes } }] };
  }

  await notionRequest(`/pages/${pageId}`, "PATCH", { properties });
}

// Find task by name
async function findTaskByName(name: string): Promise<NotionTask | null> {
  const tasks = await getTasks();
  return tasks.find(t => t.name === name) || null;
}

// Sync tasks from TASKS.md format
interface TaskFromMd {
  name: string;
  status: "הושלם" | "בתהליך" | "לא התחיל";
  category: string;
  notes?: string;
}

async function syncTasksFromList(tasks: TaskFromMd[]): Promise<void> {
  console.log(`Syncing ${tasks.length} tasks to Notion...`);

  // Get existing tasks
  const existingTasks = await getTasks();
  const existingNames = new Set(existingTasks.map((t) => t.name));

  let added = 0;
  let skipped = 0;

  for (const task of tasks) {
    if (existingNames.has(task.name)) {
      skipped++;
      continue;
    }

    await addTask(task.name, task.status, task.category, "בינונית", task.notes);
    added++;
    console.log(`  ✅ Added: ${task.name}`);

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\nSync complete: ${added} added, ${skipped} skipped (already exist)`);
}

// Main tasks from TASKS.md
const INITIAL_TASKS: TaskFromMd[] = [
  // אותנטיקציה
  { name: "התחברות עם אימייל/סיסמה", status: "הושלם", category: "אותנטיקציה", notes: "Supabase Auth" },
  { name: "ניהול סשנים", status: "הושלם", category: "אותנטיקציה", notes: "Auto-refresh, localStorage" },
  { name: "הגנה על Routes", status: "הושלם", category: "אותנטיקציה", notes: "ProtectedRoute + AdminProtectedRoute" },
  { name: "RLS Policies", status: "הושלם", category: "אותנטיקציה", notes: "כל הטבלאות מוגנות" },
  { name: "Audit Log", status: "הושלם", category: "אותנטיקציה", notes: "מיגרציה קיימת" },

  // דשבורד
  { name: "עיצוב דף הבית", status: "הושלם", category: "דשבורד", notes: "7 כרטיסי מטריקות" },
  { name: "Header + Navigation", status: "הושלם", category: "דשבורד", notes: "RTL, Mobile-first" },
  { name: "Bottom Navigation", status: "הושלם", category: "דשבורד", notes: "5 פריטים" },
  { name: "חיבור מטריקות לDB", status: "בתהליך", category: "דשבורד", notes: "UI קיים, צריך לחבר לשאילתות" },
  { name: "מעקב התקדמות", status: "בתהליך", category: "דשבורד", notes: "סכמה קיימת, צריך binding" },
  { name: "דף הגדרות", status: "לא התחיל", category: "דשבורד", notes: "Placeholder בלבד" },

  // צ'אט
  { name: "צ'אט אתר (Public)", status: "הושלם", category: "צ'אט", notes: "/chat - Lead capture + AI" },
  { name: "צ'אט מורה", status: "הושלם", category: "צ'אט", notes: "/teacher-chat - CRM + תכנון שיעורים" },
  { name: "צ'אט חי (Live)", status: "הושלם", category: "צ'אט", notes: "/live-chat - Real-time" },
  { name: "Widget להטמעה", status: "הושלם", category: "צ'אט", notes: "chat-embed.js" },
  { name: "העברה לנציג אנושי", status: "בתהליך", category: "צ'אט", notes: "מבנה קיים, חסר UI מלא" },

  // אדמין
  { name: "דשבורד אנליטיקס", status: "הושלם", category: "אדמין", notes: "6 טאבים" },
  { name: "ויזואליזציות", status: "הושלם", category: "אדמין", notes: "Recharts" },
  { name: "חיבור Hooks לנתונים", status: "בתהליך", category: "אדמין", notes: "Hooks קיימים, צריך implementation" },
  { name: "ייצוא נתונים", status: "לא התחיל", category: "אדמין" },

  // הקלטות
  { name: "סכמת Database להקלטות", status: "הושלם", category: "הקלטות", notes: "recordings, user_recordings, ai_analysis" },
  { name: "UI להקלטה", status: "לא התחיל", category: "הקלטות", notes: "צריך: לכידה, השמעה" },
  { name: "ניתוח AI של הקלטות", status: "לא התחיל", category: "הקלטות", notes: "סכמה מוכנה" },

  // שיעורים
  { name: "סכמת Database לשיעורים", status: "הושלם", category: "שיעורים", notes: "lessons, groups, lesson_participants" },
  { name: "UI לתזמון שיעורים", status: "לא התחיל", category: "שיעורים" },
  { name: "ניהול שיעורי קבוצה", status: "לא התחיל", category: "שיעורים" },
  { name: "הצטרפות לשיעור", status: "לא התחיל", category: "שיעורים" },

  // גיימיפיקציה
  { name: "סכמת Database להישגים", status: "הושלם", category: "גיימיפיקציה", notes: "achievements, leaderboards" },
  { name: "UI כרטיסי כוכבים", status: "בתהליך", category: "גיימיפיקציה", notes: "StarBoxCard קיים עם נתוני דמו" },
  { name: "לוגיקת צבירת הישגים", status: "לא התחיל", category: "גיימיפיקציה" },
  { name: "לוח מובילים", status: "לא התחיל", category: "גיימיפיקציה", notes: "סכמה מוכנה" },

  // AI
  { name: "search-transcripts Edge Function", status: "הושלם", category: "AI" },
  { name: "search-website (RAG) Edge Function", status: "הושלם", category: "AI" },
  { name: "teacher-chat AI", status: "הושלם", category: "AI", notes: "Claude + Gemini" },
  { name: "website-chat AI", status: "הושלם", category: "AI", notes: "RAG + Lead capture" },
  { name: "generate-lesson-plan Edge Function", status: "הושלם", category: "AI" },
  { name: "ניתוח רגש/מצב רוח", status: "לא התחיל", category: "AI", notes: "שדות קיימים ב-insights" },

  // סנכרון
  { name: "Google Drive Sync", status: "הושלם", category: "סנכרון", notes: "Incremental + Full" },
  { name: "Website Scraper", status: "הושלם", category: "סנכרון", notes: "voicely.co.il + juniors" },
  { name: "Vector Embeddings", status: "הושלם", category: "סנכרון", notes: "pgvector + HNSW" },
  { name: "סנכרון Notion", status: "לא התחיל", category: "סנכרון", notes: "סקריפטים קיימים, חסר אינטגרציה" },
];

// CLI
async function main() {
  const args = process.argv.slice(2);

  if (!NOTION_API_KEY) {
    console.error("❌ NOTION_API_KEY not set in .env");
    process.exit(1);
  }

  // Try to find existing database if ID not set
  if (!TASKS_DATABASE_ID) {
    const existingId = await findExistingDatabase();
    if (existingId) {
      TASKS_DATABASE_ID = existingId;
      console.log(`Using existing database: ${TASKS_DATABASE_ID}`);
    }
  }

  if (args.includes("--create-db")) {
    const dbId = await createTasksDatabase();
    TASKS_DATABASE_ID = dbId;

    // Also sync initial tasks
    console.log("\nSyncing initial tasks...");
    await syncTasksFromList(INITIAL_TASKS);
  } else if (args.includes("--sync")) {
    await syncTasksFromList(INITIAL_TASKS);
  } else if (args.includes("--list")) {
    const tasks = await getTasks();
    console.log("\n📋 Tasks in Notion:");
    console.log("=".repeat(60));

    const byStatus = {
      "הושלם": tasks.filter((t) => t.status === "הושלם"),
      "בתהליך": tasks.filter((t) => t.status === "בתהליך"),
      "לא התחיל": tasks.filter((t) => t.status === "לא התחיל"),
    };

    for (const [status, statusTasks] of Object.entries(byStatus)) {
      const icon = status === "הושלם" ? "✅" : status === "בתהליך" ? "🟡" : "❌";
      console.log(`\n${icon} ${status} (${statusTasks.length}):`);
      for (const task of statusTasks) {
        console.log(`   - ${task.name} [${task.category}]`);
      }
    }
  } else if (args.includes("--update")) {
    const nameIndex = args.indexOf("--update") + 1;
    const name = args[nameIndex];
    const statusIndex = args.indexOf("--status");
    const status = statusIndex > -1 ? args[statusIndex + 1] : undefined;
    const notesIndex = args.indexOf("--notes");
    const notes = notesIndex > -1 ? args[notesIndex + 1] : undefined;

    if (!name) {
      console.error("Usage: --update 'Task name' [--status 'הושלם'] [--notes 'הערות']");
      process.exit(1);
    }

    const task = await findTaskByName(name);
    if (!task) {
      console.error(`❌ Task not found: ${name}`);
      process.exit(1);
    }

    await updateTask(task.id, {
      status: status as NotionTask["status"],
      notes
    });
    console.log(`✅ Task updated: ${name}`);
  } else if (args.includes("--add")) {
    const nameIndex = args.indexOf("--add") + 1;
    const name = args[nameIndex];
    const statusIndex = args.indexOf("--status");
    const status = statusIndex > -1 ? args[statusIndex + 1] : "לא התחיל";
    const categoryIndex = args.indexOf("--category");
    const category = categoryIndex > -1 ? args[categoryIndex + 1] : "דשבורד";

    if (!name) {
      console.error("Usage: --add 'Task name' --status 'הושלם|בתהליך|לא התחיל' --category 'קטגוריה'");
      process.exit(1);
    }

    const id = await addTask(name, status as NotionTask["status"], category);
    console.log(`✅ Task added: ${name} (${id})`);
  } else {
    console.log(`
Notion Tasks Manager for Voicely Dashboard

Usage:
  npx tsx scripts/notion-tasks.ts --create-db     Create tasks database & sync initial tasks
  npx tsx scripts/notion-tasks.ts --sync          Sync tasks from TASKS.md
  npx tsx scripts/notion-tasks.ts --list          List all tasks
  npx tsx scripts/notion-tasks.ts --add "Task name" --status "בתהליך" --category "דשבורד"

Status options: הושלם, בתהליך, לא התחיל
Categories: אותנטיקציה, דשבורד, צ'אט, אדמין, הקלטות, שיעורים, גיימיפיקציה, AI, סנכרון
`);
  }
}

main().catch(console.error);
