import dotenv from "dotenv";
dotenv.config();

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const NOTION_CRM_DATABASE_ID = process.env.NOTION_CRM_DATABASE_ID!;

// Hebrew names from pending that we need to find
const hebrewSearchNames = [
  "מסרט",
  "לירז",
  "אלרואי",
  "אפרת",
  "עידו",
  "עמוס",
  "עדן",
  "אורין",
  "רות",
  "ספיר",
  "נגה",
  "אלין",
  "איתי",
  "ליבי",
];

async function main() {
  console.log("=== חיפוש שמות עבריים ב-CRM ===\n");

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

  // Search for each Hebrew name
  for (const search of hebrewSearchNames) {
    const matches = crmNames.filter(crm => {
      const crmFirst = crm.split(" ")[0];
      return crmFirst === search || crmFirst.startsWith(search) || search.startsWith(crmFirst);
    });

    if (matches.length > 0) {
      console.log(`"${search}" → ${matches.slice(0, 5).join(", ")}`);
    } else {
      console.log(`"${search}" → אין התאמה ב-CRM`);
    }
  }

  // Also search for specific English names that weren't matched
  console.log("\n=== שמות אנגליים שנשארו ===");
  const englishNames = ["liraz", "tiferet", "hanan", "eden", "elroy", "efrat", "ido", "zaki", "dorit", "simon", "zohar", "netta"];

  for (const search of englishNames) {
    const searchLower = search.toLowerCase();
    const matches = crmNames.filter(crm => {
      const crmLower = crm.toLowerCase();
      const crmFirst = crmLower.split(" ")[0];
      return crmFirst === searchLower || crmFirst.startsWith(searchLower);
    });

    if (matches.length > 0) {
      console.log(`"${search}" → ${matches.slice(0, 5).join(", ")}`);
    }
  }
}

main();
