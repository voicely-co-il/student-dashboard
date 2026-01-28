import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Check table structure
  const { data, error } = await supabase
    .from("cashflow_settings")
    .select("*")
    .limit(1);
  
  console.log("Settings columns:", data?.[0] ? Object.keys(data[0]) : "table empty or error");
  console.log("Error:", error?.message || "none");

  // Insert settings if missing
  const { error: insertError } = await supabase
    .from("cashflow_settings")
    .upsert({
      id: "default",
    }, { onConflict: "id" });

  console.log("Insert result:", insertError?.message || "OK");

  // Now test anon access again
  const anonSupabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
  );

  const { data: testData, error: testError } = await anonSupabase
    .from("cashflow_entries")
    .select("*")
    .limit(3);

  console.log("\nAnon test - entries found:", testData?.length || 0);
  console.log("Anon error:", testError?.message || "none");
}

main();
