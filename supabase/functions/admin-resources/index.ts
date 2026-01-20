import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

interface ResourceUsage {
  supabase: {
    plan: string;
    trialEndsAt: string | null;
    database: {
      sizeUsed: number;
      sizeLimit: number;
      percentUsed: number;
    };
    storage: {
      sizeUsed: number;
      sizeLimit: number;
      percentUsed: number;
    };
    edgeFunctions: {
      invocations: number;
      limit: number;
      percentUsed: number;
    };
    auth: {
      monthlyActiveUsers: number;
      limit: number;
      percentUsed: number;
    };
    tableSizes?: {
      table_name: string;
      total_size: string;
      total_bytes: number;
    }[];
  };
  gemini: {
    plan: string;
    monthlyBudget: number;
    estimatedUsed: number;
    percentUsed: number;
    requestsToday: number;
  };
  vercel: {
    plan: string;
    bandwidth: {
      used: number;
      limit: number;
      percentUsed: number;
    };
    builds: {
      used: number;
      limit: number;
    };
  };
  openai: {
    monthlyBudget: number;
    estimatedUsed: number;
    percentUsed: number;
  };
}

// Get Supabase project stats
async function getSupabaseStats(supabase: any): Promise<ResourceUsage["supabase"]> {
  // Get database size
  const { data: dbSize } = await supabase.rpc("get_database_size").single();

  // Get storage size
  const { data: storageData } = await supabase
    .from("storage.objects")
    .select("metadata")
    .limit(1000);

  let storageSizeBytes = 0;
  if (storageData) {
    storageSizeBytes = storageData.reduce((acc: number, obj: any) => {
      return acc + (obj.metadata?.size || 0);
    }, 0);
  }

  // Get monthly active users count (approximate)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { count: mauCount } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .gte("updated_at", thirtyDaysAgo.toISOString());

  // Get edge function invocations (from our tracking if available)
  const { count: edgeFnCount } = await supabase
    .from("analytics_events")
    .select("*", { count: "exact", head: true })
    .eq("event_type", "edge_function_call")
    .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

  // Get table sizes breakdown
  const { data: tableSizes } = await supabase.rpc("get_table_sizes");

  // Free tier limits
  const FREE_TIER = {
    database: 500 * 1024 * 1024, // 500 MB
    storage: 1024 * 1024 * 1024, // 1 GB
    edgeFunctions: 500000, // 500K invocations
    mau: 50000, // 50K MAU
  };

  const dbSizeBytes = dbSize?.size_bytes || 0;

  return {
    plan: "Free Trial",
    trialEndsAt: null, // Would need Management API
    database: {
      sizeUsed: dbSizeBytes,
      sizeLimit: FREE_TIER.database,
      percentUsed: Math.round((dbSizeBytes / FREE_TIER.database) * 100),
    },
    storage: {
      sizeUsed: storageSizeBytes,
      sizeLimit: FREE_TIER.storage,
      percentUsed: Math.round((storageSizeBytes / FREE_TIER.storage) * 100),
    },
    edgeFunctions: {
      invocations: edgeFnCount || 0,
      limit: FREE_TIER.edgeFunctions,
      percentUsed: Math.round(((edgeFnCount || 0) / FREE_TIER.edgeFunctions) * 100),
    },
    auth: {
      monthlyActiveUsers: mauCount || 0,
      limit: FREE_TIER.mau,
      percentUsed: Math.round(((mauCount || 0) / FREE_TIER.mau) * 100),
    },
    tableSizes: tableSizes || [],
  };
}

// Estimate Gemini usage
async function getGeminiStats(supabase: any): Promise<ResourceUsage["gemini"]> {
  // Count chat messages this month to estimate usage
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  // Count teacher chat requests (rough estimate)
  const { count: chatCount } = await supabase
    .from("analytics_events")
    .select("*", { count: "exact", head: true })
    .eq("event_type", "chat_message")
    .gte("created_at", startOfMonth.toISOString());

  // Estimate: ~1000 tokens per request, Gemini 2.5 Pro costs ~$0.00125 per 1K tokens
  const estimatedTokens = (chatCount || 0) * 1000;
  const estimatedCost = (estimatedTokens / 1000) * 0.00125;
  const monthlyBudget = 20; // 20 ILS ≈ $5.5

  return {
    plan: "Pay as you go",
    monthlyBudget: monthlyBudget,
    estimatedUsed: estimatedCost,
    percentUsed: Math.round((estimatedCost / (monthlyBudget / 3.6)) * 100), // Convert ILS to USD
    requestsToday: chatCount || 0,
  };
}

// Vercel stats (limited without API)
function getVercelStats(): ResourceUsage["vercel"] {
  // Hobby plan limits
  return {
    plan: "Hobby (Free)",
    bandwidth: {
      used: 0, // Can't get via API
      limit: 100 * 1024 * 1024 * 1024, // 100 GB
      percentUsed: 0,
    },
    builds: {
      used: 0,
      limit: 6000, // per month
    },
  };
}

// OpenAI stats (for embeddings)
async function getOpenAIStats(supabase: any): Promise<ResourceUsage["openai"]> {
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  // Count embedding generations
  const { count: embeddingCount } = await supabase
    .from("transcript_chunks")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startOfMonth.toISOString());

  // text-embedding-3-small: $0.00002 per 1K tokens, ~500 tokens per chunk
  const estimatedCost = ((embeddingCount || 0) * 500 / 1000) * 0.00002;
  const monthlyBudget = 5; // $5

  return {
    monthlyBudget: monthlyBudget,
    estimatedUsed: estimatedCost,
    percentUsed: Math.round((estimatedCost / monthlyBudget) * 100),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Gather all stats in parallel
    const [supabaseStats, geminiStats, openaiStats] = await Promise.all([
      getSupabaseStats(supabase),
      getGeminiStats(supabase),
      getOpenAIStats(supabase),
    ]);

    const vercelStats = getVercelStats();

    const usage: ResourceUsage = {
      supabase: supabaseStats,
      gemini: geminiStats,
      vercel: vercelStats,
      openai: openaiStats,
    };

    return new Response(JSON.stringify(usage), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching resources:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
