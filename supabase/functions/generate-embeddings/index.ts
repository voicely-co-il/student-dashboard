import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Configuration
const CONFIG = {
  CHUNK_SIZE: 1000,
  CHUNK_OVERLAP: 200,
  MIN_CHUNK_SIZE: 50,
  MAX_CHUNKS_PER_TRANSCRIPT: 500,
  EMBEDDING_MODEL: "text-embedding-3-small",
  BATCH_SIZE: 5, // Chunks per OpenAI call
  RATE_LIMIT_DELAY_MS: 200,
};

interface EmbeddingJob {
  job_id: string;
  transcript_id: string;
  full_text: string;
  student_name: string | null;
  lesson_date: string | null;
}

/**
 * Split text into overlapping chunks for embedding
 */
function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length && chunks.length < CONFIG.MAX_CHUNKS_PER_TRANSCRIPT) {
    const end = Math.min(start + CONFIG.CHUNK_SIZE, text.length);

    // Try to break at sentence/paragraph boundary
    let breakPoint = end;
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf(".", end);
      const lastNewline = text.lastIndexOf("\n", end);
      const bestBreak = Math.max(lastPeriod, lastNewline);

      // Only use break point if it's within reasonable range
      if (bestBreak > start + CONFIG.CHUNK_SIZE - CONFIG.CHUNK_OVERLAP) {
        breakPoint = bestBreak;
      }
    }

    const chunk = text.slice(start, breakPoint + 1).trim();
    if (chunk.length >= CONFIG.MIN_CHUNK_SIZE) {
      chunks.push(chunk);
    }

    // Move forward with overlap
    const nextStart = breakPoint + 1 - CONFIG.CHUNK_OVERLAP;
    start = Math.max(nextStart, start + 100); // Always move at least 100 chars
  }

  return chunks;
}

/**
 * Generate embeddings using OpenAI API
 */
async function generateEmbeddings(
  texts: string[],
  apiKey: string
): Promise<number[][]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CONFIG.EMBEDDING_MODEL,
      input: texts,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data.map((item: { embedding: number[] }) => item.embedding);
}

/**
 * Process a single transcript: chunk text and generate embeddings
 */
async function processTranscript(
  supabase: ReturnType<typeof createClient>,
  job: EmbeddingJob,
  openaiKey: string
): Promise<number> {
  console.log(`Processing transcript ${job.transcript_id}`);

  // Update transcript status to processing
  await supabase
    .from("transcripts")
    .update({
      embedding_status: "processing",
      embedding_started_at: new Date().toISOString(),
    })
    .eq("id", job.transcript_id);

  // Generate chunks
  const chunks = chunkText(job.full_text);
  console.log(`  Generated ${chunks.length} chunks`);

  if (chunks.length === 0) {
    throw new Error("No valid chunks generated from transcript");
  }

  // Delete existing chunks for this transcript
  await supabase
    .from("transcript_chunks")
    .delete()
    .eq("transcript_id", job.transcript_id);

  // Process chunks in batches
  for (let i = 0; i < chunks.length; i += CONFIG.BATCH_SIZE) {
    const batch = chunks.slice(i, i + CONFIG.BATCH_SIZE);

    // Generate embeddings for batch
    const embeddings = await generateEmbeddings(batch, openaiKey);

    // Insert chunks with embeddings
    const rows = batch.map((content, idx) => ({
      transcript_id: job.transcript_id,
      chunk_index: i + idx,
      content,
      embedding: JSON.stringify(embeddings[idx]),
      student_name: job.student_name,
      lesson_date: job.lesson_date,
    }));

    const { error: insertError } = await supabase
      .from("transcript_chunks")
      .insert(rows);

    if (insertError) {
      throw new Error(`Failed to insert chunks: ${insertError.message}`);
    }

    // Rate limiting
    if (i + CONFIG.BATCH_SIZE < chunks.length) {
      await new Promise((r) => setTimeout(r, CONFIG.RATE_LIMIT_DELAY_MS));
    }
  }

  return chunks.length;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { batch_size = 3 } = await req.json().catch(() => ({}));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

    if (!openaiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get next batch of jobs from queue
    const { data: jobs, error: jobsError } = await supabase.rpc(
      "get_embedding_jobs",
      { p_batch_size: batch_size }
    );

    if (jobsError) {
      throw new Error(`Failed to get jobs: ${jobsError.message}`);
    }

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No jobs in queue",
          processed: 0,
          duration_ms: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${jobs.length} jobs`);

    let processed = 0;
    let failed = 0;
    const results: { transcript_id: string; chunks: number; error?: string }[] = [];

    for (const job of jobs as EmbeddingJob[]) {
      try {
        const chunksCount = await processTranscript(supabase, job, openaiKey);

        // Mark job as completed
        await supabase.rpc("complete_embedding_job", {
          p_job_id: job.job_id,
          p_chunks_count: chunksCount,
        });

        processed++;
        results.push({ transcript_id: job.transcript_id, chunks: chunksCount });
        console.log(`  ✓ Completed: ${job.transcript_id} (${chunksCount} chunks)`);
      } catch (error) {
        console.error(`  ✗ Failed: ${job.transcript_id}`, error);

        // Mark job as failed
        await supabase.rpc("fail_embedding_job", {
          p_job_id: job.job_id,
          p_error_message: error.message,
        });

        failed++;
        results.push({
          transcript_id: job.transcript_id,
          chunks: 0,
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        failed,
        results,
        duration_ms: Date.now() - startTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generate embeddings error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        duration_ms: Date.now() - startTime,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
