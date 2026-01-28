import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  "https://jldfxkbczzxawdqsznze.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Check transcript structure
  const { data } = await supabase
    .from("transcripts")
    .select("id, student_name, student_id, user_id")
    .limit(5);

  console.log("מבנה תמלולים (דוגמה):");
  console.log(JSON.stringify(data, null, 2));

  // Check if student_id is populated
  const { count: withStudentId } = await supabase
    .from("transcripts")
    .select("*", { count: "exact", head: true })
    .not("student_id", "is", null);

  const { count: total } = await supabase
    .from("transcripts")
    .select("*", { count: "exact", head: true });

  console.log("\n=== סטטיסטיקה ===");
  console.log("סה\"כ תמלולים:", total);
  console.log("עם student_id:", withStudentId || 0);
  console.log("ללא student_id:", (total || 0) - (withStudentId || 0));

  // Check users table
  const { count: usersCount } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  console.log("\nמשתמשים רשומים:", usersCount);
}

main();
