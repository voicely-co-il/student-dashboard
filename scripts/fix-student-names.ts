/**
 * Fix Student Names Script
 *
 * This script extracts student names from transcript content and updates
 * the student_name field in Supabase.
 *
 * The student name is extracted from the first line of dialogue that
 * isn't from the teacher (ענבל).
 *
 * Usage:
 *   npx tsx scripts/fix-student-names.ts           # Update all missing names
 *   npx tsx scripts/fix-student-names.ts --all     # Re-extract all names
 *   npx tsx scripts/fix-student-names.ts --dry-run # Preview without updating
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// Configuration
const CONFIG = {
  BATCH_SIZE: 50,
  // Names to skip (teacher, system, etc.)
  SKIP_SPEAKERS: ["ענבל", "ענבל מיטין", "ענבל מיטין - פיתוח קול"],
};

// Environment validation
function validateEnv() {
  const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(`Missing environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }
}

// Initialize Supabase client
function initSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Extract student name from transcript content.
 * Looks for the first speaker that isn't the teacher.
 *
 * Format: "Speaker Name (timestamp): text"
 */
function extractStudentName(fullText: string): string | null {
  const lines = fullText.split("\n");

  // Check first 30 lines for a student speaker
  for (const line of lines.slice(0, 30)) {
    // Match pattern: 'Speaker Name (123.45): text'
    const match = line.trim().match(/^([^(]+)\s*\([\d.]+\):/);

    if (match) {
      let speaker = match[1].trim();

      // Remove BOM character if present
      speaker = speaker.replace(/^\ufeff/, "").trim();

      // Skip if empty or is the teacher
      if (!speaker) continue;

      const isTeacher = CONFIG.SKIP_SPEAKERS.some(
        (skip) => speaker.toLowerCase().includes(skip.toLowerCase()) ||
                  skip.toLowerCase().includes(speaker.toLowerCase())
      );

      if (!isTeacher) {
        return speaker;
      }
    }
  }

  return null;
}

/**
 * Clean and normalize student name
 */
function cleanStudentName(name: string): string {
  // Remove common prefixes/suffixes
  let cleaned = name
    .replace(/^\ufeff/, "") // BOM
    .replace(/\s*-\s*פיתוח קול$/, "") // Teacher suffix
    .replace(/\s*'s iPhone$/i, "") // iPhone suffix
    .replace(/\s*'s iPad$/i, "") // iPad suffix
    .replace(/^ה-iPhone של ⁨?/, "") // Hebrew iPhone prefix
    .replace(/⁩$/, "") // Special character suffix
    .replace(/^\d{10,}/, "") // Phone number prefix
    .trim();

  // Capitalize first letter of each word for English names
  if (/^[a-zA-Z\s]+$/.test(cleaned)) {
    cleaned = cleaned
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  return cleaned;
}

// Main function
async function fixStudentNames(options: { all: boolean; dryRun: boolean }) {
  console.log("🔧 Fix Student Names Script");
  console.log("=".repeat(50));
  console.log(`Mode: ${options.dryRun ? "DRY RUN" : "LIVE UPDATE"}`);
  console.log(`Scope: ${options.all ? "All transcripts" : "Missing names only"}`);
  console.log();

  validateEnv();
  const supabase = initSupabase();

  // Build query
  let query = supabase
    .from("transcripts")
    .select("id, title, full_text, student_name");

  // Only get transcripts without student_name if not --all
  if (!options.all) {
    query = query.is("student_name", null);
  }

  const { data: transcripts, error } = await query;

  if (error) {
    console.error("Error fetching transcripts:", error);
    process.exit(1);
  }

  if (!transcripts || transcripts.length === 0) {
    console.log("✅ No transcripts to update!");
    return;
  }

  console.log(`Found ${transcripts.length} transcripts to process`);
  console.log();

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const uniqueNames = new Set<string>();
  const failedTitles: string[] = [];

  for (const transcript of transcripts) {
    const extractedName = extractStudentName(transcript.full_text);

    if (!extractedName) {
      skipped++;
      failedTitles.push(transcript.title);
      continue;
    }

    const cleanedName = cleanStudentName(extractedName);
    uniqueNames.add(cleanedName.toLowerCase());

    if (options.dryRun) {
      console.log(`  📝 ${transcript.title.slice(0, 45)}...`);
      console.log(`     → ${cleanedName}`);
      updated++;
      continue;
    }

    // Update in Supabase
    const { error: updateError } = await supabase
      .from("transcripts")
      .update({ student_name: cleanedName })
      .eq("id", transcript.id);

    if (updateError) {
      console.error(`  ❌ Failed to update ${transcript.id}:`, updateError);
      failed++;
    } else {
      updated++;
    }

    // Also update transcript_chunks for this transcript
    const { error: chunksError } = await supabase
      .from("transcript_chunks")
      .update({ student_name: cleanedName })
      .eq("transcript_id", transcript.id);

    if (chunksError) {
      console.error(`  ⚠️ Failed to update chunks for ${transcript.id}:`, chunksError);
    }
  }

  // Summary
  console.log();
  console.log("=".repeat(50));
  console.log("📊 Summary:");
  console.log(`   Total processed: ${transcripts.length}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped (no name found): ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Unique students: ${uniqueNames.size}`);

  if (failedTitles.length > 0 && failedTitles.length <= 20) {
    console.log();
    console.log("⚠️ Could not extract name from:");
    for (const title of failedTitles) {
      console.log(`   - ${title.slice(0, 60)}`);
    }
  }

  if (options.dryRun) {
    console.log();
    console.log("💡 This was a dry run. Run without --dry-run to apply changes.");
  }
}

// Parse arguments and run
const args = process.argv.slice(2);
const options = {
  all: args.includes("--all"),
  dryRun: args.includes("--dry-run"),
};

fixStudentNames(options);
