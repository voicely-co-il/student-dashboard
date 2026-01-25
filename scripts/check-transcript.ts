import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function check() {
  const { data } = await supabase
    .from("transcripts")
    .select("id, title, full_text")
    .ilike("title", "%Group%")
    .order("lesson_date", { ascending: false })
    .limit(1)
    .single();

  if (data) {
    console.log("Title:", data.title);
    console.log("\nFirst 2000 chars of content:\n");
    console.log(data.full_text?.slice(0, 2000));
  }
}

check();
