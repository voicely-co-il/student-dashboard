import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Voicely Calendar IDs - mapped by lesson type
const VOICELY_CALENDARS = {
  one_on_one: "9e88f9bf71cfa6dc0ec7689c08ef80684430a12ed1a6aa09fb1befdf1968ae24@group.calendar.google.com",
  group: "14009a9db57855b9eedf4d203624fab11690206bfef925334299e7b512244a29@group.calendar.google.com",
  trial: "234bb6ad3c294ac2047bfd3b91c1a4c73b6245c81409b6592b7de448759e3395@group.calendar.google.com",
  alternating: "095603f9667854e40fd1e6c547ad4a91f30014bae8e9ab517759e1afa4cf910c@group.calendar.google.com",
} as const;

// Calendar display names
const CALENDAR_NAMES: Record<string, string> = {
  one_on_one: "1:1 Voicely",
  group: "קבוצות",
  trial: "שיעורי ניסיון",
  alternating: "לומד 1:1 לסירוגין",
};

// Intent types the AI can classify
type Intent =
  | "crm_add_student"
  | "crm_update_student"
  | "crm_search_student"
  | "calendar_add_event"
  | "calendar_view"
  | "transcript_search"
  | "lesson_plan"
  | "web_search"
  | "general_question"
  | "unknown";

interface ClassifiedIntent {
  intent: Intent;
  entities: Record<string, string | undefined>;
  confidence: number;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

// System prompt for the AI assistant
const SYSTEM_PROMPT = `אתה עוזר AI של Voicely, מערכת לניהול שיעורי קול ושירה.
את/ה מדבר/ת עברית ועוזר/ת למורה ענבל לנהל את התלמידים, השיעורים והתמלולים.

יכולות שלך:
1. **CRM (Notion)**: להוסיף תלמידים חדשים, לעדכן פרטים, לחפש תלמידים
2. **יומן (Google Calendar)**: לקבוע שיעורים, לראות זמינות
3. **תמלולים**: לחפש מידע בתמלולי שיעורים קודמים
4. **תכנון**: לעזור בתכנון שיעורים על בסיס היסטוריה

כשמבקשים ממך לבצע פעולה:
- שאל לאשר לפני פעולות שמשנות נתונים
- הצג סיכום של מה שאתה הולך לעשות
- דווח על הצלחה או כישלון

הנחיות:
- דבר בעברית טבעית וחמימה
- היה תמציתי אבל ידידותי
- אם חסר מידע - שאל
- אם לא בטוח - בקש אישור`;

// Classify user intent using Gemini
async function classifyIntent(
  message: string,
  history: ConversationMessage[]
): Promise<ClassifiedIntent> {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");

  const classificationPrompt = `You are classifying user intent for a voice teacher's assistant app.

Message: "${message}"

Recent conversation:
${history.slice(-3).map(m => `${m.role}: ${m.content}`).join("\n")}

Return JSON in this exact format:
{
  "intent": "crm_add_student" | "crm_update_student" | "crm_search_student" | "calendar_add_event" | "calendar_view" | "transcript_search" | "lesson_plan" | "web_search" | "general_question" | "unknown",
  "entities": {
    "student_name": "name of the student mentioned (e.g., Dana, Sarah Cohen)",
    "date": "date mentioned (e.g., tomorrow, מחר, 21/1, יום שני)",
    "time": "time mentioned (e.g., 15:00, 3pm, בשעה 10)",
    "phone": "phone number if mentioned",
    "search_query": "search terms if relevant",
    "lesson_type": "trial | one_on_one | group | null (detect from: שיעור ניסיון/trial, שיעור פרטי/1:1/אחד על אחד, קבוצה/קבוצתי/group)"
  },
  "confidence": 0.0-1.0
}

Important:
- Extract student_name from phrases like "lesson with Dana", "שיעור עם דנה", "for student X".
- lesson_type detection:
  - "trial" = שיעור ניסיון, trial lesson, ניסיון
  - "one_on_one" = שיעור פרטי, 1:1, אחד על אחד, פרטי
  - "group" = קבוצה, קבוצתי, group
  - null = not specified (need to ask)
- web_search: Use when user asks about general knowledge, techniques, methods, or anything that requires up-to-date information from the internet (e.g., "what is belting", "how to warm up voice", "מה זה head voice").
Return ONLY valid JSON, no markdown or extra text.`;

  try {
    console.log("Classifying intent for message:", message);
    console.log("Gemini API key exists:", !!geminiKey);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: classificationPrompt }] }],
          generationConfig: { maxOutputTokens: 500 },
        }),
      }
    );

    const data = await response.json();
    console.log("Gemini classification response:", JSON.stringify(data));
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("Classification error:", error);
  }

  return { intent: "general_question", entities: {}, confidence: 0.5 };
}

