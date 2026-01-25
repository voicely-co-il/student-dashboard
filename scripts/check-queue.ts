import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkQueue() {
  const { data, error } = await supabase
    .from("notebooklm_content")
    .select("id, content_type, status, notebook_name, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Recent items in notebooklm_content:");
  console.log("====================================");
  if (data && data.length > 0) {
    for (const item of data) {
      console.log(`${item.status.padEnd(12)} | ${item.content_type.padEnd(12)} | ${item.notebook_name || "(no name)"}`);
    }
  } else {
    console.log("No items found");
  }
}

checkQueue();
