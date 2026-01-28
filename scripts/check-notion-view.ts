import "dotenv/config";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
// The database ID from your URL
const DB_ID = "77c0b63767f04a0c960b1a5b2c784c08";

async function check() {
  if (!NOTION_API_KEY) {
    console.error("Missing NOTION_API_KEY");
    return;
  }

  console.log("Checking database:", DB_ID);
  console.log("");

  // First get database info
  const dbRes = await fetch(
    `https://api.notion.com/v1/databases/${DB_ID}`,
    {
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
      },
    }
  );

  const db = await dbRes.json();

  if (db.object === "error") {
    console.log("Error accessing database:", db.message);
    console.log("\nTrying the old expenses DB...");

    // Try old DB
    const oldDB = "dd87657b-24e8-4a2a-a262-d71e2306f109";
    const oldRes = await fetch(
      `https://api.notion.com/v1/databases/${oldDB}`,
      {
        headers: {
          Authorization: `Bearer ${NOTION_API_KEY}`,
          "Notion-Version": "2022-06-28",
        },
      }
    );
    const oldData = await oldRes.json();
    console.log("Old DB title:", oldData.title?.[0]?.plain_text);
    return;
  }

  console.log("Database title:", db.title?.[0]?.plain_text);
  console.log("");

  // Query all items (no filter) to see what's there
  const queryRes = await fetch(
    `https://api.notion.com/v1/databases/${DB_ID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        page_size: 100,
      }),
    }
  );

  const data = await queryRes.json();

  console.log("=== All items in this database ===\n");

  for (const page of data.results || []) {
    const props = page.properties;
    const name = props["שם"]?.title?.[0]?.plain_text ||
                 props["Name"]?.title?.[0]?.plain_text ||
                 "Unknown";
    const monthlyCost = props["עלות חודשית ₪"]?.number ||
                        props["Monthly Cost"]?.number ||
                        0;

    if (monthlyCost > 0) {
      console.log(`${name}: ₪${monthlyCost}`);
    }
  }

  console.log(`\nTotal items: ${data.results?.length || 0}`);
}

check();
