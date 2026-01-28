import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// Use anon key (like the browser)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
);

async function main() {
  console.log("Testing with ANON key (like browser):\n");

  // Test categories
  const { data: categories, error: catError } = await supabase
    .from("cashflow_categories")
    .select("id, name")
    .limit(3);
  
  console.log("Categories:", categories?.length || 0, "found");
  if (catError) console.log("  Error:", catError.message);

  // Test entries  
  const { data: entries, error: entryError } = await supabase
    .from("cashflow_entries")
    .select("*")
    .limit(3);
  
  console.log("Entries:", entries?.length || 0, "found");
  if (entryError) console.log("  Error:", entryError.message);

  // Test settings
  const { data: settings, error: settingsError } = await supabase
    .from("cashflow_settings")
    .select("*")
    .single();
  
  console.log("Settings:", settings ? "found" : "NOT FOUND");
  if (settingsError) console.log("  Error:", settingsError.message);
}

main();
