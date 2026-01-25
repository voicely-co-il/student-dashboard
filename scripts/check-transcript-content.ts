import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Known group student names
const GROUP_STUDENTS = ["עדי", "שיראל", "אורין", "לירז", "תהל", "נויה", "רוני", "שיר", "דנה", "יעל"];

async function check() {
  // Get transcripts from Jan 25
  const { data: transcripts } = await supabase
    .from("transcripts")
    .select("id, title, lesson_date, full_text, created_at")
    .gte("created_at", "2026-01-25")
    .order("created_at", { ascending: false });

  console.log(`Found ${transcripts?.length || 0} transcripts from Jan 25+\n`);

  for (const t of transcripts || []) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`📄 ${t.title}`);
    console.log(`   Date: ${t.lesson_date?.slice(0, 10) || "?"} | Created: ${t.created_at?.slice(0, 10)}`);

    const content = t.full_text || "";

    // Check for group students in content
    const foundStudents = GROUP_STUDENTS.filter(name => content.includes(name));

    if (foundStudents.length > 0) {
      console.log(`   🎯 FOUND STUDENTS: ${foundStudents.join(", ")}`);
    }

    // Show first few speakers
    const speakerPattern = /^(.+?)\s*\(\d+\.?\d*\):/gm;
    const speakers = new Set<string>();
    let match;
    while ((match = speakerPattern.exec(content)) !== null && speakers.size < 10) {
      let speaker = match[1].trim().replace(/\s*-\s*פיתוח קול\s*$/i, "").trim();
      if (speaker.length > 1 && speaker.length < 50) {
        speakers.add(speaker);
      }
    }

    if (speakers.size > 0) {
      console.log(`   Speakers: ${[...speakers].join(", ")}`);
    }

    // Check if it's a group lesson
    if (foundStudents.length >= 2) {
      console.log(`   ⭐ THIS IS A GROUP LESSON!`);
    }

    // Show snippet
    const lines = content.split("\n").filter(l => l.trim()).slice(0, 5);
    console.log(`   Preview:`);
    for (const line of lines) {
      console.log(`     ${line.slice(0, 80)}${line.length > 80 ? "..." : ""}`);
    }
  }
}

check();
