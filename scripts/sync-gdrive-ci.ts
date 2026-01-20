/**
 * Google Drive to Supabase Sync Script (CI/CD Version)
 *
 * This version is designed for GitHub Actions and uses OAuth refresh token
 * stored in environment variables instead of local file system.
 *
 * Required Environment Variables:
 *   GOOGLE_CLIENT_ID - OAuth client ID
 *   GOOGLE_CLIENT_SECRET - OAuth client secret
 *   GOOGLE_REFRESH_TOKEN - OAuth refresh token
 *   SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Supabase service role key
 *   OPENAI_API_KEY - OpenAI API key for embeddings
 *
 * Usage:
 *   npx tsx scripts/sync-gdrive-ci.ts --full    # Full sync (all transcripts)
 *   npx tsx scripts/sync-gdrive-ci.ts           # Incremental sync (new/modified only)
 */

import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// Configuration
const CONFIG = {
  // Google Drive folder ID containing transcripts
  GDRIVE_FOLDER_ID: "1phKpNENjzPvc7FvMdJaySoFWVIu797f1",

  // Chunk size for vector embeddings (in characters)
  CHUNK_SIZE: 1000,
  CHUNK_OVERLAP: 200,

  // Rate limiting
  BATCH_SIZE: 10,
  DELAY_BETWEEN_BATCHES_MS: 1000,

  // File patterns
  TRANSCRIPT_PATTERN: /^Transcript:/i,
  AI_NOTES_PATTERN: /^AI Notes:/i,
};

// Environment validation
function validateEnv() {
  const required = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REFRESH_TOKEN",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "OPENAI_API_KEY",
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Missing environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }
}

// Initialize clients
function initClients() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  return { supabase, openai };
}

// Google OAuth setup using environment variables
async function getGoogleAuth() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "urn:ietf:wg:oauth:2.0:oob"
  );

  // Set credentials from environment
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  // Force token refresh to ensure we have a valid access token
  try {
    await oauth2Client.getAccessToken();
    console.log("✓ Google OAuth authenticated successfully");
  } catch (error) {
    console.error("Failed to authenticate with Google:", error);
    process.exit(1);
  }

  return oauth2Client;
}

// Skip speakers list (teacher names)
const SKIP_SPEAKERS = ["ענבל", "ענבל מיטין", "ענבל מיטין - פיתוח קול"];

/**
 * Extract student name from transcript content.
 * Looks for the first speaker that isn't the teacher.
 * Format: "Speaker Name (timestamp): text"
 */
function extractStudentFromContent(fullText: string): string | null {
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

      const isTeacher = SKIP_SPEAKERS.some(
        (skip) =>
          speaker.toLowerCase().includes(skip.toLowerCase()) ||
          skip.toLowerCase().includes(speaker.toLowerCase())
      );

      if (!isTeacher) {
        return cleanStudentName(speaker);
      }
    }
  }

  return null;
}

/**
 * Clean and normalize student name
 */
