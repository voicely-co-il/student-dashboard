import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const NOTION_EXPENSES_DB = "dd87657b-24e8-4a2a-a262-d71e2306f109";

interface NotionExpense {
  name: string;
  monthlyCost: number | null;
  isInbalTool: boolean;
}

async function fetchNotionExpenses(): Promise<NotionExpense[]> {
  const expenses: NotionExpense[] = [];
  let hasMore = true;
  let startCursor: string | undefined;

  while (hasMore) {
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
          start_cursor: startCursor,
        }),
      }
    );

    const data = await response.json();

    for (const page of data.results || []) {
      const props = page.properties;
      const name = props["שם"]?.title?.[0]?.plain_text || "Unknown";
      const monthlyCost = props["עלות חודשית ₪"]?.number || null;
      
      if (monthlyCost && monthlyCost > 0) {
        expenses.push({ name, monthlyCost, isInbalTool: true });
      }
    }

    hasMore = data.has_more;
    startCursor = data.next_cursor;
  }

  return expenses;
}

function getWeeklyPeriods(startDate: Date, count: number): string[] {
  const periods: string[] = [];
  const current = new Date(startDate);

  for (let i = 0; i < count; i++) {
    periods.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 7);
  }

  return periods;
}

async function main() {
  console.log("Fetching expenses from Notion...");
  const expenses = await fetchNotionExpenses();

  const totalMonthly = expenses.reduce((sum, e) => sum + (e.monthlyCost || 0), 0);
  const weeklyAmount = Math.round(totalMonthly / 4.33);

  console.log("Found " + expenses.length + " expenses");
  console.log("Total monthly: NIS " + totalMonthly);
  console.log("Weekly amount: NIS " + weeklyAmount);

  // Get the category
  const { data: category } = await supabase
    .from("cashflow_categories")
    .select("id")
    .eq("name", "כלים ותוכנות")
    .single();

  if (!category) {
    console.error("Category not found!");
    return;
  }

  // Get settings for start date
  const { data: settings } = await supabase
    .from("cashflow_settings")
    .select("setting_key, setting_value")
    .eq("setting_key", "weekly_start_date")
    .single();

  const startDateStr = settings?.setting_value || "2025-10-27";
  const startDate = new Date(startDateStr);

  console.log("\nStart date from settings: " + startDateStr);

  // Get 13 weekly periods
  const weeklyPeriods = getWeeklyPeriods(startDate, 13);

  console.log("\nSyncing to weekly periods:");

  // Create notes from expenses
  const notes = expenses.map(e => e.name + ": NIS " + e.monthlyCost).join("\n");

  // Upsert for each weekly period
  for (const period of weeklyPeriods) {
    const { error } = await supabase
      .from("cashflow_entries")
      .upsert({
        category_id: category.id,
        period_type: "weekly",
        period_start: period,
        amount: weeklyAmount,
        notes: "Tools & Software (from Notion):\n" + notes,
      }, {
        onConflict: "category_id,period_type,period_start",
      });

    if (error) {
      console.log("  X " + period + ": " + error.message);
    } else {
      console.log("  V " + period + ": NIS " + weeklyAmount);
    }
  }

  // Also sync monthly
  const now = new Date();
  console.log("\nSyncing monthly periods:");
  
  for (let i = 0; i < 12; i++) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 6 + i, 1);
    const monthStartStr = monthStart.toISOString().split("T")[0];

    const { error } = await supabase
      .from("cashflow_entries")
      .upsert({
        category_id: category.id,
        period_type: "monthly",
        period_start: monthStartStr,
        amount: totalMonthly,
        notes: "Tools & Software (from Notion):\n" + notes,
      }, {
        onConflict: "category_id,period_type,period_start",
      });

    if (error) {
      console.log("  X " + monthStartStr + ": " + error.message);
    } else {
      console.log("  V " + monthStartStr + ": NIS " + totalMonthly);
    }
  }

  console.log("\nDone!");
}

main();
