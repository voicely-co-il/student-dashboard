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

  console.log("=== Comparing ₪ vs $ prices ===\n");

  for (const page of data.results || []) {
    const props = page.properties;
    const name = props["שם"]?.title?.[0]?.plain_text || "Unknown";
    const costILS = props["עלות חודשית ₪"]?.number || 0;
    const costUSD = props["עלות חודשית $ "]?.number || props["עלות חודשית $"]?.number || 0;

    if (costILS > 0 || costUSD > 0) {
      console.log(`${name}:`);
      console.log(`  ₪${costILS} / $${costUSD}`);
      if (costUSD > 0 && costILS === 0) {
        console.log(`  ⚠️ Has USD but no ILS!`);
      }
      console.log("");
    }
  }
}

check();
