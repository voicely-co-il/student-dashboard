import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============================================
// Types
// ============================================

interface Memory {
  id?: string;
  memory_type: "fact" | "preference" | "goal" | "challenge" | "achievement";
  content: string;
  confidence: number;
  importance: number;
  source?: string;
  source_id?: string;
}

interface ExtractRequest {
  operation: "extract";
  userId: string;
  sessionId?: string;
  messages: Array<{ role: string; content: string }>;
}

interface RetrieveRequest {
  operation: "retrieve";
  userId: string;
  query: string;
  limit?: number;
}

interface UpdateRequest {
  operation: "update";
  userId: string;
  memories: Memory[];
  existingMemoryIds?: string[];
}

interface SummarizeRequest {
  operation: "summarize";
  userId: string;
  sessionId: string;
  messages: Array<{ role: string; content: string }>;
}

type MemoryRequest = ExtractRequest | RetrieveRequest | UpdateRequest | SummarizeRequest;

// ============================================
// Embedding Generation
// ============================================

async function generateEmbedding(text: string): Promise<number[] | null> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    console.error("Missing OpenAI key");
    return null;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
    });

    const data = await response.json();
    return data.data?.[0]?.embedding || null;
  } catch (error) {
    console.error("Embedding error:", error);
    return null;
  }
}

// ============================================
// Memory Extraction
// ============================================

async function extractMemories(
  messages: Array<{ role: string; content: string }>,
  existingMemories: Memory[] = []
): Promise<Memory[]> {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) {
    console.error("Missing Gemini key");
    return [];
  }

  const conversationText = messages
    .map((m) => `${m.role === "user" ? "תלמיד" : "AI"}: ${m.content}`)
    .join("\n");

  const existingContext = existingMemories.length > 0
    ? `\n\nזיכרונות קיימים על התלמיד:\n${existingMemories.map((m) => `- [${m.memory_type}] ${m.content}`).join("\n")}`
    : "";

  const prompt = `נתח את השיחה הבאה וחלץ מידע חשוב על התלמיד.
${existingContext}

שיחה:
${conversationText}

הנחיות:
1. חלץ רק מידע ספציפי וברור - לא הנחות
2. סוגי זיכרונות:
   - fact: עובדות אובייקטיביות (גיל, סוג קול, ניסיון, שם מורה)
   - preference: העדפות (סגנון מוזיקה, קצב למידה, שירים אהובים)
   - goal: מטרות ושאיפות (למה לומד, יעדים ספציפיים)
   - challenge: קשיים ואתגרים (בעיות טכניות, חסמים)
   - achievement: הישגים והתקדמות (שיפורים, הצלחות)
3. אל תחזור על מידע שכבר קיים בזיכרונות
4. confidence: 0.5-1.0 (כמה בטוח שזה נכון)
5. importance: 0.3-1.0 (כמה חשוב לזכור לטווח ארוך)

החזר JSON בפורמט:
{
  "memories": [
    {
      "memory_type": "fact|preference|goal|challenge|achievement",
      "content": "תוכן הזיכרון בעברית",
      "confidence": 0.9,
      "importance": 0.7
    }
  ],
  "reasoning": "הסבר קצר מה חילצת ולמה"
}

אם אין מידע חדש לחלץ, החזר: { "memories": [], "reasoning": "אין מידע חדש" }`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 1000,
            temperature: 0.3,
          },
        }),
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log("No JSON in extraction response:", text);
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log("Extraction reasoning:", parsed.reasoning);

    return parsed.memories || [];
  } catch (error) {
    console.error("Memory extraction error:", error);
    return [];
  }
}

// ============================================
// Memory Retrieval
// ============================================

async function retrieveMemories(
  supabase: any,
  userId: string,
  query: string,
  limit: number = 10
): Promise<Memory[]> {
  const embedding = await generateEmbedding(query);
  if (!embedding) {
    // Fallback to recent memories without vector search
    const { data, error } = await supabase
      .from("user_memories")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("importance", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Fallback retrieval error:", error);
      return [];
    }
    return data || [];
  }

  // Vector similarity search
  const { data, error } = await supabase.rpc("match_user_memories", {
    query_embedding: embedding,
    p_user_id: userId,
    match_threshold: 0.6,
    match_count: limit,
  });

  if (error) {
    console.error("Vector search error:", error);
    return [];
  }

  return data || [];
}

// ============================================
// Memory Update/Merge
// ============================================

