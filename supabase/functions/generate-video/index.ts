import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface GenerateVideoRequest {
  prompt: string;
  mode: "text-to-video" | "image-to-video";
  image_url?: string; // Required for image-to-video
  duration?: "5" | "10"; // seconds
  aspect_ratio?: "16:9" | "9:16" | "1:1";
  service?: "kling" | "seedance";
  title?: string;
  tags?: string[];
}

// Kling API endpoint (piapi.ai proxy)
const KLING_API_BASE = "https://api.piapi.ai/api/kling/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user is admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request
    const body: GenerateVideoRequest = await req.json();
    const {
      prompt,
      mode,
      image_url,
      duration = "5",
      aspect_ratio = "16:9",
      service = "kling",
      title,
      tags,
    } = body;

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "image-to-video" && !image_url) {
      return new Response(JSON.stringify({ error: "Image URL is required for image-to-video mode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get API key based on service
    const KLING_API_KEY = Deno.env.get("KLING_API_KEY");

    if (service === "kling" && !KLING_API_KEY) {
      return new Response(JSON.stringify({ error: "Kling API not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Estimate cost based on duration
    // Kling: ~$0.10-$0.20 per video
    const estimatedCost = duration === "10" ? 0.20 : 0.10;

    // Create pending record in database
    const { data: asset, error: insertError } = await supabase
      .from("marketing_assets")
      .insert({
        created_by: user.id,
        asset_type: "video",
        service,
        prompt,
        settings: { mode, duration, aspect_ratio, image_url },
        status: "processing",
        title: title || "Generated video",
        tags: tags || [],
        estimated_cost_usd: estimatedCost,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error creating asset record:", insertError);
    }

    // Build Kling API request
    const klingEndpoint = mode === "image-to-video"
      ? `${KLING_API_BASE}/video/image2video`
      : `${KLING_API_BASE}/video/text2video`;

    const klingBody: Record<string, unknown> = {
      prompt,
      duration,
      aspect_ratio,
    };

    if (mode === "image-to-video" && image_url) {
      klingBody.image = image_url;
    }

    // Call Kling API
    const response = await fetch(klingEndpoint, {
      method: "POST",
      headers: {
        "X-API-Key": KLING_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(klingBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Kling API error:", errorData);

      // Update status to failed
      if (asset?.id) {
        await supabase
          .from("marketing_assets")
          .update({ status: "failed" })
          .eq("id", asset.id);
      }

      return new Response(
        JSON.stringify({
          error: errorData.message || "Failed to generate video"
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    const taskId = data.data?.task_id;

    // Video generation is async - store task ID and return
    // The frontend will poll for status using another endpoint
    if (asset?.id) {
      await supabase
        .from("marketing_assets")
        .update({
          settings: { ...body, task_id: taskId },
        })
        .eq("id", asset.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        asset_id: asset?.id,
        task_id: taskId,
        status: "processing",
        message: "Video generation started. Check status endpoint for updates.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating video:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
