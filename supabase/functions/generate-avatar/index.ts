import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const HEYGEN_API_BASE = "https://api.heygen.com/v2";

interface GenerateAvatarRequest {
  text: string;
  avatar_id?: string; // HeyGen avatar ID
  voice_id?: string; // HeyGen voice ID or ElevenLabs voice
  voice_type?: "heygen" | "elevenlabs";
  background?: string; // URL or color (#FFFFFF)
  aspect_ratio?: "16:9" | "9:16" | "1:1";
  title?: string;
  tags?: string[];
}

interface HeyGenAvatar {
  avatar_id: string;
  avatar_name: string;
  preview_image_url: string;
}

interface HeyGenVoice {
  voice_id: string;
  name: string;
  language: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const HEYGEN_API_KEY = Deno.env.get("HEYGEN_API_KEY");

  // GET - List available avatars and voices
  if (req.method === "GET") {
    if (!HEYGEN_API_KEY) {
      return new Response(
        JSON.stringify({ error: "HeyGen API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const listType = url.searchParams.get("type") || "avatars";

    try {
      if (listType === "avatars") {
        const response = await fetch(`${HEYGEN_API_BASE}/avatars`, {
          headers: { "X-Api-Key": HEYGEN_API_KEY },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch avatars");
        }

        const data = await response.json();
        const avatars = data.data?.avatars?.map((a: HeyGenAvatar) => ({
          id: a.avatar_id,
          name: a.avatar_name,
          preview: a.preview_image_url,
        })) || [];

        return new Response(
          JSON.stringify({ avatars }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else if (listType === "voices") {
        const response = await fetch(`${HEYGEN_API_BASE}/voices`, {
          headers: { "X-Api-Key": HEYGEN_API_KEY },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch voices");
        }

        const data = await response.json();
        const voices = data.data?.voices?.map((v: HeyGenVoice) => ({
          id: v.voice_id,
          name: v.name,
          language: v.language,
        })) || [];

        return new Response(
          JSON.stringify({ voices }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Invalid type. Use 'avatars' or 'voices'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // POST - Generate avatar video
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
      .eq("is_active", true)
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!HEYGEN_API_KEY) {
      return new Response(JSON.stringify({ error: "HeyGen API not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request
    const body: GenerateAvatarRequest = await req.json();
    const {
      text,
      avatar_id,
      voice_id,
      voice_type = "heygen",
      background = "#FFFFFF",
      aspect_ratio = "16:9",
      title,
      tags,
    } = body;

    if (!text || text.length === 0) {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (text.length > 3000) {
      return new Response(JSON.stringify({ error: "Text too long (max 3000 characters)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Estimate cost (~$0.50-1.00 per minute, estimate ~150 chars/minute)
    const estimatedMinutes = Math.ceil(text.length / 150);
    const estimatedCost = estimatedMinutes * 0.75;

    // Create pending record
    const { data: asset, error: insertError } = await supabase
      .from("marketing_assets")
      .insert({
        created_by: user.id,
        asset_type: "video", // Avatar videos are videos
        service: "heygen",
        prompt: text,
        settings: {
          avatar_id,
          voice_id,
          voice_type,
          background,
          aspect_ratio,
        },
        status: "processing",
        title: title || `Avatar: ${text.substring(0, 30)}...`,
        tags: tags || ["avatar"],
        estimated_cost_usd: estimatedCost,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error creating asset record:", insertError);
    }

    // Map aspect ratio to dimensions
    const dimensions: Record<string, { width: number; height: number }> = {
      "16:9": { width: 1920, height: 1080 },
      "9:16": { width: 1080, height: 1920 },
      "1:1": { width: 1080, height: 1080 },
    };

    const { width, height } = dimensions[aspect_ratio] || dimensions["16:9"];

    // Build HeyGen request
    const heygenBody: Record<string, unknown> = {
      video_inputs: [
        {
          character: {
            type: "avatar",
            avatar_id: avatar_id || "josh_lite3_20230714", // Default avatar
            avatar_style: "normal",
          },
          voice: voice_type === "elevenlabs"
            ? {
                type: "elevenlabs",
                voice_id: voice_id,
                input_text: text,
              }
            : {
                type: "text",
                voice_id: voice_id || "1bd001e7e50f421d891986aad5158bc8", // Default Hebrew voice
                input_text: text,
              },
          background: background.startsWith("#")
            ? { type: "color", value: background }
            : { type: "image", url: background },
        },
      ],
      dimension: { width, height },
      aspect_ratio: null, // Use dimensions instead
    };

    // Call HeyGen API
    const response = await fetch(`${HEYGEN_API_BASE}/video/generate`, {
      method: "POST",
      headers: {
        "X-Api-Key": HEYGEN_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(heygenBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("HeyGen API error:", errorData);

      if (asset?.id) {
        await supabase
          .from("marketing_assets")
          .update({ status: "failed" })
          .eq("id", asset.id);
      }

      return new Response(
        JSON.stringify({ error: errorData.message || "Failed to generate avatar video" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const videoId = data.data?.video_id;

    // Video generation is async - store video ID for polling
    if (asset?.id && videoId) {
      await supabase
        .from("marketing_assets")
        .update({
          settings: {
            ...body,
            video_id: videoId,
          },
        })
        .eq("id", asset.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        asset_id: asset?.id,
        video_id: videoId,
        status: "processing",
        message: "Avatar video generation started. Use the status endpoint to check progress.",
        estimated_duration: estimatedMinutes * 60, // in seconds
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating avatar:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
