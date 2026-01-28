import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  "https://jldfxkbczzxawdqsznze.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log("=== מקשר תמלולים למשתמשים ===\n");

  // Run the linking function
  const { data, error } = await supabase.rpc("link_transcripts_to_users");

  if (error) {
    console.error("שגיאה:", error.message);
    return;
  }

  if (data && data[0]) {
    const result = data[0];
    console.log("✅ קושרו בהצלחה:", result.linked_count, "שמות");
    console.log("❌ לא נמצאה התאמה:", result.unlinked_count, "שמות");

    if (result.unresolved_names && result.unresolved_names.length > 0) {
      console.log("\n=== שמות שדורשים ביקורת ידנית ===");
      console.log(result.unresolved_names.slice(0, 50).join("\n"));
      if (result.unresolved_names.length > 50) {
        console.log("... ועוד", result.unresolved_names.length - 50, "שמות");
      }
    }
  }

  // Check statistics
  const { count: linked } = await supabase
    .from("transcripts")
    .select("*", { count: "exact", head: true })
    .not("user_id", "is", null);

  const { count: total } = await supabase
    .from("transcripts")
    .select("*", { count: "exact", head: true });

  console.log("\n=== סטטיסטיקה ===");
  console.log("סה\"כ תמלולים:", total);
  console.log("מקושרים למשתמשים:", linked);
  console.log("ללא קישור:", (total || 0) - (linked || 0));
  console.log("אחוז הצלחה:", ((linked || 0) / (total || 1) * 100).toFixed(1) + "%");
}

main();
