/**
 * Initialize Student Name Mappings Table
 *
 * This script:
 * 1. Fetches all unique student names from transcripts
 * 2. Fetches all students from Notion CRM
 * 3. Cross-references and auto-matches where possible
 * 4. Populates the student_name_mappings table
 *
 * Usage:
 *   npx tsx scripts/init-name-mappings.ts
 *   npx tsx scripts/init-name-mappings.ts --reset  # Clear and re-populate
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Notion config
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_CRM_DATABASE_ID = process.env.NOTION_CRM_DATABASE_ID;

// Names that are clearly not students (blacklist)
const SUSPICIOUS_NAMES = [
  "The",
  "Employees",
  "Team",
  "Colleagues",
  "Stakeholders",
  "Residents",
  "Content",
  "Technology",
  "Iphone",
  "Ipad",
  "A",
  "Ai",
  "An",
  "My",
  "Asus",
  "Dell",
  "L1R4Z",
];

// Active statuses in Notion CRM
const ACTIVE_STATUSES = [
  "לומד 1:1",
  "לומד 1:1 לסירוגין",
  "לומד בקבוצה חמישי",
  "לומד בקבוצה -ראשון",
  "תלמידים ותיקים🎵",
];

interface TranscriptStudent {
  name: string;
  count: number;
  lastDate: string | null;
}

interface CRMStudent {
  id: string;
  name: string;
  status: string;
  isActive: boolean;
  normalized: string;
}

// Normalize name for comparison
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-zא-ת0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Check if name is suspicious
function isSuspicious(name: string): boolean {
  return SUSPICIOUS_NAMES.includes(name) || name.length <= 2;
}

// Fetch all unique student names from transcripts
async function fetchTranscriptStudents(): Promise<TranscriptStudent[]> {
  console.log("📄 Fetching student names from transcripts...");

  const { data, error } = await supabase
    .from("transcripts")
    .select("student_name, lesson_date")
    .not("student_name", "is", null);

  if (error) {
    throw new Error(`Failed to fetch transcripts: ${error.message}`);
  }

  // Group by name
  const nameMap = new Map<
    string,
    { count: number; dates: (string | null)[] }
  >();

  for (const t of data || []) {
    if (!t.student_name) continue;

    const existing = nameMap.get(t.student_name);
    if (existing) {
      existing.count++;
      if (t.lesson_date) existing.dates.push(t.lesson_date);
    } else {
      nameMap.set(t.student_name, {
        count: 1,
        dates: t.lesson_date ? [t.lesson_date] : [],
      });
    }
  }

  const result: TranscriptStudent[] = [];
  nameMap.forEach((data, name) => {
    const sortedDates = data.dates.filter(Boolean).sort();
    result.push({
      name,
      count: data.count,
      lastDate: sortedDates[sortedDates.length - 1] || null,
    });
  });

  console.log(`   Found ${result.length} unique student names`);
  return result;
}

// Fetch all students from Notion CRM
async function fetchCRMStudents(): Promise<CRMStudent[]> {
  console.log("📋 Fetching students from Notion CRM...");

  const students: CRMStudent[] = [];
  let hasMore = true;
  let cursor: string | undefined;

  while (hasMore) {
    const body: Record<string, unknown> = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;

    const response = await fetch(
      `https://api.notion.com/v1/databases/${NOTION_CRM_DATABASE_ID}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NOTION_API_KEY}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Notion API error: ${error}`);
    }

    const data = await response.json();

    for (const page of data.results) {
      const nameProperty = page.properties["שם התלמיד"];
      const name = nameProperty?.title?.[0]?.plain_text?.trim();
      if (!name) continue;

      const statusProperty = page.properties["סטטוס"];
      const status = statusProperty?.status?.name || "לא ידוע";

      students.push({
        id: page.id,
        name,
        status,
        isActive: ACTIVE_STATUSES.includes(status),
        normalized: normalize(name),
      });
    }

    hasMore = data.has_more;
    cursor = data.next_cursor;
  }

  console.log(`   Found ${students.length} students in CRM`);
  console.log(
    `   Active: ${students.filter((s) => s.isActive).length}`
  );
  return students;
}

// Find best CRM match for a transcript name
function findBestMatch(
  transcriptName: string,
  crmStudents: CRMStudent[]
): { match: CRMStudent | null; confidence: number } {
  const normalized = normalize(transcriptName);
  const firstName = normalized.split(" ")[0];

  let bestMatch: CRMStudent | null = null;
  let bestScore = 0;

  for (const student of crmStudents) {
    const studentFirst = student.normalized.split(" ")[0];
    let score = 0;

    // Exact match
    if (student.normalized === normalized) {
      score = 100;
    }
    // Starts with transcript name
    else if (student.normalized.startsWith(normalized + " ")) {
      score = 90;
    }
    // Transcript name starts with CRM name
    else if (normalized.startsWith(student.normalized + " ")) {
      score = 85;
    }
    // First name exact match (if 3+ chars)
    else if (studentFirst === firstName && firstName.length >= 3) {
      score = 70;
    }
    // Contains
    else if (
      student.normalized.includes(normalized) ||
      normalized.includes(student.normalized)
    ) {
      score = 50;
    }

    // Boost active students
    if (student.isActive && score > 0) {
      score += 5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = student;
    }
  }

  // Only return high confidence matches
  if (bestScore >= 70) {
    return { match: bestMatch, confidence: bestScore };
  }

  return { match: null, confidence: 0 };
}

// Main function
async function initNameMappings(reset: boolean = false) {
  console.log("\n🚀 Starting name mappings initialization...\n");

  // Reset if requested
  if (reset) {
    console.log("🗑️  Clearing existing mappings...");
    const { error } = await supabase
      .from("student_name_mappings")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all
    if (error) {
      console.error("Error clearing mappings:", error);
    }
  }

  // Fetch data
  const transcriptStudents = await fetchTranscriptStudents();
  const crmStudents = await fetchCRMStudents();

  // Stats
  let added = 0;
  let autoMatched = 0;
  let suspicious = 0;
  let pending = 0;

  console.log("\n🔄 Processing names...\n");

  for (const student of transcriptStudents) {
    // Check if suspicious
    if (isSuspicious(student.name)) {
      await supabase.from("student_name_mappings").upsert(
        {
          original_name: student.name,
          resolved_name: null,
          status: "rejected",
          transcript_count: student.count,
          last_seen_at: student.lastDate,
          notes: "זוהה אוטומטית כלא-תלמיד",
        },
        { onConflict: "original_name" }
      );
      suspicious++;
      continue;
    }

    // Try to find CRM match
    const { match, confidence } = findBestMatch(student.name, crmStudents);

    if (match && confidence >= 80) {
      // High confidence auto-match
      await supabase.from("student_name_mappings").upsert(
        {
          original_name: student.name,
          resolved_name: match.name,
          crm_match: match.name,
          status: "auto_matched",
          transcript_count: student.count,
          last_seen_at: student.lastDate,
          notes: `התאמה אוטומטית (${confidence}%) - ${match.status}`,
        },
        { onConflict: "original_name" }
      );
      autoMatched++;
      console.log(`   ✅ Auto: ${student.name} → ${match.name} (${confidence}%)`);
    } else if (match && confidence >= 50) {
      // Medium confidence - suggest but mark as pending
      await supabase.from("student_name_mappings").upsert(
        {
          original_name: student.name,
          resolved_name: null,
          crm_match: match.name,
          status: "pending",
          transcript_count: student.count,
          last_seen_at: student.lastDate,
          notes: `הצעה: ${match.name} (${confidence}%) - ${match.status}`,
        },
        { onConflict: "original_name" }
      );
      pending++;
      console.log(`   ⚠️  Suggest: ${student.name} → ${match.name}? (${confidence}%)`);
    } else {
      // No match found
      await supabase.from("student_name_mappings").upsert(
        {
          original_name: student.name,
          resolved_name: null,
          crm_match: null,
          status: "pending",
          transcript_count: student.count,
          last_seen_at: student.lastDate,
        },
        { onConflict: "original_name" }
      );
      pending++;
    }

    added++;
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 Summary:");
  console.log("=".repeat(50));
  console.log(`   Total processed: ${transcriptStudents.length}`);
  console.log(`   ✅ Auto-matched: ${autoMatched}`);
  console.log(`   ⚠️  Pending review: ${pending}`);
  console.log(`   ❌ Suspicious/rejected: ${suspicious}`);
  console.log("\n✨ Done! Go to /admin/names to review pending names.\n");
}

// Run
const args = process.argv.slice(2);
const reset = args.includes("--reset");

initNameMappings(reset).catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
