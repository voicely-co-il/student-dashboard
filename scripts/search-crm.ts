/**
 * Quick CRM search script
 */
import "dotenv/config";

const searchNames = ["שי", "shay", "עדן", "eden", "תפארת", "tiferet", "מסרט"];

async function searchCRM() {
  const response = await fetch(
    `https://api.notion.com/v1/databases/${process.env.NOTION_CRM_DATABASE_ID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ page_size: 100 }),
    }
  );

  const data = await response.json();
  const students: string[] = [];

  for (const page of data.results || []) {
    const props = page.properties || {};
    const nameObj = props["שם התלמיד"]?.title || [];
    const name = nameObj[0]?.plain_text || "";
    if (name) students.push(name);
  }

  console.log("כל התלמידים ב-CRM (" + students.length + "):");
  students.forEach((s) => console.log("  - " + s));

  console.log("\n" + "=".repeat(50));
  console.log("חיפוש שמות ספציפיים:");
  console.log("=".repeat(50));

  for (const search of searchNames) {
    const matches = students.filter((s) =>
      s.toLowerCase().includes(search.toLowerCase())
    );
    if (matches.length > 0) {
      console.log(`  "${search}": ${matches.join(", ")}`);
    } else {
      console.log(`  "${search}": ❌ לא נמצא`);
    }
  }
}

searchCRM().catch(console.error);
