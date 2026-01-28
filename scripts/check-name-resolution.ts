import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  "https://jldfxkbczzxawdqsznze.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log("=== בדיקת מערכת מיפוי שמות ===\n");

  // Check student_name_mappings
  const { data: mappings, count: mappingsCount } = await supabase
    .from("student_name_mappings")
    .select("*", { count: "exact" });

  console.log("=== טבלת student_name_mappings ===");
  console.log("סה\"כ רשומות:", mappingsCount);

  if (mappings) {
    const byStatus = {
      pending: mappings.filter(m => m.status === "pending").length,
      approved: mappings.filter(m => m.status === "approved").length,
      auto_matched: mappings.filter(m => m.status === "auto_matched").length,
      rejected: mappings.filter(m => m.status === "rejected").length,
    };

    console.log("לפי סטטוס:");
    console.log("  - ממתין (pending):", byStatus.pending);
    console.log("  - מאושר (approved):", byStatus.approved);
    console.log("  - אוטומטי (auto_matched):", byStatus.auto_matched);
    console.log("  - נדחה (rejected):", byStatus.rejected);

    const withUserId = mappings.filter(m => m.user_id).length;
    console.log("\nעם user_id:", withUserId);
  }

  // Check transcripts linking
  const { count: linkedTranscripts } = await supabase
    .from("transcripts")
    .select("*", { count: "exact", head: true })
    .not("user_id", "is", null);

  const { count: totalTranscripts } = await supabase
    .from("transcripts")
    .select("*", { count: "exact", head: true });

  console.log("\n=== קישור תמלולים ===");
  console.log("סה\"כ תמלולים:", totalTranscripts);
  console.log("מקושרים (עם user_id):", linkedTranscripts);
  console.log("אחוז קישור:", ((linkedTranscripts || 0) / (totalTranscripts || 1) * 100).toFixed(1) + "%");

  // Show top pending names for Inbal
  console.log("\n=== 15 שמות בעדיפות גבוהה לביקורת ===");
  const { data: pendingMappings } = await supabase
    .from("student_name_mappings")
    .select("original_name, transcript_count, crm_match")
    .eq("status", "pending")
    .order("transcript_count", { ascending: false })
    .limit(15);

  if (pendingMappings) {
    for (const m of pendingMappings) {
      const crmNote = m.crm_match ? ` → הצעה: ${m.crm_match}` : "";
      console.log(`${m.original_name}: ${m.transcript_count} תמלולים${crmNote}`);
    }
  }

  console.log("\n📍 עמוד הניהול: /admin/name-resolution");
}

main();