async function updateMemories(
  supabase: any,
  userId: string,
  newMemories: Memory[],
  existingMemoryIds: string[] = [],
  sessionId?: string
): Promise<{ added: number; updated: number; skipped: number }> {
  const result = { added: 0, updated: 0, skipped: 0 };

  for (const memory of newMemories) {
    // Generate embedding for new memory
    const embedding = await generateEmbedding(memory.content);

    // Check for similar existing memories
    let existingMatch = null;
    if (embedding) {
      const { data: similar } = await supabase.rpc("match_user_memories", {
        query_embedding: embedding,
        p_user_id: userId,
        match_threshold: 0.85, // High threshold for duplicates
        match_count: 1,
      });

      if (similar && similar.length > 0) {
        existingMatch = similar[0];
      }
    }

    if (existingMatch && existingMatch.similarity > 0.9) {
      // Very similar - skip or update confidence
      if (memory.confidence > existingMatch.confidence) {
        // Update existing memory
        await supabase
          .from("user_memories")
          .update({
            confidence: Math.min(1.0, (existingMatch.confidence + memory.confidence) / 2 + 0.1),
            last_accessed_at: new Date().toISOString(),
          })
          .eq("id", existingMatch.id);
        result.updated++;
      } else {
        result.skipped++;
      }
    } else {
      // New memory - insert
      const { error } = await supabase.from("user_memories").insert({
        user_id: userId,
        memory_type: memory.memory_type,
        content: memory.content,
        confidence: memory.confidence,
        importance: memory.importance,
        source: sessionId ? "chat" : "manual",
        source_id: sessionId,
        embedding: embedding,
      });

      if (error) {
        console.error("Memory insert error:", error);
      } else {
        result.added++;
      }
    }
  }

  return result;
}

// ============================================
// Session Summarization
// ============================================

async function summarizeSession(
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) return "";

  const conversationText = messages
    .map((m) => `${m.role === "user" ? "תלמיד" : "AI"}: ${m.content}`)
    .join("\n");

  const prompt = `סכם את השיחה הבאה ב-2-3 משפטים. התמקד בנושאים העיקריים שנדונו ובכל מידע חשוב.

שיחה:
${conversationText}

סיכום:`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 200, temperature: 0.3 },
        }),
      }
    );

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (error) {
    console.error("Summarization error:", error);
    return "";
  }
}

// ============================================
// Main Handler
// ============================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const request: MemoryRequest = await req.json();

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let result: any;

    switch (request.operation) {
      case "extract": {
        const { userId, sessionId, messages } = request;

        // Get existing memories for context
        const existingMemories = await retrieveMemories(supabase, userId, messages.map(m => m.content).join(" "), 20);

        // Extract new memories
        const newMemories = await extractMemories(messages, existingMemories);

        if (newMemories.length > 0) {
          // Save memories
          const updateResult = await updateMemories(supabase, userId, newMemories, [], sessionId);

          // Log operation
          await supabase.from("memory_operations_log").insert({
            user_id: userId,
            session_id: sessionId,
            operation: "extract",
            input_data: { messageCount: messages.length },
            output_data: { memories: newMemories, result: updateResult },
            latency_ms: Date.now() - startTime,
          });

          result = { success: true, ...updateResult, memories: newMemories };
        } else {
          result = { success: true, added: 0, updated: 0, skipped: 0, memories: [] };
        }
        break;
      }

      case "retrieve": {
        const { userId, query, limit = 10 } = request;

        const memories = await retrieveMemories(supabase, userId, query, limit);

        // Touch accessed memories
        if (memories.length > 0) {
          await supabase.rpc("touch_memories", {
            memory_ids: memories.map((m: any) => m.id),
          });
        }

        // Log operation
        await supabase.from("memory_operations_log").insert({
          user_id: userId,
          operation: "retrieve",
          input_data: { query, limit },
          output_data: { count: memories.length },
          memories_affected: memories.map((m: any) => m.id),
          latency_ms: Date.now() - startTime,
        });

        result = { success: true, memories };
        break;
      }

      case "update": {
        const { userId, memories, existingMemoryIds = [] } = request;

        const updateResult = await updateMemories(supabase, userId, memories, existingMemoryIds);

        // Log operation
        await supabase.from("memory_operations_log").insert({
          user_id: userId,
          operation: "update",
          input_data: { memoryCount: memories.length },
          output_data: updateResult,
          latency_ms: Date.now() - startTime,
        });

        result = { success: true, ...updateResult };
        break;
      }

      case "summarize": {
        const { userId, sessionId, messages } = request;

        const summary = await summarizeSession(messages);

        if (summary && sessionId) {
          // Update session with summary
          await supabase
            .from("student_chat_sessions")
            .update({
              summary,
              status: "summarized",
            })
            .eq("id", sessionId);
        }

        // Log operation
        await supabase.from("memory_operations_log").insert({
          user_id: userId,
          session_id: sessionId,
          operation: "summarize",
          input_data: { messageCount: messages.length },
          output_data: { summaryLength: summary.length },
          latency_ms: Date.now() - startTime,
        });

        result = { success: true, summary };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unknown operation" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Memory manager error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