// Search Notion CRM for students
async function searchNotionCRM(query: string): Promise<any[]> {
  const notionKey = Deno.env.get("NOTION_API_KEY");
  const databaseId = Deno.env.get("NOTION_CRM_DATABASE_ID");

  if (!notionKey || !databaseId) {
    console.error("Missing Notion credentials");
    return [];
  }

  try {
    const response = await fetch(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${notionKey}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page_size: 20,
        }),
      }
    );

    const data = await response.json();
    const students: any[] = [];

    for (const page of data.results || []) {
      const props = page.properties || {};
      const nameObj = props["שם התלמיד"]?.title || [];
      const name = nameObj[0]?.plain_text || "";
      const status = props["סטטוס"]?.status?.name || "";
      const phone = props["טלפון תלמיד"]?.phone_number || "";

      if (name && name.toLowerCase().includes(query.toLowerCase())) {
        students.push({ id: page.id, name, status, phone });
      }
    }

    return students;
  } catch (error) {
    console.error("Notion search error:", error);
    return [];
  }
}

// Add student to Notion CRM
async function addStudentToNotion(
  name: string,
  phone?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const notionKey = Deno.env.get("NOTION_API_KEY");
  const databaseId = Deno.env.get("NOTION_CRM_DATABASE_ID");

  if (!notionKey || !databaseId) {
    return { success: false, error: "Missing Notion credentials" };
  }

  try {
    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionKey}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: {
          "שם התלמיד": {
            title: [{ text: { content: name } }],
          },
          ...(phone && {
            "טלפון תלמיד": { phone_number: phone },
          }),
          "סטטוס": {
            status: { name: "פעיל" },
          },
        },
      }),
    });

    const data = await response.json();

    if (data.id) {
      return { success: true, id: data.id };
    } else {
      return { success: false, error: data.message || "Failed to create" };
    }
  } catch (error) {
    console.error("Notion add error:", error);
    return { success: false, error: String(error) };
  }
}

