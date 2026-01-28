import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Check if RLS is enabled
  const { data: rls } = await supabase.rpc("check_rls_status") as any;
  console.log("RLS check:", rls);

  // Get all settings
  const { data: settings } = await supabase
    .from("cashflow_settings")
    .select("*");
  
  console.log("\nAll settings:", settings);

  // Get category count
  const { count: catCount } = await supabase
    .from("cashflow_categories")
    .select("*", { count: "exact", head: true });
  
  console.log("Categories count:", catCount);

  // Get entries count
  const { count: entryCount } = await supabase
    .from("cashflow_entries")
    .select("*", { count: "exact", head: true });
  
  console.log("Entries count:", entryCount);
}

main();
