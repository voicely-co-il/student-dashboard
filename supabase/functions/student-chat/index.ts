import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

interface StudentChatRequest {
  message: string;
  studentId: string;
  studentName: string;
  conversationHistory?: ConversationMessage[];
}

// System prompt for student AI assistant
const SYSTEM_PROMPT = `אתה עוזר AI של Voicely, מערכת ללמידת קול ושירה.
אתה מדבר עברית ועוזר לתלמידים לשפר את הטכניקה הקולית שלהם.

יכולות שלך:
1. **חיפוש בשיעורים קודמים**: לחפש מידע מהשיעורים של התלמיד
2. **שאלות על טכניקה**: לענות על שאלות על טכניקות קול ושירה
3. **עצות תרגול**: לתת עצות ותרגילים מותאמים אישית

הנחיות:
- דבר בעברית טבעית, חמימה ומעודדת
- התבסס על המידע מהשיעורים הקודמים כשרלוונטי
- תן עצות מעשיות וספציפיות
- עודד את התלמיד להמשיך להתאמן
- אם אין לך מידע - אמור זאת בכנות

אתה לא יכול:
- לגשת לנתונים של תלמידים אחרים
- לקבוע שיעורים (הפנה למורה)
- לתת אבחנות רפואיות`;

// Search transcripts for specific student
async function searchStudentTranscripts(
  supabase: any,
  query: string,
  studentId: string,
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

    // Search transcripts filtered by student
    const { data: results, error } = await supabase.rpc("search_transcripts", {
      query_embedding: queryEmbedding,
      match_threshold: 0.65,
      match_count: limit,
      filter_student_id: studentId,
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

// Search website content for technique info
async function searchWebsiteContent(
  supabase: any,
  query: string,
  limit = 3
): Promise<any[]> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  if (!openaiKey) {
    return [];
  }

  try {
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

    const { data: results, error } = await supabase.rpc("search_website_content", {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: limit,
      filter_source: null,
      filter_content_type: null,
    });

    if (error) {
      console.error("Website search error:", error);
      return [];
    }

    return results || [];
  } catch (error) {
    console.error("Website search error:", error);
    return [];
  }
}

// Detect if question is about technique or personal lessons
function classifyQuestion(message: string): "technique" | "personal" | "general" {
  const techniqueKeywords = [
    "טכניקה", "נשימה", "דיאפרגמה", "תמיכה", "רזוננס", "סגירה", "פתיחה",
    "מעבר", "רג'יסטר", "chest", "head", "mix", "falsetto", "belt",
    "ויברטו", "פאלסט", "מיקום", "רזונאנס", "אימון", "תרגיל",
    "איך לשיר", "איך עושים", "מה זה", "למה", "איך"
  ];

  const personalKeywords = [
    "בשיעור", "אמרת", "למדנו", "עבדנו", "התלמידים", "שלי",
    "פעם שעברה", "בפעם", "שיעור קודם", "זוכר", "דיברנו"
  ];

  const lowerMessage = message.toLowerCase();

  const hasTechnique = techniqueKeywords.some(k => lowerMessage.includes(k));
  const hasPersonal = personalKeywords.some(k => lowerMessage.includes(k));

  if (hasPersonal) return "personal";
  if (hasTechnique) return "technique";
  return "general";
}

// Generate response using Gemini
async function generateResponse(
  message: string,
  studentName: string,
  context: string,
  history: ConversationMessage[]
): Promise<string> {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");

  if (!geminiKey) {
    return "מצטער, יש בעיה טכנית. נסה שוב מאוחר יותר.";
  }

  const conversationParts = history.slice(-6).map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  const contextText = context
    ? `\n\n[מידע רלוונטי מהשיעורים והאתר]\n${context}`
    : "";

  conversationParts.push({
    role: "user",
    parts: [{ text: `${message}${contextText}` }],
  });

  try {
    const allContents = [
      {
        role: "user",
        parts: [{
          text: `${SYSTEM_PROMPT}\n\nשם התלמיד: ${studentName}\nענה בעברית בצורה חמימה ומעודדת.`
        }]
      },
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
          generationConfig: { maxOutputTokens: 1500 },
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error("Gemini API error:", data.error);
      return "מצטער, נתקלתי בבעיה. נסה שוב.";
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "מצטער, לא הצלחתי לעבד את הבקשה.";
  } catch (error) {
    console.error("Response generation error:", error);
    return "מצטער, נתקלתי בבעיה טכנית.";
  }
}

// Main handler
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    const {
      message,
      studentId,
      studentName,
      conversationHistory = []
    }: StudentChatRequest = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!studentId) {
      return new Response(
        JSON.stringify({ error: "Student ID is required" }),
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

    // Classify the question
    const questionType = classifyQuestion(message);
    console.log(`Question type: ${questionType}, Message: ${message}`);

    let context = "";

    // Search based on question type
    if (questionType === "personal" || questionType === "general") {
      // Search student's transcripts
      const transcriptResults = await searchStudentTranscripts(
        supabase,
        message,
        studentId,
        5
      );

      if (transcriptResults.length > 0) {
        context += "מהשיעורים שלך:\n";
        context += transcriptResults
          .map((r: any, i: number) => `${i + 1}. ${r.content?.slice(0, 300)}...`)
          .join("\n\n");
      }
    }

    if (questionType === "technique" || questionType === "general") {
      // Search website for technique info
      const websiteResults = await searchWebsiteContent(supabase, message, 3);

      if (websiteResults.length > 0) {
        context += "\n\nמידע מקצועי:\n";
        context += websiteResults
          .map((r: any, i: number) => `${i + 1}. ${r.content?.slice(0, 200)}...`)
          .join("\n\n");
      }
    }

    // Generate response
    const response = await generateResponse(
      message,
      studentName || "תלמיד/ה",
      context,
      conversationHistory
    );

    return new Response(
      JSON.stringify({
        response,
        questionType,
        hasContext: context.length > 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Student chat error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
