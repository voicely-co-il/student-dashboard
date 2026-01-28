import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Categories to DELETE (empty duplicates - these are now covered by Notion sync to "כלים ותוכנות")
const CATEGORIES_TO_DELETE = [
  "Digital Ocean",
  "Facebook Ads",
  "Facebook Meta Verified", 
  "Google Ads",
  "Google Workspace",
  "Supabase",
  "TimeoS - Transcriptions",
  "Webflow - Website",
  "Youtube Premium",
  "Zoom",
  "Credit Card Fees (Morning)",
];

// Categories to KEEP (useful for manual tracking)
// - כלים ותוכנות (has Notion data)
// - Studio Rent
// - Insurance
// - Taxes & Fees
// - Other Expenses
// - מע"מ לתשלום, מס הכנסה, ביטוח לאומי
// - Capital Purchases, Loan Repayments, Owner Withdrawals

async function main() {
  console.log("Cleaning up duplicate expense categories...\n");

  for (const name of CATEGORIES_TO_DELETE) {
    const { data, error } = await supabase
      .from("cashflow_categories")
      .delete()
      .eq("name", name)
      .select();

    if (error) {
      console.log("❌ Error deleting " + name + ": " + error.message);
    } else if (data && data.length > 0) {
      console.log("✅ Deleted: " + name);
    } else {
      console.log("⏭️  Not found: " + name);
    }
  }

  console.log("\n--- Remaining categories ---");
  const { data: remaining } = await supabase
    .from("cashflow_categories")
    .select("name, type")
    .in("type", ["expense", "other_expense"])
    .order("name");

  for (const cat of remaining || []) {
    console.log("- " + cat.name + " (" + cat.type + ")");
  }
}

main();
