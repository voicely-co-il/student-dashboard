/**
 * Google Drive to Supabase Sync Script (LITE - No Embeddings)
 *
 * This version syncs transcripts WITHOUT generating embeddings.
 * Use this when storage is limited or you don't need vector search.
 *
 * Usage:
 *   npx tsx scripts/sync-gdrive-lite.ts --full    # Full sync (all transcripts)
 *   npx tsx scripts/sync-gdrive-lite.ts           # Incremental sync (new/modified only)
 */

import "dotenv/config";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// Configuration
const CONFIG = {
  BATCH_SIZE: 10,
  DELAY_BETWEEN_BATCHES_MS: 500,
};

// Environment validation
function validateEnv() {
  const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Missing environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }

  const credentialsPath = path.join(process.env.HOME || "", ".google", "gcp-oauth.keys.json");
  if (!fs.existsSync(credentialsPath)) {
    console.error(`Missing Google credentials file: ${credentialsPath}`);
    process.exit(1);
  }
}

// Initialize Supabase
function initSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Google OAuth setup
async function getGoogleAuth() {
  const credentialsPath = path.join(process.env.HOME || "", ".google", "gcp-oauth.keys.json");
  const tokenPath = path.join(process.env.HOME || "", ".google", "gdrive-token.json");

  const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));
  const { client_id, client_secret } = credentials.installed;

  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, "urn:ietf:wg:oauth:2.0:oob");

  if (fs.existsSync(tokenPath)) {
    const token = JSON.parse(fs.readFileSync(tokenPath, "utf-8"));
    oauth2Client.setCredentials(token);
    return oauth2Client;
  }

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/drive.readonly"],
  });

  console.log("Authorize this app by visiting this url:", authUrl);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  return new Promise<typeof oauth2Client>((resolve) => {
    rl.question("Enter the code from that page here: ", async (code) => {
      rl.close();
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      fs.writeFileSync(tokenPath, JSON.stringify(tokens));
      resolve(oauth2Client);
    });
  });
}

// Skip speakers list (teacher names)
const SKIP_SPEAKERS = ["ענבל", "ענבל מיטין", "ענבל מיטין - פיתוח קול"];

function extractStudentFromContent(fullText: string): string | null {
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
        return cleanStudentName(speaker);
      }
    }
  }
  return null;
}

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

function parseStudentFromTitle(title: string): string | null {
  const withPattern = /with\s+(\w+)/i;
  const match = title.match(withPattern);
  return match ? cleanStudentName(match[1]) : null;
}

function parseDateFromTitle(title: string): Date | null {
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

// Main sync function
async function syncTranscripts(fullSync: boolean = false) {
  console.log(`\n🔄 Starting ${fullSync ? "FULL" : "incremental"} sync (LITE - no embeddings)...`);
  console.log(`   Time: ${new Date().toISOString()}\n`);

  validateEnv();
  const supabase = initSupabase();
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
        .select("gdrive_file_id");

      existing?.forEach((t) => existingFileIds.add(t.gdrive_file_id));
      console.log(`📚 Found ${existingFileIds.size} existing transcripts in DB`);
    }

    // Search for transcript documents
    let pageToken: string | undefined;
    const allFiles: any[] = [];

    console.log("🔍 Searching Google Drive for transcripts...");

    do {
      const response = await drive.files.list({
        q: "name contains 'Transcript:' and mimeType = 'application/vnd.google-apps.document'",
        fields: "nextPageToken, files(id, name, mimeType, modifiedTime, parents)",
        pageSize: 100,
        pageToken,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      const files = response.data.files || [];
      allFiles.push(...files);
      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    console.log(`📄 Found ${allFiles.length} transcript files`);

    // Process in batches
    for (let i = 0; i < allFiles.length; i += CONFIG.BATCH_SIZE) {
      const batch = allFiles.slice(i, i + CONFIG.BATCH_SIZE);

      for (const file of batch) {
        filesProcessed++;

        try {
          // Skip if already synced (incremental mode)
          if (!fullSync && existingFileIds.has(file.id)) {
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

          if (text.length > 500000) {
            console.log(`  Skipping - too large`);
            continue;
          }

          // Parse metadata
          const lessonDate = parseDateFromTitle(file.name);
          const studentName = extractStudentFromContent(text) || parseStudentFromTitle(file.name);

          // Upsert transcript (NO embeddings)
          const { error: transcriptError } = await supabase
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
              { onConflict: "gdrive_file_id" }
            );

          if (transcriptError) {
            console.error(`  Error saving transcript:`, transcriptError);
            filesFailed++;
            continue;
          }

          if (existingFileIds.has(file.id)) {
            filesUpdated++;
          } else {
            filesAdded++;
          }

          console.log(`  ✓ Synced (no embeddings)`);
        } catch (error) {
          console.error(`  Error processing ${file.name}:`, error);
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

    console.log("\n✅ Sync completed (LITE - no embeddings)!");
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
