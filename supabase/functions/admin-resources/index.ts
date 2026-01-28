import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// Supabase Management API base URL
const MANAGEMENT_API_URL = "https://api.supabase.com/v1";
const PROJECT_REF = "jldfxkbczzxawdqsznze";

// Plan limits configuration
const PLAN_LIMITS = {
  free: {
    database: 500 * 1024 * 1024, // 500 MB
    storage: 1 * 1024 * 1024 * 1024, // 1 GB
    edgeFunctions: 500_000, // 500K invocations
    mau: 50_000, // 50K MAU
    egress: 5 * 1024 * 1024 * 1024, // 5 GB
  },
  pro: {
    database: 8 * 1024 * 1024 * 1024, // 8 GB
    storage: 100 * 1024 * 1024 * 1024, // 100 GB
    edgeFunctions: 2_000_000, // 2M invocations
    mau: 100_000, // 100K MAU
    egress: 250 * 1024 * 1024 * 1024, // 250 GB
  },
  team: {
    database: 8 * 1024 * 1024 * 1024, // 8 GB base
    storage: 100 * 1024 * 1024 * 1024, // 100 GB
    edgeFunctions: 2_000_000, // 2M invocations
    mau: 100_000, // 100K MAU
    egress: 250 * 1024 * 1024 * 1024, // 250 GB
  },
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

// Fetch project info from Supabase Management API
async function fetchProjectInfo(accessToken: string): Promise<{
  plan: string;
  status: string;
  region: string;
  organizationId: string;
}> {
  const response = await fetch(`${MANAGEMENT_API_URL}/projects/${PROJECT_REF}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    console.error("Failed to fetch project info:", response.status, await response.text());
    return { plan: "Unknown", status: "Unknown", region: "Unknown", organizationId: "" };
  }

  const data = await response.json();
  return {
    plan: data.subscription_id || "Unknown",
    status: data.status || "ACTIVE",
    region: data.region || "Unknown",
    organizationId: data.organization_id || "",
  };
}

// Fetch organization subscription details
async function fetchOrganizationSubscription(accessToken: string, orgId: string): Promise<{
  plan: string;
  billingEmail: string | null;
}> {
  if (!orgId) return { plan: "Unknown", billingEmail: null };

  const response = await fetch(`${MANAGEMENT_API_URL}/organizations/${orgId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    console.error("Failed to fetch org info:", response.status);
    return { plan: "Unknown", billingEmail: null };
  }

  const data = await response.json();
  // The plan is directly in data.plan for organizations
  console.log("Organization data:", JSON.stringify(data));
  return {
    plan: data.plan || data.billing?.plan || data.subscription_tier || "Unknown",
    billingEmail: data.billing?.email || null,
  };
}

// Fetch billing addons (compute size, etc.)
async function fetchBillingAddons(accessToken: string): Promise<{
  computeSize: string;
  diskSize: number;
}> {
  const response = await fetch(`${MANAGEMENT_API_URL}/projects/${PROJECT_REF}/billing/addons`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    console.error("Failed to fetch billing addons:", response.status);
    return { computeSize: "micro", diskSize: 8 * 1024 * 1024 * 1024 };
  }

  const data = await response.json();
  // Parse addons to find compute and disk info
  const computeAddon = data.selected_addons?.find((a: any) => a.type === "compute_instance");
  const diskAddon = data.selected_addons?.find((a: any) => a.type === "disk_size");

  return {
    computeSize: computeAddon?.variant || "micro",
    diskSize: diskAddon?.meta?.disk_size_gb
      ? diskAddon.meta.disk_size_gb * 1024 * 1024 * 1024
      : 8 * 1024 * 1024 * 1024, // Default 8GB
  };
}

// Get Supabase project stats
async function getSupabaseStats(supabase: any): Promise<ResourceUsage["supabase"]> {
  const accessToken = Deno.env.get("SB_MANAGEMENT_TOKEN");

  // Fetch real plan info from Management API if token is available
  let planName = "Free";
  let limits = PLAN_LIMITS.free;
  let diskSizeLimit = PLAN_LIMITS.free.database;

  if (accessToken) {
    try {
      const [projectInfo, billingAddons] = await Promise.all([
        fetchProjectInfo(accessToken),
        fetchBillingAddons(accessToken),
      ]);

      // Fetch org details if we have org ID
      let orgPlan = "Unknown";
      if (projectInfo.organizationId) {
        const orgInfo = await fetchOrganizationSubscription(accessToken, projectInfo.organizationId);
        orgPlan = orgInfo.plan;
      }

      // Determine plan from various sources
      const detectedPlan = (orgPlan || projectInfo.plan || "").toLowerCase();

      if (detectedPlan.includes("pro")) {
        planName = "Pro";
        limits = PLAN_LIMITS.pro;
      } else if (detectedPlan.includes("team")) {
        planName = "Team";
        limits = PLAN_LIMITS.team;
      } else if (detectedPlan.includes("enterprise")) {
        planName = "Enterprise";
        limits = PLAN_LIMITS.team; // Use team limits as base
      } else if (detectedPlan.includes("free") || detectedPlan === "" || detectedPlan === "unknown") {
        planName = "Free";
        limits = PLAN_LIMITS.free;
      } else {
        // Assume Pro if we can't determine (paid plans often have custom names)
        planName = orgPlan || projectInfo.plan || "Pro";
        limits = PLAN_LIMITS.pro;
      }

      // Override disk limit if billing addon specifies it
      if (billingAddons.diskSize > 0) {
        diskSizeLimit = billingAddons.diskSize;
      } else {
        diskSizeLimit = limits.database;
      }

      console.log(`Detected plan: ${planName}, org plan: ${orgPlan}, disk limit: ${diskSizeLimit / (1024*1024*1024)}GB`);
    } catch (error) {
      console.error("Error fetching from Management API:", error);
    }
  } else {
    console.warn("SB_MANAGEMENT_TOKEN not set, using default limits");
  }

  // Get database size from actual database
  const { data: dbSize } = await supabase.rpc("get_database_size").single();

  // Get storage size - query storage.objects properly
  let storageSizeBytes = 0;
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (buckets) {
      for (const bucket of buckets) {
        const { data: files } = await supabase.storage.from(bucket.name).list("", { limit: 1000 });
        if (files) {
          for (const file of files) {
            storageSizeBytes += file.metadata?.size || 0;
          }
        }
      }
    }
  } catch (e) {
    console.error("Error getting storage size:", e);
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

  const dbSizeBytes = dbSize?.size_bytes || 0;

  return {
    plan: planName,
    trialEndsAt: null,
    database: {
      sizeUsed: dbSizeBytes,
      sizeLimit: diskSizeLimit,
      percentUsed: Math.round((dbSizeBytes / diskSizeLimit) * 100),
    },
    storage: {
      sizeUsed: storageSizeBytes,
      sizeLimit: limits.storage,
      percentUsed: Math.round((storageSizeBytes / limits.storage) * 100),
    },
    edgeFunctions: {
      invocations: edgeFnCount || 0,
      limit: limits.edgeFunctions,
      percentUsed: Math.round(((edgeFnCount || 0) / limits.edgeFunctions) * 100),
    },
    auth: {
      monthlyActiveUsers: mauCount || 0,
      limit: limits.mau,
      percentUsed: Math.round(((mauCount || 0) / limits.mau) * 100),
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

    // ========== ADMIN AUTHENTICATION CHECK ==========
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const isAdmin = userRole?.role === "admin" ||
      user.email === "inbal@voicely.co.il" ||
      user.email === "info@compumit.com";

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // ========== END ADMIN CHECK ==========

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
