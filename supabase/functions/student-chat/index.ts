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

interface Memory {
  id: string;
  memory_type: string;
  content: string;
  confidence: number;
  importance: number;
  similarity?: number;
}

interface StudentChatRequest {
  message: string;
  studentId: string;
  studentName: string;
  sessionId?: string;
  conversationHistory?: ConversationMessage[];
}

// Build system prompt with memory context
function buildSystemPrompt(studentName: string, memories: Memory[]): string {
  let memoryContext = "";

  if (memories.length > 0) {
    const facts = memories.filter((m) => m.memory_type === "fact");
    const preferences = memories.filter((m) => m.memory_type === "preference");
    const goals = memories.filter((m) => m.memory_type === "goal");
    const challenges = memories.filter((m) => m.memory_type === "challenge");
    const achievements = memories.filter((m) => m.memory_type === "achievement");

    const sections: string[] = [];

    if (facts.length > 0) {
      sections.push(`עובדות: ${facts.map((m) => m.content).join("; ")}`);
    }
    if (preferences.length > 0) {
      sections.push(`העדפות: ${preferences.map((m) => m.content).join("; ")}`);
    }
    if (goals.length > 0) {
      sections.push(`מטרות: ${goals.map((m) => m.content).join("; ")}`);
    }
    if (challenges.length > 0) {
      sections.push(`אתגרים: ${challenges.map((m) => m.content).join("; ")}`);
    }
    if (achievements.length > 0) {
      sections.push(`הישגים: ${achievements.map((m) => m.content).join("; ")}`);
    }

    memoryContext = `

## מה אתה יודע על ${studentName}:
${sections.join("\n")}

השתמש במידע הזה כדי להתאים את התשובות שלך. התייחס למה שאתה יודע על התלמיד כשזה רלוונטי.`;
  }

  return `אתה עוזר AI של Voicely, מערכת ללמידת קול ושירה.
אתה מדבר עברית ועוזר לתלמידים לשפר את הטכניקה הקולית שלהם.

שם התלמיד: ${studentName}
${memoryContext}

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
- אם יש לך מידע קודם על התלמיד - השתמש בו בתשובות

אתה לא יכול:
- לגשת לנתונים של תלמידים אחרים
- לקבוע שיעורים (הפנה למורה)
- לתת אבחנות רפואיות`;
}

// Retrieve memories from database
async function retrieveMemories(
  supabase: any,
  userId: string,
  query: string,
  limit: number = 8
): Promise<Memory[]> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  if (!openaiKey) {
    console.log("No OpenAI key - skipping memory retrieval");
    return [];
  }

  try {
    // Generate embedding for query
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
      console.log("Failed to generate embedding for memory search");
      return [];
    }

    // Search memories
    const { data: memories, error } = await supabase.rpc("match_user_memories", {
      query_embedding: queryEmbedding,
      p_user_id: userId,
      match_threshold: 0.5,
      match_count: limit,
    });

    if (error) {
      console.error("Memory search error:", error);
      return [];
    }

    // Update last_accessed for used memories
    if (memories && memories.length > 0) {
      await supabase.rpc("touch_memories", {
        memory_ids: memories.map((m: Memory) => m.id),
      });
    }

    return memories || [];
  } catch (error) {
    console.error("Memory retrieval error:", error);
    return [];
  }
}

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
  systemPrompt: string,
  message: string,
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
    ? `\n\n[מידע רלוונטי]\n${context}`
    : "";

  conversationParts.push({
    role: "user",
    parts: [{ text: `${message}${contextText}` }],
  });

  try {
    const allContents = [
      {
        role: "user",
        parts: [{ text: systemPrompt }]
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
      sessionId,
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

    // 1. Retrieve relevant memories
    const memories = await retrieveMemories(supabase, studentId, message);
    console.log(`Retrieved ${memories.length} memories for context`);

    // 2. Build system prompt with memories
    const systemPrompt = buildSystemPrompt(studentName || "תלמיד/ה", memories);

    // 3. Classify the question
    const questionType = classifyQuestion(message);
    console.log(`Question type: ${questionType}, Message: ${message}`);

    // 4. Build context from transcripts/website
    let context = "";

    // Search based on question type
    if (questionType === "personal" || questionType === "general") {
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
      const websiteResults = await searchWebsiteContent(supabase, message, 3);

      if (websiteResults.length > 0) {
        context += "\n\nמידע מקצועי:\n";
        context += websiteResults
          .map((r: any, i: number) => `${i + 1}. ${r.content?.slice(0, 200)}...`)
          .join("\n\n");
      }
    }

    // 5. Generate response
    const response = await generateResponse(
      systemPrompt,
      message,
      context,
      conversationHistory
    );

    // 6. Update session with context used (if sessionId provided)
    if (sessionId && memories.length > 0) {
      try {
        await supabase
          .from("student_chat_sessions")
          .update({
            context_used: memories.map((m) => m.id),
          })
          .eq("id", sessionId);
      } catch (error) {
        console.log("Failed to update session context:", error);
      }
    }

    return new Response(
      JSON.stringify({
        response,
        questionType,
        hasContext: context.length > 0,
        memoriesUsed: memories.length,
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
