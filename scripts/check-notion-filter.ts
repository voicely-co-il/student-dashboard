import "dotenv/config";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_EXPENSES_DB = "dd87657b-24e8-4a2a-a262-d71e2306f109";

async function check() {
  if (!NOTION_API_KEY) {
    console.error("Missing NOTION_API_KEY");
    return;
  }

  // Fetch with current filter
  const response = await fetch(
    "https://api.notion.com/v1/databases/" + NOTION_EXPENSES_DB + "/query",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + NOTION_API_KEY,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filter: {
          property: "כלים של ענבל",
          checkbox: { equals: true },
        },
        page_size: 100,
      }),
    }
  );

  const data = await response.json();

  console.log("=== Items with 'כלים של ענבל' = true ===\n");

  for (const page of data.results || []) {
    const props = page.properties;
    const name = props["שם"]?.title?.[0]?.plain_text || "Unknown";
    const monthlyCost = props["עלות חודשית ₪"]?.number || 0;
    console.log(`${name}: ₪${monthlyCost}`);
  }

  console.log(`\nTotal items: ${data.results?.length || 0}`);

  // Get database schema
  console.log("\n=== Database Schema ===");
  const dbRes = await fetch(
    "https://api.notion.com/v1/databases/" + NOTION_EXPENSES_DB,
    {
      headers: {
        Authorization: "Bearer " + NOTION_API_KEY,
        "Notion-Version": "2022-06-28",
      },
    }
  );
  const db = await dbRes.json();
  console.log("Properties:", Object.keys(db.properties || {}).join(", "));

  // Show checkbox properties
  console.log("\n=== Checkbox Properties ===");
  for (const [key, value] of Object.entries(db.properties || {})) {
    if ((value as any).type === "checkbox") {
      console.log(`- ${key}`);
    }
  }
}

check();
