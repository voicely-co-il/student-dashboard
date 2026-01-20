/**
 * Show Notion Tasks Summary
 */
import "dotenv/config";

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const TASKS_DB = process.env.NOTION_TASKS_DATABASE_ID!;

interface TaskStats {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  highPriority: Array<{ name: string; category: string; status: string }>;
}

async function summary() {
  const res = await fetch(`https://api.notion.com/v1/databases/${TASKS_DB}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ page_size: 100 }),
  });
  const data = await res.json();
  const results = data.results || [];

  const stats: TaskStats = {
    total: results.length,
    byStatus: { "הושלם": 0, "בתהליך": 0, "לא התחיל": 0 },
    byCategory: { "תלמיד": 0, "מורה": 0, "צ'אט": 0, "צ'אטבוט": 0 },
    highPriority: [],
  };

  for (const task of results) {
    const name = task.properties["משימה"]?.title?.[0]?.plain_text || "";
    const status = task.properties["סטטוס"]?.select?.name || "לא התחיל";
    const category = task.properties["קטגוריה"]?.select?.name || "";
    const priority = task.properties["עדיפות"]?.select?.name || "";

    if (stats.byStatus[status] !== undefined) {
      stats.byStatus[status]++;
    }
    if (stats.byCategory[category] !== undefined) {
      stats.byCategory[category]++;
    }

    if (priority === "גבוהה" && status !== "הושלם") {
      stats.highPriority.push({ name, category, status });
    }
  }

  console.log("📊 סיכום טבלת Notion");
  console.log("=".repeat(50));
  console.log(`\nסה"כ משימות: ${stats.total}`);
  console.log(`\n📈 לפי סטטוס:`);
  console.log(`  ✅ הושלם: ${stats.byStatus["הושלם"]}`);
  console.log(`  🟡 בתהליך: ${stats.byStatus["בתהליך"]}`);
  console.log(`  ❌ לא התחיל: ${stats.byStatus["לא התחיל"]}`);

  console.log(`\n📁 לפי קטגוריה:`);
  for (const [cat, count] of Object.entries(stats.byCategory)) {
    console.log(`  ${cat}: ${count}`);
  }

  console.log(`\n🔥 משימות בעדיפות גבוהה (${stats.highPriority.length}):`);
  for (const t of stats.highPriority) {
    const icon = t.status === "בתהליך" ? "🟡" : "❌";
    console.log(`  ${icon} [${t.category}] ${t.name}`);
  }

  const progress = Math.round((stats.byStatus["הושלם"] / stats.total) * 100);
  console.log(`\n📊 התקדמות כללית: ${progress}%`);
}

summary().catch(console.error);
