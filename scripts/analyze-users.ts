import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  "https://jldfxkbczzxawdqsznze.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log("=== ניתוח מבנה משתמשים ===\n");

  // Get users table structure by fetching some records
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("*")
    .limit(5);

  if (usersError) {
    console.error("שגיאה בקריאת users:", usersError.message);
  } else {
    console.log("דוגמת משתמשים:");
    console.log(JSON.stringify(users, null, 2));

    if (users && users.length > 0) {
      console.log("\nשדות בטבלת users:");
      console.log(Object.keys(users[0]).join(", "));
    }
  }

  // Get unique student names from transcripts
  const { data: transcriptNames } = await supabase
    .from("transcripts")
    .select("student_name")
    .not("student_name", "is", null);

  const uniqueNames = [...new Set(transcriptNames?.map(t => t.student_name))];
  console.log("\n=== שמות תלמידים בתמלולים ===");
  console.log("מספר שמות ייחודיים:", uniqueNames.length);
  console.log("דוגמאות:", uniqueNames.slice(0, 20).join(", "));

  // Check profiles table if exists
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .limit(5);

  if (!profilesError && profiles) {
    console.log("\n=== טבלת profiles ===");
    console.log(JSON.stringify(profiles, null, 2));
  }

  // Check for name fields in users
  const { data: allUsers } = await supabase
    .from("users")
    .select("id, email, full_name, display_name, first_name, last_name")
    .limit(20);

  if (allUsers) {
    console.log("\n=== שמות משתמשים (20 ראשונים) ===");
    for (const u of allUsers) {
      const name = u.full_name || u.display_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
      console.log(`${u.id.slice(0, 8)}... | ${name}`);
    }
  }
}

main();
