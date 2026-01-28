import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_EXPENSES_DB = "dd87657b-24e8-4a2a-a262-d71e2306f109";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function compare() {
  if (!NOTION_API_KEY) {
    console.error("Missing NOTION_API_KEY");
    return;
  }

  // Get Notion data
  const notionRes = await fetch(
    `https://api.notion.com/v1/databases/${NOTION_EXPENSES_DB}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filter: { property: "כלים של ענבל", checkbox: { equals: true } },
        page_size: 100,
      }),
    }
  );

  const notionData = await notionRes.json();

  // Build Notion map
  const notionMap = new Map<string, number>();
  for (const page of notionData.results || []) {
    const name = page.properties["שם"]?.title?.[0]?.plain_text || "Unknown";
    const monthlyCost = page.properties["עלות חודשית ₪"]?.number || 0;
    if (monthlyCost > 0) {
      notionMap.set(name, monthlyCost);
    }
  }

  // Get Supabase categories and entries
  const { data: categories } = await supabase
    .from("cashflow_categories")
    .select("id, name")
    .eq("type", "expense");

  const { data: entries } = await supabase
    .from("cashflow_entries")
    .select("category_id, amount, period_type")
    .eq("period_type", "monthly");

  // Build Supabase map
  const supabaseMap = new Map<string, number>();
  for (const cat of categories || []) {
    const entry = entries?.find(e => e.category_id === cat.id);
    if (entry) {
      supabaseMap.set(cat.name, Math.abs(entry.amount));
    }
  }

  console.log("=== השוואה בין Notion לדשבורד ===\n");
  console.log("כלי".padEnd(35) + "| Notion".padEnd(12) + "| Dashboard".padEnd(12) + "| פער");
  console.log("-".repeat(65));

  let totalNotion = 0;
  let totalDash = 0;
  const discrepancies: { name: string; notionAmount: number; dashAmount: number; diff: number }[] = [];

  for (const [name, notionAmount] of notionMap) {
    const dashAmount = supabaseMap.get(name) || 0;
    totalNotion += notionAmount;
    totalDash += dashAmount;

    const diff = Math.abs(notionAmount - dashAmount);
    const diffStr = diff > 1 ? `₪${diff.toFixed(0)} ❌` : "✓";

    if (diff > 1) {
      discrepancies.push({ name, notionAmount, dashAmount, diff });
    }

    console.log(
      name.padEnd(35) +
      `| ₪${notionAmount}`.padEnd(12) +
      `| ₪${dashAmount.toFixed(0)}`.padEnd(12) +
      `| ${diffStr}`
    );
  }

  // Check for items in dashboard not in Notion
  for (const [name, dashAmount] of supabaseMap) {
    if (!notionMap.has(name)) {
      console.log(
        name.padEnd(35) +
        `| לא קיים`.padEnd(12) +
        `| ₪${dashAmount.toFixed(0)}`.padEnd(12) +
        `| ⚠️ רק בדשבורד`
      );
    }
  }

  console.log("-".repeat(65));
  console.log(
    "סה\"כ".padEnd(35) +
    `| ₪${totalNotion}`.padEnd(12) +
    `| ₪${totalDash.toFixed(0)}`.padEnd(12)
  );

  if (discrepancies.length > 0) {
    console.log("\n⚠️ נמצאו פערים:");
    for (const d of discrepancies) {
      console.log(`  - ${d.name}: Notion=₪${d.notionAmount}, Dashboard=₪${d.dashAmount.toFixed(0)}`);
    }
  } else {
    console.log("\n✅ אין פערים - הנתונים זהים!");
  }
}

compare();
