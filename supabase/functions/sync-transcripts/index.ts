import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Google Drive API
const GDRIVE_FOLDER_ID = "1phKpNENjzPvc7FvMdJaySoFWVIu797f1"; // תמלולים עדכניים

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  createdTime: string;
}

// Extract student name from title
function extractStudentName(title: string): string | null {
  // Common patterns: "Transcript: Name's Lesson", "Vocal Lesson — Name", etc.
  const patterns = [
    /Transcript:\s*(.+?)['']s/i,
    /(?:Vocal|Voice|Singing)\s+(?:Lesson|Session)\s*[—-]\s*(.+?)(?:\s*\||$)/i,
    /(.+?)['']s\s+(?:Zoom|Voice|Vocal|Lesson)/i,
    /(?:Lesson|Session)\s+(?:with|for)\s+(.+?)(?:\s*\||$)/i,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  // Try to extract name before common keywords
  const beforeKeyword = title.match(/^(.+?)\s*[-—|:]\s*(?:Vocal|Voice|Lesson|Session|Trial|Intro)/i);
  if (beforeKeyword) {
    return beforeKeyword[1].trim();
  }

  return null;
}

// Extract lesson date from title or file metadata
function extractLessonDate(title: string, modifiedTime: string): string {
  // Try to find date in title like "Jan 21, 2026"
  const dateMatch = title.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s*(\d{4})\b/i);
  if (dateMatch) {
    const months: Record<string, string> = {
      jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
      jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
    };
    const month = months[dateMatch[1].toLowerCase()];
    const day = dateMatch[2].padStart(2, "0");
    const year = dateMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Fallback to modified time
  return modifiedTime.split("T")[0];
}

// Get access token using OAuth2 refresh token
async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN)");
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const tokenData = await tokenResponse.json();

  if (!tokenData.access_token) {
    console.error("Token response:", tokenData);
    throw new Error("Failed to get Google access token");
  }

  return tokenData.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get access token using OAuth2 refresh token
    const access_token = await getAccessToken();
    console.log("Successfully obtained Google access token");

    // List files from Google Drive folder
    const listUrl = new URL("https://www.googleapis.com/drive/v3/files");
    listUrl.searchParams.set("q", `'${GDRIVE_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.document'`);
    listUrl.searchParams.set("fields", "files(id,name,mimeType,modifiedTime,createdTime)");
    listUrl.searchParams.set("pageSize", "100");
    listUrl.searchParams.set("orderBy", "modifiedTime desc");

    const filesResponse = await fetch(listUrl.toString(), {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const { files } = await filesResponse.json() as { files: DriveFile[] };
    console.log(`Found ${files?.length || 0} files in Google Drive`);

    // Get existing file IDs from DB
    const { data: existingFiles } = await supabase
      .from("transcripts")
      .select("gdrive_file_id");

    const existingIds = new Set(existingFiles?.map(f => f.gdrive_file_id) || []);

    // Find new files
    const newFiles = files?.filter(f => !existingIds.has(f.id)) || [];
    console.log(`${newFiles.length} new files to sync`);

    let synced = 0;
    let errors = 0;

    for (const file of newFiles.slice(0, 20)) { // Process max 20 at a time
      try {
        // Export document as plain text
        const exportUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain`;
        const textResponse = await fetch(exportUrl, {
          headers: { Authorization: `Bearer ${access_token}` },
        });

        if (!textResponse.ok) {
          console.error(`Failed to export ${file.name}`);
          errors++;
          continue;
        }

        const fullText = await textResponse.text();
        const studentName = extractStudentName(file.name);
        const lessonDate = extractLessonDate(file.name, file.modifiedTime);

        // Insert transcript
        const { error: insertError } = await supabase
          .from("transcripts")
          .insert({
            gdrive_file_id: file.id,
            title: `Transcript: ${file.name}`,
            full_text: fullText,
            student_name: studentName,
            lesson_date: lessonDate,
            word_count: fullText.split(/\s+/).length,
          });

        if (insertError) {
          console.error(`Failed to insert ${file.name}:`, insertError);
          errors++;
        } else {
          synced++;
          console.log(`✓ Synced: ${file.name} (${studentName})`);
        }

        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.error(`Error processing ${file.name}:`, err);
        errors++;
      }
    }

    // Generate embeddings for new transcripts (call another function)
    if (synced > 0) {
      // Trigger embedding generation
      await fetch(`${supabaseUrl}/functions/v1/generate-embeddings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ limit: synced }),
      }).catch(() => {}); // Non-blocking

      // Generate insights for new transcripts
      await fetch(`${supabaseUrl}/functions/v1/populate-insights`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ limit: synced }),
      }).catch(() => {}); // Non-blocking
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced,
        errors,
        totalInDrive: files?.length || 0,
        newFiles: newFiles.length,
        message: `Synced ${synced} new transcripts with ${errors} errors`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
