// Transcript search operations
import { createClient } from "jsr:@supabase/supabase-js@2";
import type { TranscriptResult } from "./types.ts";

// Hebrew stop words for query processing
const STOP_WORDS = [
  "חפש", "בתמלולים", "תמלולים", "התמלולים", "את", "של", "על", "עם",
  "מה", "איך", "למה", "מי", "מתי", "איפה", "בדוק", "הראה", "תראה",
  "כל", "הכל", "לי", "לנו", "אותם", "אותן"
];

export async function searchTranscripts(
  query: string,
  limit = 5
): Promise<TranscriptResult[]> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[searchTranscripts] Missing Supabase credentials!");
    return [];
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Extract keywords from query
  const keywords = query
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.includes(w))
    .map((w) => w.trim())
    .filter((w) => w.length > 0);

  // If no meaningful keywords, return recent transcripts
  if (keywords.length === 0) {
    console.log(`[searchTranscripts] No keywords found, returning recent transcripts`);
    try {
      const { data: recentResults, error: recentError } = await supabase
        .from("transcript_chunks")
        .select("id, transcript_id, student_name, content, lesson_date")
        .order("lesson_date", { ascending: false, nullsFirst: false })
        .limit(limit);

      if (recentError) {
        console.error(`[searchTranscripts] Recent transcripts error:`, JSON.stringify(recentError));
        return [];
      }

      return (recentResults || []).map((r: any) => ({
        chunk_id: r.id,
        transcript_id: r.transcript_id,
        student_name: r.student_name,
        content: r.content,
        lesson_date: r.lesson_date,
        similarity: 1.0,
      }));
    } catch (e) {
      console.error(`[searchTranscripts] Recent transcripts exception:`, e);
      return [];
    }
  }

  // Try text search for exact matches
  for (const keyword of keywords) {
    try {
      const { data: textResults, error: textError } = await supabase
        .from("transcript_chunks")
        .select("id, transcript_id, student_name, content, lesson_date")
        .ilike("content", `%${keyword}%`)
        .order("lesson_date", { ascending: false, nullsFirst: false })
        .limit(limit);

      if (textError) {
        console.error(`[searchTranscripts] Text search error:`, JSON.stringify(textError));
        continue;
      }

      if (textResults && textResults.length > 0) {
        return textResults.map((r: any) => ({
          chunk_id: r.id,
          transcript_id: r.transcript_id,
          student_name: r.student_name,
          content: r.content,
          lesson_date: r.lesson_date,
          similarity: 1.0,
        }));
      }
    } catch (e) {
      console.error(`[searchTranscripts] Text search exception:`, e);
    }
  }

  // Fall back to semantic search
  if (!openaiKey) {
    console.error("Missing OpenAI key for semantic search");
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
      console.error("Failed to generate embedding");
      return [];
    }

    const { data: results, error } = await supabase.rpc("search_transcripts", {
      query_embedding: queryEmbedding,
      match_threshold: 0.4,
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
