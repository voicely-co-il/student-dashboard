/**
 * Match Students from Transcripts to Notion CRM
 *
 * This script:
 * 1. Fetches all students from Notion CRM
 * 2. Gets unique student names from transcripts
 * 3. Attempts to match them using fuzzy matching
 * 4. Outputs a mapping file for review
 *
 * Usage:
 *   npx tsx scripts/match-students-notion.ts
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// Environment validation
function validateEnv() {
  const required = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NOTION_API_KEY",
    "NOTION_CRM_DATABASE_ID",
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Missing environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }
}

// Fetch all students from Notion CRM
async function fetchNotionStudents(): Promise<
  Array<{ id: string; name: string; status: string; phone?: string }>
> {
  const students: Array<{
    id: string;
    name: string;
    status: string;
    phone?: string;
  }> = [];
  let hasMore = true;
  let startCursor: string | undefined;

  while (hasMore) {
    const response = await fetch(
      `https://api.notion.com/v1/databases/${process.env.NOTION_CRM_DATABASE_ID}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page_size: 100,
          start_cursor: startCursor,
        }),
      }
    );

    const data = await response.json();

    for (const page of data.results || []) {
      const props = page.properties || {};
      const nameObj = props["שם התלמיד"]?.title || [];
      const name = nameObj[0]?.plain_text || "";
      const status = props["סטטוס"]?.status?.name || "";
      const phone = props["טלפון תלמיד"]?.phone_number || "";

      if (name) {
        students.push({
          id: page.id,
          name: name.trim(),
          status,
          phone: phone || undefined,
        });
      }
    }

    hasMore = data.has_more;
    startCursor = data.next_cursor;
  }

  return students;
}

// Fetch unique student names from transcripts
async function fetchTranscriptNames(): Promise<
  Array<{ name: string; count: number }>
> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get all transcripts and extract names
  const { data: transcripts } = await supabase
    .from("transcripts")
    .select("full_text");

  const nameCounts = new Map<string, number>();

  for (const t of transcripts || []) {
    const name = extractStudentFromContent(t.full_text);
    if (name) {
      const cleaned = cleanStudentName(name);
      nameCounts.set(cleaned, (nameCounts.get(cleaned) || 0) + 1);
    }
  }

  return Array.from(nameCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

// Extract student name from transcript content
function extractStudentFromContent(fullText: string): string | null {
  const SKIP_SPEAKERS = ["ענבל", "ענבל מיטין", "ענבל מיטין - פיתוח קול"];
  const lines = fullText.split("\n");

  for (const line of lines.slice(0, 30)) {
    const match = line.trim().match(/^([^(]+)\s*\([\d.]+\):/);
    if (match) {
      let speaker = match[1].trim().replace(/^\ufeff/, "").trim();
      if (!speaker) continue;

      const isTeacher = SKIP_SPEAKERS.some(
        (skip) =>
          speaker.toLowerCase().includes(skip.toLowerCase()) ||
          skip.toLowerCase().includes(speaker.toLowerCase())
      );

      if (!isTeacher) {
        return speaker;
      }
    }
  }
  return null;
}

// Clean student name
function cleanStudentName(name: string): string {
  let cleaned = name
    .replace(/^\ufeff/, "")
    .replace(/\s*-\s*פיתוח קול$/, "")
    .replace(/\s*'s iPhone$/i, "")
    .replace(/\s*'s iPad$/i, "")
    .replace(/^ה-iPhone של ⁨?/, "")
    .replace(/⁩$/, "")
    .replace(/^\d{10,}/, "")
    .trim();

  if (/^[a-zA-Z\s]+$/.test(cleaned)) {
    cleaned = cleaned
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  return cleaned;
}

// Common Hebrew-English name translations
const NAME_TRANSLATIONS: Record<string, string[]> = {
  // Hebrew -> English variations
  "גילי": ["gili", "gilly", "gilee"],
  "גל": ["gal"],
  "עדן": ["eden"],
  "עדי": ["adi"],
  "שי": ["shay", "shai"],
  "מיה": ["mia", "maya"],
  "מאיה": ["maya", "maia"],
  "נועם": ["noam"],
  "יובל": ["yuval"],
  "ליאל": ["liel"],
  "שיר": ["shir"],
  "שירה": ["shira"],
  "מור": ["mor"],
  "חן": ["chen"],
  "טל": ["tal"],
  "אור": ["or"],
  "ים": ["yam"],
  "רון": ["ron"],
  "בן": ["ben"],
  "דורית": ["dorit"],
  "אפרת": ["efrat"],
  "כרמל": ["carmel", "karmel"],
  "נטלי": ["natalie", "natali"],
  "מיכל": ["michal"],
  "תפארת": ["tiferet"],
  "אסף": ["asaf"],
  "חננאל": ["chananel", "hananel"],
  "יעל": ["yael"],
  "לירז": ["liraz"],
  "ענבל": ["inbal"],
  // English -> Hebrew variations
  "gili": ["גילי", "גלי"],
  "eden": ["עדן"],
  "shay": ["שי", "שיי"],
  "mia": ["מיה"],
  "maya": ["מאיה", "מיה"],
  "yuval": ["יובל"],
  "liel": ["ליאל"],
  "shir": ["שיר"],
  "shira": ["שירה"],
  "mor": ["מור"],
  "chen": ["חן"],
  "tal": ["טל"],
  "or": ["אור"],
  "ben": ["בן"],
  "dorit": ["דורית"],
  "efrat": ["אפרת"],
  "carmel": ["כרמל"],
  "natalie": ["נטלי"],
  "michal": ["מיכל"],
  "tiferet": ["תפארת"],
  "asaf": ["אסף"],
  "yael": ["יעל"],
  "inbal": ["ענבל"],
};

// Device names to skip
const DEVICE_NAMES = ["iphone", "ipad", "asus", "samsung", "telno", "android"];

// Check if name is a device name
function isDeviceName(name: string): boolean {
  const lower = name.toLowerCase();
  return DEVICE_NAMES.some(d => lower.includes(d));
}

// Normalize name for comparison
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\sא-ת]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Get first name from full name
function getFirstName(name: string): string {
  return normalizeName(name).split(" ")[0];
}

// Check if two names are translations of each other
function areTranslations(a: string, b: string): boolean {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  // Check direct translations
  const aTranslations = NAME_TRANSLATIONS[aLower] || [];
  if (aTranslations.some(t => t.toLowerCase() === bLower)) return true;

  const bTranslations = NAME_TRANSLATIONS[bLower] || [];
  if (bTranslations.some(t => t.toLowerCase() === aLower)) return true;

  return false;
}

// Calculate similarity between two strings
function similarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);

  // Skip device names
  if (isDeviceName(a) || isDeviceName(b)) return 0;

  // Exact match
  if (na === nb) return 1;

  // Check if names are translations of each other
  const aFirst = getFirstName(a);
  const bFirst = getFirstName(b);

  if (areTranslations(aFirst, bFirst)) {
    return 0.95; // Very high confidence for translations
  }

  // One contains the other completely (for full name vs first name)
  // But only if the shorter one is at least 3 chars
  if (na.length >= 3 && nb.length >= 3) {
    // Check if first names match exactly
    if (aFirst === bFirst && aFirst.length >= 2) {
      // First names match - check if it's a first name / full name situation
      if (na === aFirst || nb === bFirst) {
        return 0.9; // High confidence - first name matches full name's first name
      }
      return 0.85; // Both have same first name
    }

    // Check if one name is contained in the other
    if (na.includes(nb) && nb.length >= 3) return 0.8;
    if (nb.includes(na) && na.length >= 3) return 0.8;
  }

  return 0;
}

// Find best match from Notion for a transcript name
function findBestMatch(
  transcriptName: string,
  notionStudents: Array<{ id: string; name: string; status: string }>
): { match: (typeof notionStudents)[0] | null; score: number } {
  let bestMatch: (typeof notionStudents)[0] | null = null;
  let bestScore = 0;

  for (const student of notionStudents) {
    const score = similarity(transcriptName, student.name);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = student;
    }
  }

  return { match: bestScore >= 0.7 ? bestMatch : null, score: bestScore };
}

// Main
async function main() {
  console.log("🔍 Matching Students from Transcripts to Notion CRM");
  console.log("=".repeat(60));
  console.log();

  validateEnv();

  console.log("Fetching students from Notion CRM...");
  const notionStudents = await fetchNotionStudents();
  console.log(`  Found ${notionStudents.length} students in Notion`);

  console.log("Fetching unique names from transcripts...");
  const transcriptNames = await fetchTranscriptNames();
  console.log(`  Found ${transcriptNames.length} unique names in transcripts`);
  console.log();

  // Match
  const matched: Array<{
    transcriptName: string;
    count: number;
    notionName: string;
    notionId: string;
    score: number;
  }> = [];
  const unmatched: Array<{ name: string; count: number }> = [];

  for (const { name, count } of transcriptNames) {
    const { match, score } = findBestMatch(name, notionStudents);
    if (match) {
      matched.push({
        transcriptName: name,
        count,
        notionName: match.name,
        notionId: match.id,
        score,
      });
    } else {
      unmatched.push({ name, count });
    }
  }

  // Output results
  console.log("=".repeat(60));
  console.log(`✅ MATCHED: ${matched.length}`);
  console.log("=".repeat(60));
  for (const m of matched.slice(0, 30)) {
    const scoreStr = m.score === 1 ? "exact" : `${Math.round(m.score * 100)}%`;
    console.log(`  ${m.transcriptName} → ${m.notionName} (${scoreStr}, ${m.count} lessons)`);
  }
  if (matched.length > 30) {
    console.log(`  ... and ${matched.length - 30} more`);
  }

  console.log();
  console.log("=".repeat(60));
  console.log(`❌ UNMATCHED: ${unmatched.length}`);
  console.log("=".repeat(60));
  for (const u of unmatched) {
    console.log(`  ${u.name} (${u.count} lessons)`);
  }

  // Summary
  console.log();
  console.log("=".repeat(60));
  console.log("📊 SUMMARY");
  console.log("=".repeat(60));
  console.log(`  Total unique names in transcripts: ${transcriptNames.length}`);
  console.log(`  Matched to Notion: ${matched.length} (${Math.round((matched.length / transcriptNames.length) * 100)}%)`);
  console.log(`  Unmatched: ${unmatched.length}`);
  console.log();
  console.log("Next steps:");
  console.log("  1. Review unmatched names - some may need manual mapping");
  console.log("  2. Check if unmatched are typos, nicknames, or missing from CRM");
}

main().catch(console.error);