// Google Calendar: Get OAuth token using Service Account
async function getGoogleAccessToken(): Promise<string | null> {
  const serviceEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const privateKey = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");

  if (!serviceEmail || !privateKey) {
    console.error("Missing Google Service Account credentials");
    return null;
  }

  try {
    // Create JWT header
    const header = {
      alg: "RS256",
      typ: "JWT",
    };

    // Create JWT claim set
    const now = Math.floor(Date.now() / 1000);
    const claimSet = {
      iss: serviceEmail,
      scope: "https://www.googleapis.com/auth/calendar",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    };

    // Base64url encode
    const base64UrlEncode = (obj: object) => {
      const json = JSON.stringify(obj);
      const encoded = encodeBase64(new TextEncoder().encode(json));
      return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    };

    const headerB64 = base64UrlEncode(header);
    const claimSetB64 = base64UrlEncode(claimSet);
    const signatureInput = `${headerB64}.${claimSetB64}`;

    // Import private key and sign
    const pemContents = privateKey
      .replace("-----BEGIN PRIVATE KEY-----", "")
      .replace("-----END PRIVATE KEY-----", "")
      .replace(/\n/g, "");

    const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      new TextEncoder().encode(signatureInput)
    );

    const signatureB64 = encodeBase64(new Uint8Array(signature))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    const jwt = `${signatureInput}.${signatureB64}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    const tokenData = await tokenResponse.json();
    return tokenData.access_token || null;
  } catch (error) {
    console.error("Google OAuth error:", error);
    return null;
  }
}

// Google Calendar: Get upcoming events
async function getCalendarEvents(days = 7): Promise<any[]> {
  const accessToken = await getGoogleAccessToken();
  const calendarId = Deno.env.get("GOOGLE_CALENDAR_ID") || "primary";

  if (!accessToken) {
    return [];
  }

  try {
    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
        `timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&` +
        `singleEvents=true&orderBy=startTime&maxResults=20`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error("Calendar API error:", data.error);
      return [];
    }

    return (data.items || []).map((event: any) => ({
      id: event.id,
      title: event.summary || "ללא כותרת",
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      description: event.description,
    }));
  } catch (error) {
    console.error("Get calendar events error:", error);
    return [];
  }
}

// Google Calendar: Create event in the appropriate calendar based on lesson type
async function createCalendarEvent(
  title: string,
  startTime: string,
  endTime: string,
  description?: string,
  lessonType?: string
): Promise<{ success: boolean; eventId?: string; calendarName?: string; error?: string }> {
  const accessToken = await getGoogleAccessToken();

  // Select calendar based on lesson type
  let calendarId: string;
  let calendarName: string;

  switch (lessonType) {
    case "trial":
      calendarId = VOICELY_CALENDARS.trial;
      calendarName = CALENDAR_NAMES.trial;
      break;
    case "group":
      calendarId = VOICELY_CALENDARS.group;
      calendarName = CALENDAR_NAMES.group;
      break;
    case "alternating":
      calendarId = VOICELY_CALENDARS.alternating;
      calendarName = CALENDAR_NAMES.alternating;
      break;
    case "one_on_one":
    default:
      calendarId = VOICELY_CALENDARS.one_on_one;
      calendarName = CALENDAR_NAMES.one_on_one;
      break;
  }

  if (!accessToken) {
    return { success: false, error: "Failed to authenticate with Google" };
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: title,
          description: description || "",
          start: { dateTime: startTime, timeZone: "Asia/Jerusalem" },
          end: { dateTime: endTime, timeZone: "Asia/Jerusalem" },
        }),
      }
    );

    const data = await response.json();

    if (data.id) {
      return { success: true, eventId: data.id, calendarName };
    } else {
      return { success: false, error: data.error?.message || "Failed to create event" };
    }
  } catch (error) {
    console.error("Create calendar event error:", error);
    return { success: false, error: String(error) };
  }
}

// Parse Hebrew date/time to ISO format
function parseHebrewDateTime(
  dateStr?: string,
  timeStr?: string
): { startTime: string; endTime: string } | null {
  const now = new Date();
  let targetDate = new Date(now);

  // Parse date
  if (dateStr) {
    const lowerDate = dateStr.toLowerCase();
    if (lowerDate === "היום" || lowerDate === "today") {
      // Already set to today
    } else if (lowerDate === "מחר" || lowerDate === "tomorrow") {
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (lowerDate.includes("יום")) {
      // Hebrew day names
      const days: Record<string, number> = {
        "ראשון": 0, "שני": 1, "שלישי": 2, "רביעי": 3,
        "חמישי": 4, "שישי": 5, "שבת": 6,
      };
      for (const [name, dayNum] of Object.entries(days)) {
        if (lowerDate.includes(name)) {
          const currentDay = now.getDay();
          let daysUntil = dayNum - currentDay;
          if (daysUntil <= 0) daysUntil += 7;
          targetDate.setDate(targetDate.getDate() + daysUntil);
          break;
        }
      }
    } else {
      // Try to parse DD/MM or DD.MM format
      const match = dateStr.match(/(\d{1,2})[\/\.](\d{1,2})/);
      if (match) {
        targetDate.setDate(parseInt(match[1]));
        targetDate.setMonth(parseInt(match[2]) - 1);
      }
    }
  }

  // Parse time
  let hour = 10; // Default to 10:00
  let minute = 0;
  if (timeStr) {
    const timeMatch = timeStr.match(/(\d{1,2}):?(\d{2})?/);
    if (timeMatch) {
      hour = parseInt(timeMatch[1]);
      minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    }
  }

  targetDate.setHours(hour, minute, 0, 0);

  // Create end time (1 hour later by default for lessons)
  const endDate = new Date(targetDate.getTime() + 60 * 60 * 1000);

  return {
    startTime: targetDate.toISOString(),
    endTime: endDate.toISOString(),
  };
}

// Search transcripts using vector similarity with text fallback
async function searchTranscripts(
  _supabase: any, // Keep param for compatibility but create fresh client
  query: string,
  limit = 5
): Promise<any[]> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  console.log(`[searchTranscripts] Starting search for query: "${query}"`);
  console.log(`[searchTranscripts] Supabase URL exists: ${!!supabaseUrl}, Service Key exists: ${!!supabaseServiceKey}`);

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[searchTranscripts] Missing Supabase credentials!");
    return [];
  }

  // Create a fresh Supabase client to ensure proper connection
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Extract keywords from query (remove common Hebrew stop words - must be whole words)
  const stopWords = ["חפש", "בתמלולים", "תמלולים", "את", "של", "על", "עם", "מה", "איך", "למה", "מי", "מתי", "איפה"];
  const keywords = query
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.includes(w))
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
  console.log(`[searchTranscripts] Extracted keywords:`, keywords);

  // First try text search for exact matches using Supabase client
  if (keywords.length > 0) {
    for (const keyword of keywords) {
      try {
        console.log(`[searchTranscripts] Trying Supabase client text search for keyword: "${keyword}"`);

        // Use Supabase client with ilike - note: column is student_name not student_id
        const { data: textResults, error: textError } = await supabase
          .from("transcript_chunks")
          .select("id, transcript_id, student_name, content, lesson_date")
          .ilike("content", `%${keyword}%`)
          .order("lesson_date", { ascending: false, nullsFirst: false })
          .limit(limit);

        if (textError) {
          console.error(`[searchTranscripts] Supabase client error:`, JSON.stringify(textError));
          continue;
        }

        console.log(`[searchTranscripts] Supabase client result for "${keyword}": ${textResults?.length || 0} results`);

        if (textResults && textResults.length > 0) {
          console.log(`[searchTranscripts] Text search found ${textResults.length} results for "${keyword}"`);
          return textResults.map((r: any) => ({
            chunk_id: r.id,
            transcript_id: r.transcript_id,
            student_name: r.student_name,
            content: r.content,
            lesson_date: r.lesson_date,
            similarity: 1.0, // exact match
          }));
        }
      } catch (e) {
        console.error(`[searchTranscripts] Text search exception for "${keyword}":`, e);
      }
    }
  }
  console.log(`[searchTranscripts] No text search results, falling back to semantic search`);

  // Fall back to semantic search if no text matches
  if (!openaiKey) {
    console.error("Missing OpenAI key for semantic search");
    return [];
  }

  try {
    // Generate embedding
    const embeddingResponse = await fetch(
      "https://api.openai.com/v1/embeddings",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: query,
        }),
      }
    );

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data?.[0]?.embedding;

    if (!queryEmbedding) {
      console.error("Failed to generate embedding");
      return [];
    }

    // Search using RPC with lower threshold for better recall
    const { data: results, error } = await supabase.rpc("search_transcripts", {
      query_embedding: queryEmbedding,
      match_threshold: 0.4, // Lowered from 0.7 for better recall
      match_count: limit,
      filter_student_id: null,
    });

    if (error) {
      console.error("Search RPC error:", error);
      return [];
    }

    console.log(`Semantic search found ${results?.length || 0} results for "${query}"`);
    return results || [];
  } catch (error) {
    console.error("Transcript search error:", error);
    return [];
  }
}

// Search the web using Perplexity API
async function searchWeb(query: string): Promise<string> {
  const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");

  if (!perplexityKey) {
    console.log("Perplexity API key not configured");
    return "";
  }

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${perplexityKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant. Provide concise, factual answers in Hebrew. Focus on vocal coaching, singing, and voice training topics.",
          },
          {
            role: "user",
            content: query,
          },
        ],
        max_tokens: 500,
        temperature: 0.2,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (content) {
      return `[חיפוש אינטרנט: ${content}]`;
    }
    return "";
  } catch (error) {
    console.error("Perplexity search error:", error);
    return "";
  }
}

// Build Gemini contents for both streaming and non-streaming
function buildGeminiContents(
  message: string,
  context: string,
  history: ConversationMessage[],
  customSystemPrompt?: string
) {
  // Build conversation for Gemini
  const conversationParts = history.slice(-6).map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  // If context indicates a completed action (starts with ✅), prioritize it
  const contextInstruction = context.startsWith("✅")
    ? `חשוב מאוד: ${context}`
    : `[קונטקסט: ${context}]`;

  conversationParts.push({
    role: "user",
    parts: [{ text: `${message}\n\n${contextInstruction}` }],
  });

  // Build system prompt - combine default with custom project prompt
  const finalSystemPrompt = customSystemPrompt
    ? `${SYSTEM_PROMPT}\n\n--- הנחיות נוספות מהפרויקט ---\n${customSystemPrompt}`
    : SYSTEM_PROMPT;

  // Add system prompt as first message
  return [
    { role: "user", parts: [{ text: finalSystemPrompt + "\n\nענה בעברית." }] },
    { role: "model", parts: [{ text: "הבנתי, אני מוכן לעזור." }] },
    ...conversationParts,
  ];
}

// Generate streaming response using Gemini
async function generateStreamingResponse(
  message: string,
  intent: ClassifiedIntent,
  context: string,
  history: ConversationMessage[],
  customSystemPrompt?: string
): Promise<ReadableStream> {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  const allContents = buildGeminiContents(message, context, history, customSystemPrompt);

  console.log("Starting streaming response with context:", context);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: allContents,
        generationConfig: { maxOutputTokens: 2000 },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Gemini streaming error:", error);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  // Transform Gemini SSE to our own SSE format
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const jsonStr = line.slice(6).trim();
              if (jsonStr && jsonStr !== "[DONE]") {
                try {
                  const data = JSON.parse(jsonStr);
                  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (text) {
                    // Send text chunk
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                  }
                } catch (e) {
                  // Skip malformed JSON
                }
              }
            }
          }
        }

        // Signal completion
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      } catch (error) {
        console.error("Stream processing error:", error);
        controller.error(error);
      }
    },
  });
}

// Generate response using Gemini (non-streaming fallback)
async function generateResponse(
  message: string,
  intent: ClassifiedIntent,
  context: string,
  history: ConversationMessage[],
  customSystemPrompt?: string
): Promise<string> {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  const allContents = buildGeminiContents(message, context, history, customSystemPrompt);

  try {
    console.log("Generating response with context:", context);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: allContents,
          generationConfig: { maxOutputTokens: 2000 },
        }),
      }
    );

    const data = await response.json();
    console.log("Gemini response generation result:", JSON.stringify(data));

    if (data.error) {
      console.error("Gemini API error:", data.error);
      return `מצטער, יש בעיה עם ה-API: ${data.error.message || JSON.stringify(data.error)}`;
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text || "מצטער, לא הצלחתי לעבד את הבקשה.";
  } catch (error) {
    console.error("Response generation error:", error);
    return "מצטער, נתקלתי בבעיה טכנית.";
  }
}

// Main handler
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    const { message, teacherId, conversationHistory = [], customSystemPrompt, stream = false } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Classify intent
    const intent = await classifyIntent(message, conversationHistory);
    console.log("Classified intent:", intent);

    let context = "";
    const actions: any[] = [];

    // Process based on intent
    switch (intent.intent) {
      case "crm_add_student": {
        const name = intent.entities.student_name;
        if (name) {
          context = `המשתמש רוצה להוסיף תלמיד בשם "${name}". שאל אם לאשר את ההוספה.`;
          actions.push({
            type: "crm_add",
            label: `הוספת ${name}`,
            status: "pending",
            data: { name, phone: intent.entities.phone },
          });
        } else {
          context = "המשתמש רוצה להוסיף תלמיד אבל לא ציין שם. בקש את שם התלמיד.";
        }
        break;
      }

      case "crm_search_student": {
        const query = intent.entities.student_name || intent.entities.search_query || "";
        if (query) {
          const students = await searchNotionCRM(query);
          if (students.length > 0) {
            context = `נמצאו ${students.length} תלמידים:\n${students
              .map((s) => `- ${s.name} (${s.status})`)
              .join("\n")}`;
          } else {
            context = `לא נמצאו תלמידים שמתאימים ל-"${query}"`;
          }
        }
        break;
      }

      case "transcript_search": {
        const searchQuery = intent.entities.search_query || message;
        console.log(`[transcript_search] Full query: "${searchQuery}"`);
        console.log(`[transcript_search] Entities: ${JSON.stringify(intent.entities)}`);

        const results = await searchTranscripts(supabase, searchQuery, 5);
        console.log(`[transcript_search] Results count: ${results.length}`);

        if (results.length > 0) {
          context = `נמצאו ${results.length} תוצאות רלוונטיות בתמלולים:\n${results
            .slice(0, 3)
            .map((r: any, i: number) => `${i + 1}. ${r.content?.slice(0, 150)}...`)
            .join("\n\n")}`;
          actions.push({
            type: "search_result",
            label: `${results.length} תוצאות`,
            status: "completed",
          });
        } else {
          context = "לא נמצאו תוצאות רלוונטיות בתמלולים.";
        }
        break;
      }

      case "calendar_add_event": {
        const { student_name, date, time, lesson_type } = intent.entities;
        console.log("Calendar add event - entities:", { student_name, date, time, lesson_type });

        // Build list of missing information
        const missing: string[] = [];
        if (!student_name) missing.push("שם התלמיד/ה");
        if (!date && !time) missing.push("תאריך ושעה");
        if (!lesson_type) missing.push("סוג השיעור (ניסיון / פרטי 1:1 / קבוצה)");

        // If we're missing information, ask for it
        if (missing.length > 0) {
          const lessonTypeHebrew = lesson_type === "trial" ? "ניסיון" :
            lesson_type === "one_on_one" ? "פרטי" :
            lesson_type === "group" ? "קבוצתי" : null;

          let contextParts = [`המורה רוצה לקבוע שיעור`];
          if (student_name) contextParts.push(`עם ${student_name}`);
          if (lessonTypeHebrew) contextParts.push(`(${lessonTypeHebrew})`);
          if (date) contextParts.push(`בתאריך ${date}`);
          if (time) contextParts.push(`בשעה ${time}`);

          context = `${contextParts.join(" ")}.\n\nחסר: ${missing.join(", ")}.\n\nשאל בצורה טבעית וידידותית על הפרטים החסרים. אם חסר סוג שיעור, שאל: "איזה סוג שיעור? ניסיון, פרטי, או קבוצתי?"`;
          actions.push({
            type: "calendar_add",
            label: "קביעת שיעור",
            status: "pending",
          });
        } else {
          // We have all the information - create the event
          const parsed = parseHebrewDateTime(date, time);
          console.log("Parsed date/time:", parsed);

          if (parsed) {
            // Determine calendar and title based on lesson type
            const lessonTypeHebrew = lesson_type === "trial" ? "ניסיון" :
              lesson_type === "one_on_one" ? "פרטי" : "קבוצתי";
            const title = `שיעור ${lessonTypeHebrew} - ${student_name}`;

            const result = await createCalendarEvent(
              title,
              parsed.startTime,
              parsed.endTime,
              `שיעור ${lessonTypeHebrew} עם ${student_name}`,
              lesson_type // Pass lesson type to select correct calendar
            );
            console.log("Calendar event result:", result);

            if (result.success) {
              const eventDate = new Date(parsed.startTime);
              const formattedDate = eventDate.toLocaleDateString("he-IL", {
                weekday: "long",
                day: "numeric",
                month: "long",
              });
              const formattedTime = eventDate.toLocaleTimeString("he-IL", {
                hour: "2-digit",
                minute: "2-digit",
              });
              context = `✅ פעולה הושלמה בהצלחה! שיעור ${lessonTypeHebrew} עם ${student_name} נקבע ליום ${formattedDate} בשעה ${formattedTime} והאירוע נוסף ליומן "${result.calendarName}". אשר את ההצלחה למשתמש.`;
              actions.push({
                type: "calendar_add",
                label: `שיעור ${lessonTypeHebrew} עם ${student_name}`,
                status: "completed",
              });
            } else {
              context = `לא הצלחתי להוסיף את השיעור ליומן: ${result.error}`;
              actions.push({
                type: "calendar_add",
                label: "קביעת שיעור",
                status: "failed",
              });
            }
          } else {
            context = `לא הצלחתי לפענח את התאריך/שעה. בקש מהמורה תאריך ושעה מדויקים יותר.`;
            actions.push({
              type: "calendar_add",
              label: "קביעת שיעור",
              status: "pending",
            });
          }
        }
        break;
      }

      case "calendar_view": {
        const events = await getCalendarEvents(7);
        if (events.length > 0) {
          const eventsList = events.map((e: any) => {
            const start = new Date(e.start);
            const formattedDate = start.toLocaleDateString("he-IL", {
              weekday: "short",
              day: "numeric",
              month: "short",
            });
            const formattedTime = start.toLocaleTimeString("he-IL", {
              hour: "2-digit",
              minute: "2-digit",
            });
            return `- ${formattedDate} ${formattedTime}: ${e.title}`;
          }).join("\n");
          context = `השיעורים הקרובים בשבוע הבא:\n${eventsList}`;
        } else {
          context = "אין שיעורים מתוכננים לשבוע הקרוב.";
        }
        break;
      }

      case "lesson_plan": {
        const studentName = intent.entities.student_name;
        if (studentName) {
          // Search for student's past lessons
          const results = await searchTranscripts(supabase, studentName, 3);
          if (results.length > 0) {
            context = `נמצאו ${results.length} שיעורים קודמים של ${studentName}. השתמש בהם לתכנון.`;
          } else {
            context = `לא נמצאו שיעורים קודמים של ${studentName}.`;
          }
        } else {
          context = "המשתמש רוצה לתכנן שיעור. שאל עבור איזה תלמיד.";
        }
        break;
      }

      case "web_search": {
        const query = intent.entities.search_query || message;
        const webResult = await searchWeb(query);
        if (webResult) {
          context = webResult;
          actions.push({
            type: "search_result",
            label: "חיפוש אינטרנט",
            status: "completed",
          });
        } else {
          context = "לא הצלחתי לחפש באינטרנט. אנסה לענות על בסיס הידע שלי.";
        }
        break;
      }

      default:
        context = "שאלה כללית או בקשה לא מזוהה.";
    }

    // Handle streaming response
    if (stream) {
      try {
        // Send actions/intent as initial metadata
        const metadata = JSON.stringify({
          intent: intent.intent,
          actions: actions.length > 0 ? actions : undefined,
        });

        const streamResponse = await generateStreamingResponse(
          message,
          intent,
          context,
          conversationHistory,
          customSystemPrompt
        );

        // Create a new stream that prepends metadata
        const encoder = new TextEncoder();
        const metadataStream = new ReadableStream({
          start(controller) {
            // Send metadata first
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ metadata: JSON.parse(metadata) })}\n\n`));
            controller.close();
          }
        });

        // Combine metadata stream with response stream
        const combinedStream = new ReadableStream({
          async start(controller) {
            // First, send metadata
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ metadata: JSON.parse(metadata) })}\n\n`));

            // Then pipe the Gemini stream
            const reader = streamResponse.getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                controller.enqueue(value);
              }
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          }
        });

        return new Response(combinedStream, {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        });
      } catch (error) {
        console.error("Streaming error:", error);
        // Fall back to non-streaming on error
      }
    }

    // Generate non-streaming response
    const response = await generateResponse(
      message,
      intent,
      context,
      conversationHistory,
      customSystemPrompt
    );

    return new Response(
      JSON.stringify({
        response,
        intent: intent.intent,
        actions: actions.length > 0 ? actions : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Teacher chat error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
