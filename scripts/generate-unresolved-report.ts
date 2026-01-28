import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import * as fs from "fs";
dotenv.config();

const supabase = createClient(
  "https://jldfxkbczzxawdqsznze.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_CRM_DATABASE_ID = process.env.NOTION_CRM_DATABASE_ID;

interface NotionStudent {
  id: string;
  name: string;
}

async function fetchNotionStudents(): Promise<NotionStudent[]> {
  if (!NOTION_API_KEY || !NOTION_CRM_DATABASE_ID) {
    console.log("⚠️ Notion credentials not found, skipping Notion integration");
    return [];
  }

  const students: NotionStudent[] = [];
  let hasMore = true;
  let startCursor: string | undefined;

  while (hasMore) {
    const response = await fetch(
      `https://api.notion.com/v1/databases/${NOTION_CRM_DATABASE_ID}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NOTION_API_KEY}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          start_cursor: startCursor,
          page_size: 100,
        }),
      }
    );

    const data = await response.json();

    for (const page of data.results || []) {
      // Try to get name from different possible property names
      const nameProperty = page.properties["שם"] || page.properties["Name"] || page.properties["name"];
      let name = "";

      if (nameProperty?.title?.[0]?.plain_text) {
        name = nameProperty.title[0].plain_text;
      } else if (nameProperty?.rich_text?.[0]?.plain_text) {
        name = nameProperty.rich_text[0].plain_text;
      }

      if (name) {
        students.push({ id: page.id, name });
      }
    }

    hasMore = data.has_more;
    startCursor = data.next_cursor;
  }

  return students;
}

async function main() {
  console.log("=== מייצר דוח שמות לא מזוהים (עם Notion) ===\n");

  // Fetch Notion students
  console.log("מושך תלמידים מ-Notion...");
  const notionStudents = await fetchNotionStudents();
  console.log(`נמצאו ${notionStudents.length} תלמידים ב-Notion\n`);

  // Get unresolved names with details
  const { data: unresolved, error } = await supabase
    .from("unresolved_student_names")
    .select("*");

  if (error) {
    console.error("שגיאה:", error.message);
    return;
  }

  // Get all users for suggestions
  const { data: users } = await supabase
    .from("users")
    .select("id, name, email, notion_id")
    .order("name");

  // Generate CSV report
  let csv = "שם בתמלול,מספר תמלולים,שיעור ראשון,שיעור אחרון,הצעות מ-Supabase,הצעות מ-Notion,דוגמאות כותרות\n";

  for (const item of unresolved || []) {
    const transcriptName = item.student_name?.toLowerCase() || "";

    // Find possible matches in Supabase users
    const supabaseMatches = users?.filter(u => {
      const name = u.name?.toLowerCase() || "";
      return name.includes(transcriptName) ||
             transcriptName.includes(name) ||
             name.split(" ").some((part: string) => transcriptName.includes(part)) ||
             transcriptName.split(" ").some((part: string) => name.includes(part));
    }).slice(0, 3);

    // Find possible matches in Notion
    const notionMatches = notionStudents.filter(s => {
      const name = s.name?.toLowerCase() || "";
      return name.includes(transcriptName) ||
             transcriptName.includes(name) ||
             name.split(" ").some((part: string) => transcriptName.includes(part)) ||
             transcriptName.split(" ").some((part: string) => name.includes(part));
    }).slice(0, 3);

    const supabaseSuggestions = supabaseMatches?.map(u => u.name).join(" | ") || "";
    const notionSuggestions = notionMatches.map(s => s.name).join(" | ") || "";
    const titles = (item.sample_titles || []).slice(0, 2).join(" | ").replace(/,/g, ";");

    csv += `"${item.student_name}",${item.transcript_count},"${item.first_lesson || ""}","${item.last_lesson || ""}","${supabaseSuggestions}","${notionSuggestions}","${titles}"\n`;
  }

  // Save CSV
  const filename = `unresolved_names_${new Date().toISOString().split("T")[0]}.csv`;
  fs.writeFileSync(filename, "\ufeff" + csv, "utf8"); // BOM for Excel Hebrew support
  console.log("✅ נשמר:", filename);

  // Print summary
  console.log("\n=== סיכום ===");
  console.log("שמות לא מזוהים:", unresolved?.length || 0);
  console.log("משתמשים ב-Supabase:", users?.length || 0);
  console.log("תלמידים ב-Notion:", notionStudents.length);

  // Find names that exist in Notion but not in Supabase
  const supabaseNames = new Set(users?.map(u => u.name?.toLowerCase()) || []);
  const notionOnlyStudents = notionStudents.filter(s => !supabaseNames.has(s.name?.toLowerCase()));

  if (notionOnlyStudents.length > 0) {
    console.log("\n=== תלמידים ב-Notion שלא קיימים ב-Supabase ===");
    console.log("(אלה תלמידים שצריך אולי להוסיף למערכת)");
    for (const s of notionOnlyStudents.slice(0, 20)) {
      console.log(`- ${s.name}`);
    }
    if (notionOnlyStudents.length > 20) {
      console.log(`... ועוד ${notionOnlyStudents.length - 20}`);
    }
  }

  // Print top problematic names
  console.log("\n=== 20 השמות הבעייתיים ביותר (לפי כמות תמלולים) ===");
  for (const item of (unresolved || []).slice(0, 20)) {
    // Check if exists in Notion
    const inNotion = notionStudents.some(s =>
      s.name?.toLowerCase().includes(item.student_name?.toLowerCase()) ||
      item.student_name?.toLowerCase().includes(s.name?.toLowerCase())
    );
    const notionFlag = inNotion ? " ✓ (נמצא בNotion)" : "";
    console.log(`${item.student_name}: ${item.transcript_count} תמלולים${notionFlag}`);
  }
}

main();
