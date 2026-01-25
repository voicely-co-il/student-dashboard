import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  // Get transcripts from today and yesterday
  const { data: transcripts } = await supabase
    .from("transcripts")
    .select("id, title, lesson_date, student_name, created_at")
    .gte("lesson_date", "2026-01-25")
    .order("lesson_date", { ascending: false });

  console.log("=== Transcripts from Jan 25+ ===");
  console.log(JSON.stringify(transcripts, null, 2));

  // Also check by created_at
  const { data: recent } = await supabase
    .from("transcripts")
    .select("id, title, lesson_date, student_name, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  console.log("\n=== Most Recent (by created_at) ===");
  for (const t of recent || []) {
    console.log(`${t.created_at?.slice(0,10)} | ${t.lesson_date?.slice(0,10) || "no date"} | ${t.title?.slice(0,60)}`);
  }

  // Check group lessons specifically
  const { data: groupLessons } = await supabase
    .from("group_lesson_analysis")
    .select("lesson_date, lesson_title, student_names")
    .order("lesson_date", { ascending: false })
    .limit(5);

  console.log("\n=== Group Lesson Analysis ===");
  for (const g of groupLessons || []) {
    console.log(`${g.lesson_date} | ${g.lesson_title?.slice(0,50)} | Students: ${g.student_names?.join(", ")}`);
  }

  // Search for group lessons by title pattern
  const { data: groupByTitle } = await supabase
    .from("transcripts")
    .select("id, title, lesson_date, created_at")
    .or("title.ilike.%group%,title.ilike.%קבוצ%")
    .order("lesson_date", { ascending: false })
    .limit(5);

  console.log("\n=== Group Lessons by Title Pattern ===");
  for (const t of groupByTitle || []) {
    console.log(`${t.lesson_date?.slice(0,10) || "?"} | ${t.title}`);
  }
}

check();
