/**
 * Google Drive to Supabase Sync Script
 *
 * This script syncs lesson transcripts from Google Drive to Supabase
 * with vector embeddings for semantic search.
 *
 * Usage:
 *   npx tsx scripts/sync-gdrive.ts --full    # Full sync (all transcripts)
 *   npx tsx scripts/sync-gdrive.ts           # Incremental sync (new/modified only)
 */

import "dotenv/config";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

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
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "OPENAI_API_KEY",
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Missing environment variables: ${missing.join(", ")}`);
    console.error("\nAdd to .env file:");
    missing.forEach((key) => console.error(`  ${key}=your_value`));
    process.exit(1);
  }

  // Check for Google credentials file
  const credentialsPath = path.join(process.env.HOME || "", ".google", "gcp-oauth.keys.json");
  if (!fs.existsSync(credentialsPath)) {
    console.error(`Missing Google credentials file: ${credentialsPath}`);
    console.error("Run the Google Drive MCP setup first or download OAuth credentials from Google Cloud Console");
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

// Google OAuth setup
async function getGoogleAuth() {
  const credentialsPath = path.join(
    process.env.HOME || "",
    ".google",
    "gcp-oauth.keys.json"
  );
  const tokenPath = path.join(
    process.env.HOME || "",
    ".google",
    "gdrive-token.json"
  );

  const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));
  const { client_id, client_secret } = credentials.installed;

  // Use OOB redirect - shows code in browser instead of localhost callback
  const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    "urn:ietf:wg:oauth:2.0:oob"
  );

  // Check for existing token
  if (fs.existsSync(tokenPath)) {
    const token = JSON.parse(fs.readFileSync(tokenPath, "utf-8"));
    oauth2Client.setCredentials(token);
    return oauth2Client;
  }

  // Get new token
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/drive.readonly"],
  });

  console.log("Authorize this app by visiting this url:", authUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise<typeof oauth2Client>((resolve) => {
    rl.question("Enter the code from that page here: ", async (code) => {
      rl.close();
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Save token
      fs.writeFileSync(tokenPath, JSON.stringify(tokens));
      console.log("Token stored to", tokenPath);

      resolve(oauth2Client);
    });
  });
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
  console.log(`Starting ${fullSync ? "FULL" : "incremental"} sync...`);

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

  try {
    // Get existing transcripts for incremental sync
    let existingFileIds: Set<string> = new Set();
    if (!fullSync) {
      const { data: existing } = await supabase
        .from("transcripts")
        .select("gdrive_file_id, gdrive_modified_at");

      existing?.forEach((t) => existingFileIds.add(t.gdrive_file_id));
    }

    // Search for all transcript documents across the entire Drive
    let pageToken: string | undefined;
    const allFiles: any[] = [];

    do {
      const response = await drive.files.list({
        q: "name contains 'Transcript:' and mimeType = 'application/vnd.google-apps.document'",
        fields:
          "nextPageToken, files(id, name, mimeType, modifiedTime, parents)",
        pageSize: 100,
        pageToken,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      const files = response.data.files || [];
      allFiles.push(...files);

      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    console.log(`Found ${allFiles.length} transcript files`);

    // Process in batches
    for (let i = 0; i < allFiles.length; i += CONFIG.BATCH_SIZE) {
      const batch = allFiles.slice(i, i + CONFIG.BATCH_SIZE);

      for (const file of batch) {
        filesProcessed++;

        try {
          // Skip if already synced (incremental mode)
          if (!fullSync && existingFileIds.has(file.id)) {
            console.log(`Skipping (already synced): ${file.name}`);
            continue;
          }

          console.log(`Processing (${filesProcessed}/${allFiles.length}): ${file.name}`);

          // Download file content
          const content = await drive.files.export({
            fileId: file.id,
            mimeType: "text/plain",
          });

          const text = content.data as string;
          if (!text || text.length < 100) {
            console.log(`  Skipping - too short`);
            continue;
          }

          // Skip very large files to avoid memory issues
          if (text.length > 500000) {
            console.log(`  Skipping - too large (${Math.round(text.length / 1000)}KB)`);
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
            console.error(`  Error saving transcript:`, transcriptError);
            filesFailed++;
            continue;
          }

          // Generate chunks and embeddings
          const chunks = chunkText(text);
          console.log(`  Generated ${chunks.length} chunks`);

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

          console.log(`  ✓ Synced successfully`);
        } catch (error) {
          console.error(`  Error processing ${file.name}:`, error);
          filesFailed++;
        }
      }

      // Rate limiting between batches
      if (i + CONFIG.BATCH_SIZE < allFiles.length) {
        console.log(`Waiting ${CONFIG.DELAY_BETWEEN_BATCHES_MS}ms...`);
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

    console.log("\n✅ Sync completed!");
    console.log(`   Processed: ${filesProcessed}`);
    console.log(`   Added: ${filesAdded}`);
    console.log(`   Updated: ${filesUpdated}`);
    console.log(`   Failed: ${filesFailed}`);
  } catch (error) {
    console.error("Sync failed:", error);

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
  }
}

// Run
const args = process.argv.slice(2);
const fullSync = args.includes("--full");

syncTranscripts(fullSync);
