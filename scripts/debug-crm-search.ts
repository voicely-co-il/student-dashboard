import dotenv from "dotenv";
dotenv.config();

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const NOTION_CRM_DATABASE_ID = process.env.NOTION_CRM_DATABASE_ID!;

async function main() {
  console.log("=== Debug CRM Search ===\n");

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

  console.log("Total CRM names:", crmNames.length);

  // Check suspicious names
  const suspicious = [" יהל עומסי", " גאיה טודור"];
  for (const s of suspicious) {
    const trimmed = s.trim();
    console.log(`\n"${s}" -> first char code:`, s.charCodeAt(0), ", length:", s.length);
    console.log(`Trimmed "${trimmed}" -> first char code:`, trimmed.charCodeAt(0), ", length:", trimmed.length);
  }

  // Find names starting with liraz
  console.log("\n=== Names containing 'לירז' ===");
  for (const name of crmNames) {
    if (name.includes("לירז") || name.toLowerCase().includes("liraz")) {
      console.log(`"${name}" (first: "${name.split(" ")[0]}")`);
    }
  }

  // Sample some CRM names
  console.log("\n=== Sample CRM names (first 30) ===");
  for (const name of crmNames.slice(0, 30)) {
    console.log(`"${name}" -> first: "${name.split(" ")[0]}"`);
  }
}

main();
