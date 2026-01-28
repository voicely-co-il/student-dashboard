import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = "https://jldfxkbczzxawdqsznze.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== בדיקת תמלולים אחרונים ===\n");

  // Check recent transcripts
  const { data: transcripts, error } = await supabase
    .from("transcripts")
    .select("id, student_name, lesson_date, embedding_status, chunks_count, created_at")
    .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }

  console.log("תמלולים מ-7 ימים אחרונים:");
  console.log("-".repeat(80));

  if (!transcripts || transcripts.length === 0) {
    console.log("אין תמלולים חדשים");
  } else {
    for (const t of transcripts) {
      const date = new Date(t.lesson_date).toLocaleDateString("he-IL");
      const status = t.embedding_status || "N/A";
      const chunks = t.chunks_count || 0;
      console.log(t.student_name + " | " + date + " | סטטוס: " + status + " | chunks: " + chunks);
    }
  }

  // Check embedding stats
  console.log("\n=== סטטיסטיקת Embeddings ===\n");

  const { data: stats } = await supabase
    .from("embedding_stats")
    .select("*");

  if (stats) {
    for (const s of stats) {
      const avgChunks = s.avg_chunks || 0;
      console.log(s.embedding_status + ": " + s.count + " תמלולים (ממוצע chunks: " + avgChunks + ")");
    }
  }

  // Check queue
  console.log("\n=== תור עיבוד ===\n");

  const { data: queue } = await supabase
    .from("embeddings_queue")
    .select("status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  if (queue && queue.length > 0) {
    for (const q of queue) {
      console.log("סטטוס: " + q.status + " | " + new Date(q.created_at).toLocaleString("he-IL"));
    }
  } else {
    console.log("התור ריק");
  }
}

main();
