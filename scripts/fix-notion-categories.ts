/**
 * Fix Notion task categories based on task names
 */
import "dotenv/config";

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const TASKS_DATABASE_ID = process.env.NOTION_TASKS_DATABASE_ID!;

// מיפוי משימות לקטגוריות
function getCategory(taskName: string): string {
  const name = taskName.toLowerCase();

  // תלמיד - Dashboard, Auth, Gamification, Recordings
  if (
    name.includes("דף הבית") ||
    name.includes("header") ||
    name.includes("navigation") ||
    name.includes("מטריקות") ||
    name.includes("התקדמות") ||
    name.includes("הגדרות") ||
    name.includes("התחברות") ||
    name.includes("סשנים") ||
    name.includes("routes") ||
    name.includes("rls") ||
    name.includes("audit") ||
    name.includes("הקלטה") ||
    name.includes("recordings") ||
    name.includes("כוכבים") ||
    name.includes("הישגים") ||
    name.includes("מובילים") ||
    name.includes("database להקלטות") ||
    name.includes("database להישגים")
  ) {
    return "תלמיד";
  }

  // מורה - Admin, Lessons, Teacher tools
  if (
    name.includes("אדמין") ||
    name.includes("אנליטיקס") ||
    name.includes("ויזואליזציות") ||
    name.includes("hooks לנתונים") ||
    name.includes("ייצוא") ||
    name.includes("שיעור") ||
    name.includes("קבוצה") ||
    name.includes("database לשיעורים")
  ) {
    return "מורה";
  }

  // צ'אט - Live chat, Teacher chat, Widget
  if (
    name.includes("צ'אט מורה") ||
    name.includes("צ'אט חי") ||
    name.includes("widget") ||
    name.includes("נציג")
  ) {
    return "צ'אט";
  }

  // צ'אטבוט - AI, RAG, Sync, Website chat
  if (
    name.includes("ai") ||
    name.includes("edge function") ||
    name.includes("rag") ||
    name.includes("search") ||
    name.includes("sync") ||
    name.includes("scraper") ||
    name.includes("vector") ||
    name.includes("notion") ||
    name.includes("drive") ||
    name.includes("צ'אט אתר") ||
    name.includes("רגש") ||
    name.includes("lesson-plan")
  ) {
    return "צ'אטבוט";
  }

  // ברירת מחדל
  return "תלמיד";
}

async function notionRequest(endpoint: string, method = "GET", body?: unknown) {
  const response = await fetch(`https://api.notion.com/v1${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Notion error: ${response.status} - ${text}`);
  }
  return response.json();
}

async function main() {
  console.log("Fetching all tasks...");
  const result = await notionRequest(
    `/databases/${TASKS_DATABASE_ID}/query`,
    "POST",
    { page_size: 100 }
  );
  const tasks = result.results;
  console.log(`Found ${tasks.length} tasks\n`);

  const stats: Record<string, number> = { "תלמיד": 0, "מורה": 0, "צ'אט": 0, "צ'אטבוט": 0 };

  for (const task of tasks) {
    const props = task.properties;
    const taskName = props["משימה"]?.title?.[0]?.plain_text || "";
    const currentCategory = props["קטגוריה"]?.select?.name;
    const newCategory = getCategory(taskName);

    stats[newCategory as keyof typeof stats]++;

    if (currentCategory !== newCategory) {
      await notionRequest(`/pages/${task.id}`, "PATCH", {
        properties: {
          "קטגוריה": { select: { name: newCategory } },
        },
      });
      console.log(`✅ ${newCategory}: ${taskName}`);
      await new Promise((r) => setTimeout(r, 150)); // Rate limit
    }
  }

  console.log("\n📊 Summary:");
  console.log(`  תלמיד: ${stats["תלמיד"]} tasks`);
  console.log(`  מורה: ${stats["מורה"]} tasks`);
  console.log(`  צ'אט: ${stats["צ'אט"]} tasks`);
  console.log(`  צ'אטבוט: ${stats["צ'אטבוט"]} tasks`);
}

main().catch(console.error);
