import dotenv from "dotenv";
dotenv.config();

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const NOTION_CRM_DATABASE_ID = process.env.NOTION_CRM_DATABASE_ID!;

// Names to search for in CRM
const searchNames = [
  "eden", "עדן",
  "israel", "ישראל",
  "tiferet", "תפארת",
  "hanan", "חנן",
  "elroy", "אלרואי",
  "efrat", "אפרת",
  "carmela", "כרמלה",
  "asaf", "אסף",
  "mor", "מור",
  "ido", "עידו",
  "ilya", "איליה",
  "natalie", "נטלי",
  "boni", "בוני",
  "amos", "עמוס",
  "liraz", "לירז",
  "meseret", "מסרט",
];

async function main() {
  console.log("=== חיפוש התאמות ב-CRM ===\n");

  // Get all CRM names
  const crmNames: string[] = [];
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
      const name = page.properties["שם התלמיד"]?.title?.[0]?.plain_text || "";
      if (name) crmNames.push(name);
    }
    hasMore = data.has_more;
    startCursor = data.next_cursor;
  }

  console.log("נמצאו", crmNames.length, "תלמידים ב-CRM\n");

  // Search for each name - first word match only
  for (const search of searchNames) {
    const searchLower = search.toLowerCase().trim();
    const matches = crmNames.filter(crm => {
      const crmLower = crm.toLowerCase().trim();
      const crmFirst = crmLower.split(" ")[0];
      return crmFirst === searchLower || crmFirst.startsWith(searchLower);
    });

    if (matches.length > 0) {
      console.log(`"${search}" → נמצאו: ${matches.join(", ")}`);
    }
  }
}

main();
