import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Get settings
  const { data: settings } = await supabase
    .from("cashflow_settings")
    .select("*")
    .single();
  
  console.log("Settings:", settings);

  // Get categories
  const { data: categories } = await supabase
    .from("cashflow_categories")
    .select("id, name, type")
    .eq("name", "כלים ותוכנות");
  
  console.log("\nCategory:", categories);

  if (categories && categories[0]) {
    const catId = categories[0].id;
    
    // Get entries for this category
    const { data: entries } = await supabase
      .from("cashflow_entries")
      .select("*")
      .eq("category_id", catId)
      .eq("period_type", "weekly")
      .order("period_start", { ascending: true });
    
    console.log("\nWeekly entries for כלים ותוכנות:");
    entries?.forEach(e => {
      console.log("  " + e.period_start + ": " + e.amount);
    });
  }

  // Check what periods the UI expects
  const startDate = new Date(settings?.weekly_start_date || "2026-01-19");
  console.log("\nUI expects periods starting from:", startDate.toISOString().split("T")[0]);
}

main();
