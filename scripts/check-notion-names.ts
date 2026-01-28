import dotenv from "dotenv";
dotenv.config();

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const NOTION_CRM_DATABASE_ID = process.env.NOTION_CRM_DATABASE_ID!;

async function main() {
  const students: string[] = [];
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
        body: JSON.stringify({ start_cursor: startCursor, page_size: 100 }),
      }
    );
    const data = await response.json();

    for (const page of data.results || []) {
      const nameProp = page.properties["שם התלמיד"];
      const name = nameProp?.title?.[0]?.plain_text || "";
      if (name) students.push(name);
    }

    hasMore = data.has_more;
    startCursor = data.next_cursor;
  }

  console.log("=== שמות ב-Notion CRM ===");
  console.log("סה\"כ:", students.length);

  const hebrew = students.filter(s => /[\u0590-\u05FF]/.test(s));
  const english = students.filter(s => /^[a-z\s]+$/i.test(s));

  console.log("בעברית:", hebrew.length);
  console.log("באנגלית בלבד:", english.length);

  console.log("\n=== דוגמאות שמות באנגלית ב-CRM ===");
  console.log(english.slice(0, 30).join(", "));

  console.log("\n=== דוגמאות שמות בעברית ב-CRM ===");
  console.log(hebrew.slice(0, 30).join(", "));
}

main();
