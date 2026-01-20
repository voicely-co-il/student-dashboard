/**
 * Update Notion task categories to simplified 4-module structure
 */
import "dotenv/config";

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const TASKS_DATABASE_ID = process.env.NOTION_TASKS_DATABASE_ID!;

// מיפוי קטגוריות ישנות לחדשות
const CATEGORY_MAP: Record<string, string> = {
  "אותנטיקציה": "תלמיד",
  "דשבורד": "תלמיד",
  "גיימיפיקציה": "תלמיד",
  "הקלטות": "תלמיד",
  "שיעורים": "מורה",
  "אדמין": "מורה",
  "צ'אט": "צ'אט",
  "AI": "צ'אטבוט",
  "סנכרון": "צ'אטבוט",
};

interface NotionResponse {
  results: Array<{
    id: string;
    properties: Record<string, { select?: { name: string }; title?: Array<{ plain_text: string }> }>;
  }>;
}

async function notionRequest(endpoint: string, method = "GET", body?: unknown): Promise<NotionResponse> {
  const response = await fetch(`https://api.notion.com/v1${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`Notion error: ${response.status}`);
  return response.json() as Promise<NotionResponse>;
}

async function main() {
  // קודם נעדכן את אפשרויות הקטגוריה ב-DB
  console.log("Updating database categories...");
  await notionRequest(`/databases/${TASKS_DATABASE_ID}`, "PATCH", {
    properties: {
      "קטגוריה": {
        select: {
          options: [
            { name: "תלמיד", color: "blue" },
            { name: "מורה", color: "purple" },
            { name: "צ'אט", color: "orange" },
            { name: "צ'אטבוט", color: "green" },
          ],
        },
      },
    },
  });
  console.log("✅ Database categories updated");

  // עכשיו נעדכן כל משימה
  console.log("\nFetching all tasks...");
  const result = await notionRequest(`/databases/${TASKS_DATABASE_ID}/query`, "POST", { page_size: 100 });
  const tasks = result.results;
  console.log(`Found ${tasks.length} tasks`);

  let updated = 0;
  for (const task of tasks) {
    const props = task.properties;
    const oldCategory = props["קטגוריה"]?.select?.name;
    const newCategory = oldCategory ? CATEGORY_MAP[oldCategory] : undefined;

    if (newCategory && newCategory !== oldCategory) {
      await notionRequest(`/pages/${task.id}`, "PATCH", {
        properties: {
          "קטגוריה": { select: { name: newCategory } },
        },
      });
      const taskName = props["משימה"]?.title?.[0]?.plain_text || "Unknown";
      console.log(`  ${oldCategory} → ${newCategory}: ${taskName}`);
      updated++;
      await new Promise(r => setTimeout(r, 100)); // Rate limit
    }
  }

  console.log(`\n✅ Updated ${updated} tasks`);
}

main().catch(console.error);
