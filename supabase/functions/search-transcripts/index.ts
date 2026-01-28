import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.28.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query, studentId, studentName, limit = 10 } = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiKey });

    // Generate embedding for the search query
    // IMPORTANT: Must use same model as sync-gdrive.ts for consistent results
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Search using the vector similarity function
    // Lower threshold (0.3) to get more results - can filter in app layer
    const { data: results, error } = await supabase.rpc("search_transcripts", {
      query_embedding: queryEmbedding,
      match_threshold: 0.3,
      match_count: limit,
      filter_student_name: studentName || null,
    });

    if (error) {
      throw error;
    }

    // Enrich results with transcript metadata
    const transcriptIds = [...new Set(results.map((r: any) => r.transcript_id))];
    const { data: transcripts } = await supabase
      .from("transcripts")
      .select("id, title, lesson_date, student_id")
      .in("id", transcriptIds);

    const transcriptMap = new Map(transcripts?.map((t) => [t.id, t]) || []);

    const enrichedResults = results.map((r: any) => ({
      ...r,
      transcript: transcriptMap.get(r.transcript_id),
    }));

    return new Response(
      JSON.stringify({
        query,
        results: enrichedResults,
        count: enrichedResults.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Search error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
