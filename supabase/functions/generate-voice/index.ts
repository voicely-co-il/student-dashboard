import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";

interface GenerateVoiceRequest {
  text: string;
  voice_id?: string; // ElevenLabs voice ID
  voice_name?: string; // Friendly name to lookup
  model_id?: string; // eleven_multilingual_v2, eleven_turbo_v2_5
  stability?: number; // 0-1
  similarity_boost?: number; // 0-1
  style?: number; // 0-1
  use_speaker_boost?: boolean;
  title?: string;
  tags?: string[];
}

interface Voice {
  voice_id: string;
  name: string;
}

// Predefined voices for Voicely (can be customized)
const VOICELY_VOICES: Record<string, string> = {
  // Hebrew-friendly voices
  "inbal": "", // Will be set from env or API
  "rachel": "21m00Tcm4TlvDq8ikWAM", // Default Rachel
  "bella": "EXAVITQu4vr4xnSDxMaL",
  "josh": "TxGEqnHWrfWFTfGW9XjX",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // GET - List available voices
  if (req.method === "GET") {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

    if (!ELEVENLABS_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ElevenLabs API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    try {
      const response = await fetch(`${ELEVENLABS_API_BASE}/voices`, {
        headers: { "xi-api-key": ELEVENLABS_API_KEY },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch voices");
      }

      const data = await response.json();
      const voices = data.voices.map((v: Voice) => ({
        id: v.voice_id,
        name: v.name,
      }));

      return new Response(
        JSON.stringify({ voices }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // POST - Generate voice
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

    // Get API key
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: "ElevenLabs API not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request
    const body: GenerateVoiceRequest = await req.json();
    const {
      text,
      voice_id,
      voice_name,
      model_id = "eleven_multilingual_v2", // Best for Hebrew
      stability = 0.5,
      similarity_boost = 0.75,
      style = 0.0,
      use_speaker_boost = true,
      title,
      tags,
    } = body;

    if (!text || text.length === 0) {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (text.length > 5000) {
      return new Response(JSON.stringify({ error: "Text too long (max 5000 characters)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve voice ID
    let resolvedVoiceId = voice_id;
    if (!resolvedVoiceId && voice_name) {
      resolvedVoiceId = VOICELY_VOICES[voice_name.toLowerCase()] ||
                        Deno.env.get(`ELEVENLABS_VOICE_${voice_name.toUpperCase()}`);
    }
    if (!resolvedVoiceId) {
      // Default to Rachel (good for Hebrew)
      resolvedVoiceId = "21m00Tcm4TlvDq8ikWAM";
    }

    // Estimate cost (~$0.30 per 1000 characters for multilingual)
    const estimatedCost = (text.length / 1000) * 0.30;

    // Create pending record
    const { data: asset, error: insertError } = await supabase
      .from("marketing_assets")
      .insert({
        created_by: user.id,
        asset_type: "voice",
        service: "elevenlabs",
        prompt: text,
        settings: {
          voice_id: resolvedVoiceId,
          voice_name: voice_name || "default",
          model_id,
          stability,
          similarity_boost,
          style,
          use_speaker_boost,
        },
        status: "processing",
        title: title || `Voice: ${text.substring(0, 30)}...`,
        tags: tags || [],
        estimated_cost_usd: estimatedCost,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error creating asset record:", insertError);
    }

    // Call ElevenLabs API
    const response = await fetch(
      `${ELEVENLABS_API_BASE}/text-to-speech/${resolvedVoiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id,
          voice_settings: {
            stability,
            similarity_boost,
            style,
            use_speaker_boost,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("ElevenLabs API error:", errorData);

      if (asset?.id) {
        await supabase
          .from("marketing_assets")
          .update({ status: "failed" })
          .eq("id", asset.id);
      }

      return new Response(
        JSON.stringify({ error: errorData.detail?.message || "Failed to generate voice" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get audio as blob
    const audioBlob = await response.blob();
    const audioBuffer = await audioBlob.arrayBuffer();

    // Upload to Supabase Storage
    const fileName = `voice/${asset?.id || Date.now()}.mp3`;
    const { error: uploadError } = await supabase.storage
      .from("marketing-assets")
      .upload(fileName, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      // Continue anyway - we can return the audio directly
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("marketing-assets")
      .getPublicUrl(fileName);

    const audioUrl = urlData?.publicUrl;

    // Update record with result
    if (asset?.id) {
      await supabase
        .from("marketing_assets")
        .update({
          status: "completed",
          url: audioUrl,
        })
        .eq("id", asset.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        asset_id: asset?.id,
        url: audioUrl,
        status: "completed",
        duration_estimate: Math.ceil(text.length / 15), // ~15 chars per second
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating voice:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