function cleanStudentName(name: string): string {
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

// Parse student name from file title (fallback)
function parseStudentFromTitle(title: string): string | null {
  // Pattern: "Transcript: Lesson Topic with StudentName | Date"
  const withPattern = /with\s+(\w+)/i;
  const match = title.match(withPattern);
  return match ? cleanStudentName(match[1]) : null;
}

// Parse date from file title
function parseDateFromTitle(title: string): Date | null {
  // Pattern: "| Dec 08, 2025" or "| Jan 15, 2025"
  const datePattern = /\|\s*(\w+\s+\d{1,2},\s+\d{4})/;
  const match = title.match(datePattern);
  if (match) {
    const parsed = new Date(match[1]);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
}

// Split text into chunks for embedding
function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  const maxChunks = 1000; // Safety limit

  while (start < text.length && chunks.length < maxChunks) {
    const end = Math.min(start + CONFIG.CHUNK_SIZE, text.length);

    // Try to break at a sentence or paragraph boundary
    let breakPoint = end;
    if (end < text.length) {
      // Search only within the current chunk window
      const searchStart = Math.max(start, end - 200);
      const lastPeriod = text.lastIndexOf(".", end);
      const lastNewline = text.lastIndexOf("\n", end);
      const bestBreak = Math.max(lastPeriod, lastNewline);

      // Only use the break point if it's within our chunk
      if (bestBreak > start && bestBreak < end) {
        breakPoint = bestBreak;
      }
    }

    const chunk = text.slice(start, breakPoint + 1).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    // Move forward - ensure we always progress
    const nextStart = breakPoint + 1 - CONFIG.CHUNK_OVERLAP;
    start = Math.max(nextStart, start + 100); // Always move at least 100 chars forward
  }

  return chunks.filter((chunk) => chunk.length > 50);
}

// Generate embedding using OpenAI (text-embedding-3-small - cheapest & good quality)
async function generateEmbedding(
  openai: OpenAI,
  text: string
): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

// Main sync function
async function syncTranscripts(fullSync: boolean = false) {
  console.log(`\n🔄 Starting ${fullSync ? "FULL" : "incremental"} sync...`);
  console.log(`   Time: ${new Date().toISOString()}\n`);

  validateEnv();
  const { supabase, openai } = initClients();
  const auth = await getGoogleAuth();
  const drive = google.drive({ version: "v3", auth });

  // Start sync log
  const { data: syncLog, error: syncLogError } = await supabase
    .from("gdrive_sync_log")
    .insert({
      sync_type: fullSync ? "full" : "incremental",
      status: "started",
    })
    .select()
    .single();

  if (syncLogError) {
    console.error("Failed to create sync log:", syncLogError);
    return;
  }

  let filesProcessed = 0;
  let filesAdded = 0;
  let filesUpdated = 0;
  let filesFailed = 0;
  let filesSkipped = 0;

  try {
    // Get last successful sync timestamp for incremental sync
    let lastSyncTime: string | null = null;
    let existingFileIds: Set<string> = new Set();
    let existingModifiedTimes: Map<string, string> = new Map();

    if (!fullSync) {
      // Get the last successful sync completion time
      const { data: lastSync } = await supabase
        .from("gdrive_sync_log")
        .select("completed_at")
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1)
        .single();

      if (lastSync?.completed_at) {
        lastSyncTime = lastSync.completed_at;
        console.log(`📅 Last successful sync: ${lastSyncTime}`);
      }

      // Also get existing file IDs for duplicate checking
      const { data: existing } = await supabase
        .from("transcripts")
        .select("gdrive_file_id, gdrive_modified_at");

      existing?.forEach((t) => {
        existingFileIds.add(t.gdrive_file_id);
        if (t.gdrive_modified_at) {
          existingModifiedTimes.set(t.gdrive_file_id, t.gdrive_modified_at);
        }
      });

      console.log(`📚 Found ${existingFileIds.size} existing transcripts in DB`);
    }

    // Build Google Drive query - only fetch files modified since last sync
    let driveQuery = "name contains 'Transcript:' and mimeType = 'application/vnd.google-apps.document'";

    if (!fullSync && lastSyncTime) {
      // Format for Google Drive API: RFC 3339 timestamp
      driveQuery += ` and modifiedTime > '${lastSyncTime}'`;
      console.log(`🔍 Searching for files modified after ${lastSyncTime}...`);
    } else {
      console.log("🔍 Searching Google Drive for ALL transcripts...");
    }

    // Search for transcript documents
    let pageToken: string | undefined;
    const allFiles: any[] = [];

    do {
      const response = await drive.files.list({
        q: driveQuery,
        fields:
          "nextPageToken, files(id, name, mimeType, modifiedTime, parents)",
        pageSize: 100,
        pageToken,
      });

      const files = response.data.files || [];
      allFiles.push(...files);

      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    console.log(`📄 Found ${allFiles.length} new/modified transcript files`);

    // If no new files, exit early
    if (allFiles.length === 0) {
      console.log("\n✅ No new transcripts to sync!");

      await supabase
        .from("gdrive_sync_log")
        .update({
          status: "completed",
          files_processed: 0,
          files_added: 0,
          files_updated: 0,
          files_failed: 0,
          completed_at: new Date().toISOString(),
        })
        .eq("id", syncLog.id);

      return;
    }

    // Process in batches
    for (let i = 0; i < allFiles.length; i += CONFIG.BATCH_SIZE) {
      const batch = allFiles.slice(i, i + CONFIG.BATCH_SIZE);

      for (const file of batch) {
        filesProcessed++;

        try {
          // Check if this is an update or new file
          const isUpdate = existingFileIds.has(file.id);
          if (isUpdate) {
            console.log(`🔄 Updating: ${file.name}`);
          } else {
            console.log(`➕ Adding: ${file.name}`);
          }

          console.log(`   (${filesProcessed}/${allFiles.length})`);

          // Download file content
          const content = await drive.files.export({
            fileId: file.id,
            mimeType: "text/plain",
          });

          const text = content.data as string;
          if (!text || text.length < 100) {
            console.log(`   ⏭️ Skipping - too short`);
            filesSkipped++;
            continue;
          }

          // Skip very large files to avoid memory issues
          if (text.length > 500000) {
            console.log(`   ⏭️ Skipping - too large (${Math.round(text.length / 1000)}KB)`);
            filesSkipped++;
            continue;
          }

          // Parse metadata - try content first, then title as fallback
          const lessonDate = parseDateFromTitle(file.name);
          const studentName = extractStudentFromContent(text) || parseStudentFromTitle(file.name);

          // Upsert transcript
          const { data: transcript, error: transcriptError } = await supabase
            .from("transcripts")
            .upsert(
              {
                gdrive_file_id: file.id,
                gdrive_folder_id: file.parents?.[0],
                title: file.name,
                full_text: text,
                student_name: studentName,
                lesson_date: lessonDate?.toISOString(),
                word_count: text.split(/\s+/).length,
                gdrive_modified_at: file.modifiedTime,
                last_synced_at: new Date().toISOString(),
              },
              {
                onConflict: "gdrive_file_id",
              }
            )
            .select()
            .single();

          if (transcriptError) {
            console.error(`   ❌ Error saving transcript:`, transcriptError);
            filesFailed++;
            continue;
          }

          // Generate chunks and embeddings
          const chunks = chunkText(text);
          console.log(`   📊 Generated ${chunks.length} chunks`);

          // Delete old chunks
          await supabase
            .from("transcript_chunks")
            .delete()
            .eq("transcript_id", transcript.id);

          // Insert new chunks with embeddings
          for (let j = 0; j < chunks.length; j++) {
            const chunk = chunks[j];
            const embedding = await generateEmbedding(openai, chunk);

            await supabase.from("transcript_chunks").insert({
              transcript_id: transcript.id,
              chunk_index: j,
              content: chunk,
              embedding: embedding,
              student_name: studentName,
              lesson_date: lessonDate?.toISOString(),
            });
          }

          if (existingFileIds.has(file.id)) {
            filesUpdated++;
          } else {
            filesAdded++;
          }

          console.log(`   ✅ Synced successfully`);
        } catch (error) {
          console.error(`   ❌ Error processing ${file.name}:`, error);
          filesFailed++;
        }
      }

      // Rate limiting between batches
      if (i + CONFIG.BATCH_SIZE < allFiles.length) {
        await new Promise((r) => setTimeout(r, CONFIG.DELAY_BETWEEN_BATCHES_MS));
      }
    }

    // Update sync log
    await supabase
      .from("gdrive_sync_log")
      .update({
        status: "completed",
        files_processed: filesProcessed,
        files_added: filesAdded,
        files_updated: filesUpdated,
        files_failed: filesFailed,
        completed_at: new Date().toISOString(),
      })
      .eq("id", syncLog.id);

    console.log("\n" + "=".repeat(50));
    console.log("✅ Sync completed!");
    console.log("=".repeat(50));
    console.log(`   📄 Processed: ${filesProcessed}`);
    console.log(`   ➕ Added: ${filesAdded}`);
    console.log(`   🔄 Updated: ${filesUpdated}`);
    console.log(`   ⏭️ Skipped: ${filesSkipped}`);
    console.log(`   ❌ Failed: ${filesFailed}`);
    console.log("=".repeat(50) + "\n");

    // Exit with error code if there were failures
    if (filesFailed > 0 && filesAdded === 0 && filesUpdated === 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Sync failed:", error);

    await supabase
      .from("gdrive_sync_log")
      .update({
        status: "failed",
        files_processed: filesProcessed,
        files_added: filesAdded,
        files_updated: filesUpdated,
        files_failed: filesFailed,
        error_message: String(error),
        completed_at: new Date().toISOString(),
      })
      .eq("id", syncLog.id);

    process.exit(1);
  }
}

// Run
const args = process.argv.slice(2);
const fullSync = args.includes("--full");

syncTranscripts(fullSync);
