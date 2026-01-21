import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface GenerateRequest {
  prompt: string;
  style?: "vivid" | "natural";
  size?: "1024x1024" | "1792x1024" | "1024x1792";
  quality?: "standard" | "hd";
  title?: string;
  tags?: string[];
}

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
    const body: GenerateRequest = await req.json();
    const {
      prompt,
      style = "vivid",
      size = "1024x1024",
      quality = "standard",
      title,
      tags,
    } = body;

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get OpenAI API key
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OpenAI API not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Estimate cost based on quality and size
    // DALL-E 3 pricing: Standard 1024x1024 = $0.04, HD = $0.08
    // Larger sizes: Standard = $0.08, HD = $0.12
    let estimatedCost = 0.04;
    if (quality === "hd") {
      estimatedCost = size === "1024x1024" ? 0.08 : 0.12;
    } else {
      estimatedCost = size === "1024x1024" ? 0.04 : 0.08;
    }

    // Create pending record in database
    const { data: asset, error: insertError } = await supabase
      .from("marketing_assets")
      .insert({
        created_by: user.id,
        asset_type: "image",
        service: "dalle3",
        prompt,
        settings: { style, size, quality },
        status: "processing",
        title: title || "Creative image",
        tags: tags || [],
        estimated_cost_usd: estimatedCost,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error creating asset record:", insertError);
    }

    // Call OpenAI DALL-E 3 API
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size,
        quality,
        style,
        response_format: "url",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("DALL-E API error:", errorData);

      // Update status to failed
      if (asset?.id) {
        await supabase
          .from("marketing_assets")
          .update({ status: "failed" })
          .eq("id", asset.id);
      }

      return new Response(
        JSON.stringify({
          error: errorData.error?.message || "Failed to generate image"
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;
    const revisedPrompt = data.data?.[0]?.revised_prompt;

    // Update record with result
    if (asset?.id) {
      await supabase
        .from("marketing_assets")
        .update({
          status: imageUrl ? "completed" : "failed",
          url: imageUrl,
          thumbnail_url: imageUrl,
          description: revisedPrompt, // DALL-E 3 returns revised prompt
        })
        .eq("id", asset.id);
    }

    return new Response(
      JSON.stringify({
        success: !!imageUrl,
        asset_id: asset?.id,
        image_url: imageUrl,
        revised_prompt: revisedPrompt,
        status: imageUrl ? "completed" : "failed",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating image:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
