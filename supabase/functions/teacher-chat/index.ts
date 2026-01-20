import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
  "intent": "crm_add_student" | "crm_update_student" | "crm_search_student" | "calendar_add_event" | "calendar_view" | "transcript_search" | "lesson_plan" | "general_question" | "unknown",
  "entities": {
    "student_name": "name of the student mentioned (e.g., Dana, Sarah Cohen)",
    "date": "date mentioned (e.g., tomorrow, מחר, 21/1, יום שני)",
    "time": "time mentioned (e.g., 15:00, 3pm, בשעה 10)",
    "phone": "phone number if mentioned",
    "search_query": "search terms if relevant"
  },
  "confidence": 0.0-1.0
}

Important: Extract student_name from phrases like "lesson with Dana", "שיעור עם דנה", "for student X".
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

// Google Calendar: Create event
async function createCalendarEvent(
  title: string,
  startTime: string,
  endTime: string,
  description?: string
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  const accessToken = await getGoogleAccessToken();
  const calendarId = Deno.env.get("GOOGLE_CALENDAR_ID") || "primary";

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
      return { success: true, eventId: data.id };
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

// Search transcripts using vector similarity
async function searchTranscripts(
  supabase: any,
  query: string,
  limit = 5
): Promise<any[]> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  if (!openaiKey) {
    console.error("Missing OpenAI key");
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
      return [];
    }

    // Search using RPC
    const { data: results, error } = await supabase.rpc("search_transcripts", {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: limit,
      filter_student_id: null,
    });

    if (error) {
      console.error("Search RPC error:", error);
      return [];
    }

    return results || [];
  } catch (error) {
    console.error("Transcript search error:", error);
    return [];
  }
}

// Generate response using Gemini
async function generateResponse(
  message: string,
  intent: ClassifiedIntent,
  context: string,
  history: ConversationMessage[]
): Promise<string> {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");

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

  try {
    console.log("Generating response with context:", context);
    console.log("Gemini key for response exists:", !!geminiKey);

    // Add system prompt as first message
    const allContents = [
      { role: "user", parts: [{ text: SYSTEM_PROMPT + "\n\nענה בעברית." }] },
      { role: "model", parts: [{ text: "הבנתי, אני מוכן לעזור." }] },
      ...conversationParts,
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent?key=${geminiKey}`,
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
    const { message, teacherId, conversationHistory = [] } = await req.json();

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
        const query = intent.entities.search_query || message;
        const results = await searchTranscripts(supabase, query, 5);
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
        const { student_name, date, time } = intent.entities;
        console.log("Calendar add event - entities:", { student_name, date, time });

        // Check if we have enough info to create the event
        if (student_name && (date || time)) {
          const parsed = parseHebrewDateTime(date, time);
          console.log("Parsed date/time:", parsed);
          if (parsed) {
            const title = `שיעור - ${student_name}`;
            const result = await createCalendarEvent(
              title,
              parsed.startTime,
              parsed.endTime,
              `שיעור קול עם ${student_name}`
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
              context = `✅ פעולה הושלמה בהצלחה! השיעור עם ${student_name} נקבע ליום ${formattedDate} בשעה ${formattedTime} והאירוע נוסף ליומן Google. אשר את ההצלחה למשתמש.`;
              actions.push({
                type: "calendar_add",
                label: `שיעור עם ${student_name}`,
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
            context = `המשתמש רוצה לקבוע שיעור עם ${student_name}. בקש תאריך ושעה מדויקים.`;
            actions.push({
              type: "calendar_add",
              label: "קביעת שיעור",
              status: "pending",
            });
          }
        } else {
          context = `המשתמש רוצה לקבוע שיעור${student_name ? ` עם ${student_name}` : ""}${date ? ` בתאריך ${date}` : ""}${time ? ` בשעה ${time}` : ""}. בקש את הפרטים החסרים (שם תלמיד, תאריך ושעה).`;
          actions.push({
            type: "calendar_add",
            label: "קביעת שיעור",
            status: "pending",
          });
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

      default:
        context = "שאלה כללית או בקשה לא מזוהה.";
    }

    // Generate response
    const response = await generateResponse(
      message,
      intent,
      context,
      conversationHistory
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
