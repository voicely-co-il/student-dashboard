import "dotenv/config";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_EXPENSES_DB = "dd87657b-24e8-4a2a-a262-d71e2306f109";

async function check() {
  if (!NOTION_API_KEY) {
    console.error("Missing NOTION_API_KEY");
    return;
  }

  // Get database schema first
  const dbRes = await fetch(
    `https://api.notion.com/v1/databases/${NOTION_EXPENSES_DB}`,
    {
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
      },
    }
  );
  const db = await dbRes.json();

  console.log("=== All Number Properties in Database ===\n");
  for (const [key, value] of Object.entries(db.properties || {})) {
    if ((value as any).type === "number") {
      console.log(`- "${key}"`);
    }
  }

  // Now query items
  const response = await fetch(
    `https://api.notion.com/v1/databases/${NOTION_EXPENSES_DB}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
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

  console.log("\n=== Items with Dollar prices ===\n");

  for (const page of data.results || []) {
    const props = page.properties;
    const name = props["שם"]?.title?.[0]?.plain_text || "Unknown";

    // Check ALL number fields
    const costILS = props["עלות חודשית ₪"]?.number || 0;

    // Try to find dollar field with various names
    let costUSD = 0;
    for (const [key, value] of Object.entries(props)) {
      if (key.includes("$") && (value as any).type === "number") {
        costUSD = (value as any).number || 0;
        if (costUSD > 0) {
          console.log(`${name}:`);
          console.log(`  Field "${key}": $${costUSD}`);
          console.log(`  עלות חודשית ₪: ₪${costILS}`);
          console.log("");
        }
      }
    }
  }
}

check();
