import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.28.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SearchRequest {
  query: string;
  source?: "voicely_main" | "voicely_juniors" | "blog";
  contentType?: string;
  limit?: number;
  includeTranscripts?: boolean;
  studentId?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      query,
      source,
      contentType,
      limit = 10,
      includeTranscripts = false,
      studentId,
    }: SearchRequest = await req.json();

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
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    let results;

    if (includeTranscripts) {
      // Search both website content and transcripts
      const { data, error } = await supabase.rpc("search_all_content", {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: limit,
        include_transcripts: true,
        include_website: true,
        filter_student_id: studentId || null,
      });

      if (error) throw error;
      results = data;
    } else {
      // Search only website content
      const { data, error } = await supabase.rpc("search_website_content", {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: limit,
        filter_source: source || null,
        filter_content_type: contentType || null,
      });

      if (error) throw error;
      results = data;
    }

    return new Response(
      JSON.stringify({
        query,
        results,
        count: results?.length || 0,
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
