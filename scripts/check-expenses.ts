import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Get the "כלים ותוכנות" category
  const { data: category } = await supabase
    .from("cashflow_categories")
    .select("id, name")
    .eq("name", "כלים ותוכנות")
    .single();

  console.log("Category:", category);

  if (category) {
    // Get entries for this category
    const { data: entries } = await supabase
      .from("cashflow_entries")
      .select("*")
      .eq("category_id", category.id)
      .order("period_start", { ascending: false });

    console.log("\nEntries:", entries);
  }

  // Also check what periods exist
  const { data: allEntries } = await supabase
    .from("cashflow_entries")
    .select("period_start, period_type")
    .order("period_start", { ascending: false })
    .limit(20);

  console.log("\nAll recent entries (periods):");
  const uniquePeriods = [...new Set(allEntries?.map(e => e.period_start + " (" + e.period_type + ")"))];
  uniquePeriods.forEach(p => console.log("  -", p));
}

main();
