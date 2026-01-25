import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const GROUP_STUDENTS = [
  "עדי",
  "שיראל",
  "אורין",
  "לירז",
  "תהל",
  "נויה",
  "רוני",
  "שיר",
  "דנה",
  "יעל",
];

async function debug() {
  const { data } = await supabase
    .from("transcripts")
    .select("id, title, full_text")
    .ilike("title", "%Group%")
    .order("lesson_date", { ascending: false })
    .limit(1)
    .single();

  if (!data) {
    console.log("No transcript found");
    return;
  }

  console.log("Title:", data.title);
  console.log("\n=== Testing Pattern Matching ===\n");

  const content = data.full_text || "";
  const lines = content.split("\n").slice(0, 30);

  console.log("First 30 lines:\n");
  for (const line of lines) {
    if (line.trim()) {
      console.log(`"${line.slice(0, 80)}${line.length > 80 ? '...' : ''}"`);
    }
  }

  console.log("\n\n=== Testing Pattern Matching ===\n");

  for (let line of lines) {
    // Remove BOM and trim
    line = line.replace(/^\uFEFF/, "").trim();

    // Match Timeless format: "Speaker (123.45): text"
    const timelessMatch = line.match(/^(.+?)\s*\((\d+\.?\d*)\):\s*(.+)$/);

    if (timelessMatch) {
      let speaker = timelessMatch[1].trim();
      speaker = speaker.replace(/\s*-\s*פיתוח קול\s*$/i, "").trim();

      const isStudent = GROUP_STUDENTS.some(name => speaker.includes(name));

      console.log(`Matched: "${speaker}" -> isStudent: ${isStudent}`);
    }
  }
}

debug();
