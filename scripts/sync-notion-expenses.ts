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
  monthlyCost: number;
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
      const monthlyCost = props["עלות חודשית ₪"]?.number || 0;

      if (monthlyCost && monthlyCost > 0) {
        expenses.push({ name, monthlyCost });
      }
    }

    hasMore = data.has_more;
    startCursor = data.next_cursor;
  }

  // Sort by cost descending
  return expenses.sort((a, b) => b.monthlyCost - a.monthlyCost);
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

async function getOrCreateCategory(name: string, sortOrder: number): Promise<string> {
  // Check if category exists
  const { data: existing } = await supabase
    .from("cashflow_categories")
    .select("id")
    .eq("name", name)
    .single();

  if (existing) {
    return existing.id;
  }

  // Create new category
  const { data: created, error } = await supabase
    .from("cashflow_categories")
    .insert({
      name,
      type: "expense",
      sort_order: sortOrder,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create category ${name}: ${error.message}`);
  }

  return created.id;
}

async function main() {
  console.log("Fetching expenses from Notion...\n");
  const expenses = await fetchNotionExpenses();

  const totalMonthly = expenses.reduce((sum, e) => sum + e.monthlyCost, 0);

  console.log("=== Tools from Notion ===");
  expenses.forEach((e, i) => {
    console.log(`${i + 1}. ${e.name}: ₪${e.monthlyCost}/month`);
  });
  console.log(`\nTotal: ₪${totalMonthly.toFixed(2)}/month (${expenses.length} tools)`);

  // Get settings for start date
  const { data: settings } = await supabase
    .from("cashflow_settings")
    .select("setting_key, setting_value")
    .eq("setting_key", "weekly_start_date")
    .single();

  const startDateStr = settings?.setting_value || "2025-10-27";
  const startDate = new Date(startDateStr);
  const weeklyPeriods = getWeeklyPeriods(startDate, 13);

  console.log("\nStart date: " + startDateStr);
  console.log("Creating categories and syncing entries...\n");

  // Delete old combined category entries
  const { data: oldCategory } = await supabase
    .from("cashflow_categories")
    .select("id")
    .eq("name", "כלים ותוכנות")
    .single();

  if (oldCategory) {
    await supabase
      .from("cashflow_entries")
      .delete()
      .eq("category_id", oldCategory.id);

    await supabase
      .from("cashflow_categories")
      .delete()
      .eq("id", oldCategory.id);

    console.log("Deleted old combined category 'כלים ותוכנות'\n");
  }

  // Create category and entries for each tool
  let sortOrder = 100; // Start after other expense categories

  for (const expense of expenses) {
    const categoryId = await getOrCreateCategory(expense.name, sortOrder++);
    const weeklyAmount = Math.round(expense.monthlyCost / 4.33);

    // Sync weekly periods
    for (const period of weeklyPeriods) {
      await supabase
        .from("cashflow_entries")
        .upsert({
          category_id: categoryId,
          period_type: "weekly",
          period_start: period,
          amount: weeklyAmount,
        }, {
          onConflict: "category_id,period_type,period_start",
        });
    }

    // Sync monthly periods
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - 6 + i, 1);
      const monthStartStr = monthStart.toISOString().split("T")[0];

      await supabase
        .from("cashflow_entries")
        .upsert({
          category_id: categoryId,
          period_type: "monthly",
          period_start: monthStartStr,
          amount: expense.monthlyCost,
        }, {
          onConflict: "category_id,period_type,period_start",
        });
    }

    console.log(`✓ ${expense.name}: ₪${expense.monthlyCost}/month (₪${weeklyAmount}/week)`);
  }

  console.log("\n=== Summary ===");
  console.log(`Created ${expenses.length} expense categories`);
  console.log(`Weekly total: ₪${Math.round(totalMonthly / 4.33)}`);
  console.log(`Monthly total: ₪${totalMonthly.toFixed(2)}`);
  console.log("\nDone!");
}

main();
