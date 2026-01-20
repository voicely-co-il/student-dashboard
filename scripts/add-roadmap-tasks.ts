/**
 * Add Roadmap features to Notion Tasks
 */
import "dotenv/config";

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const TASKS_DB = process.env.NOTION_TASKS_DATABASE_ID!;

interface Task {
  name: string;
  category: string;
  status: string;
  priority: string;
  notes: string;
}

// פיצ'רים חדשים מה-Roadmap
const newTasks: Task[] = [
  // Q1 2026 - חובה
  { name: "WhatsApp Business API", category: "צ'אטבוט", status: "לא התחיל", priority: "גבוהה", notes: "הפלטפורמה הפופולרית בישראל - Q1" },
  { name: "הודעות קוליות בצ'אט", category: "צ'אטבוט", status: "לא התחיל", priority: "גבוהה", notes: "קריטי לעסק פיתוח קול - Q1" },
  { name: "אינטגרציית Cal.com", category: "צ'אטבוט", status: "לא התחיל", priority: "גבוהה", notes: "קביעת פגישות מהצ'אט - Q1" },
  { name: "אנליטיקס צ'אטבוט", category: "צ'אטבוט", status: "לא התחיל", priority: "בינונית", notes: "שאלות נפוצות, המרות - Q1" },

  // Q2 2026 - רצוי
  { name: "Instagram DM Bot", category: "צ'אטבוט", status: "לא התחיל", priority: "בינונית", notes: "בוט לאינסטגרם - Q2" },
  { name: "Visual Flow Builder", category: "צ'אטבוט", status: "לא התחיל", priority: "בינונית", notes: "עריכת שיחות drag-and-drop - Q2" },
  { name: "סגמנטציה ותיוגים", category: "צ'אטבוט", status: "לא התחיל", priority: "בינונית", notes: "תיוג לידים חם/קר - Q2" },
  { name: "Broadcast Messaging", category: "צ'אטבוט", status: "לא התחיל", priority: "נמוכה", notes: "הודעות לקבוצות - Q2" },
  { name: "תזכורות שיעורים", category: "מורה", status: "לא התחיל", priority: "בינונית", notes: "24h + 1h לפני - Q2" },

  // Q3 2026 - עתידי
  { name: "Telegram Bot", category: "צ'אטבוט", status: "לא התחיל", priority: "נמוכה", notes: "ערוץ נוסף - Q3" },
  { name: "A/B Testing צ'אט", category: "צ'אטבוט", status: "לא התחיל", priority: "נמוכה", notes: "בדיקת נוסחים - Q3" },
  { name: "תשלום בצ'אט", category: "צ'אטבוט", status: "לא התחיל", priority: "נמוכה", notes: "Bit/PayBox - Q3" },

  // Q4 2026 - חדשני
  { name: "Voice AI Calls", category: "צ'אטבוט", status: "לא התחיל", priority: "נמוכה", notes: "שיחות טלפון אוטומטיות - Q4" },
  { name: "Multi-Agent System", category: "צ'אטבוט", status: "לא התחיל", priority: "נמוכה", notes: "סוכני AI מתמחים - Q4" },
  { name: "Voice Analysis AI", category: "תלמיד", status: "לא התחיל", priority: "בינונית", notes: "תלמיד שולח הקלטה → AI מנתח - Q4" },
  { name: "Practice Prompts", category: "תלמיד", status: "לא התחיל", priority: "בינונית", notes: "תרגילים יומיים בצ'אט - Q4" },
];

async function addTask(task: Task): Promise<boolean> {
  const res = await fetch(`https://api.notion.com/v1/pages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent: { database_id: TASKS_DB },
      properties: {
        "משימה": { title: [{ text: { content: task.name } }] },
        "סטטוס": { select: { name: task.status } },
        "קטגוריה": { select: { name: task.category } },
        "עדיפות": { select: { name: task.priority } },
        "הערות": { rich_text: [{ text: { content: task.notes || "" } }] },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.log(`❌ Failed: ${task.name} - ${err}`);
    return false;
  }
  return true;
}

async function main() {
  console.log("Adding Roadmap tasks to Notion...\n");

  let added = 0;
  for (const task of newTasks) {
    const success = await addTask(task);
    if (success) {
      console.log(`✅ ${task.category}: ${task.name}`);
      added++;
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\n📊 Added ${added}/${newTasks.length} tasks`);
}

main().catch(console.error);
