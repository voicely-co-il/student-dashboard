/**
 * Setup Demo Student for Groups Platform
 * Creates a real student with data from transcripts
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const studentId = "72578603-7d42-47d5-9a42-668864c499fb";

  console.log("🔧 Setting up demo student data...\n");

  // Get any user as teacher for demo
  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name")
    .limit(1);

  console.log("Found users:", users?.length || 0);

  const teacherId = users?.[0]?.id;

  if (!teacherId) {
    console.log("⚠️ No teacher found, skipping group/challenge creation");
    console.log("The student dashboard will still work in demo mode");
    return;
  }

  // Create a group with teacher
  const { data: newGroup, error: createErr } = await supabase
    .from("groups")
    .insert({
      name: "קבוצת יהלומים",
      description: "קבוצת שירה לגילאי 10-12",
      teacher_id: teacherId,
    })
    .select()
    .single();

  if (createErr) {
    console.log("Group creation error:", createErr.message);
    return;
  }

  const groupId = newGroup.id;
  console.log("✅ Created group:", newGroup.name);

  // Update student with group
  await supabase
    .from("group_students")
    .update({ group_id: groupId })
    .eq("id", studentId);

  console.log("✅ Updated student with group");

  // Create challenge
  const { data: challenge, error: challengeError } = await supabase
    .from("weekly_challenges")
    .insert({
      group_id: groupId,
      title: "Diamond Challenge",
      title_he: "אתגר יהלומים",
      description_he: "שירו את Diamonds של ריהאנה והעלו את ההקלטה!",
      song_title: "Diamonds",
      song_artist: "Rihanna",
      song_excerpt_end_sec: 30,
      status: "active",
      starts_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      ends_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (challengeError) {
    console.log("Challenge error:", challengeError.message);
  } else {
    console.log("🏆 Created challenge:", challenge.title_he);
  }

  console.log("\n✅ Setup complete!");
  console.log(`\nView student dashboard at:`);
  console.log(`https://voicely-il.vercel.app/groups/student?demo=true`);
}

main().catch(console.error);
