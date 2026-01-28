import "dotenv/config";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_EXPENSES_DB = "dd87657b-24e8-4a2a-a262-d71e2306f109";

async function check() {
  if (!NOTION_API_KEY) {
    console.error("Missing NOTION_API_KEY");
    return;
  }

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

  // Show all number properties for first item to find dollar field name
  if (data.results?.[0]) {
    console.log("=== Number fields in first item ===");
    const props = data.results[0].properties;
    for (const [key, value] of Object.entries(props)) {
      if ((value as any).type === "number") {
        console.log(`"${key}": ${(value as any).number}`);
      }
    }
  }

  console.log("\n=== All items with costs ===\n");

  const USD_TO_ILS = 3.6; // Exchange rate

  for (const page of data.results || []) {
    const props = page.properties;
    const name = props["שם"]?.title?.[0]?.plain_text || "Unknown";

    // Try different possible field names for dollar price
    const costILS = props["עלות חודשית ₪"]?.number || 0;
    const costUSD = props["עלות חודשית $ "]?.number ||
                    props["עלות חודשית $"]?.number ||
                    props["עלות חודשית"]?.number ||
                    0;

    if (costILS > 0 || costUSD > 0) {
      const effectiveCost = costILS > 0 ? costILS : costUSD * USD_TO_ILS;
      console.log(`${name}:`);
      console.log(`  ILS: ₪${costILS}, USD: $${costUSD}`);
      if (costUSD > 0 && costILS === 0) {
        console.log(`  → Using USD converted: ₪${Math.round(effectiveCost)}`);
      }
      console.log("");
    }
  }
}

check();
