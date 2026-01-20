import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ASTRIA_API_BASE = "https://api.astria.ai";
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY = 30000;

interface GenerateRequest {
  prompt: string;
  negative_prompt?: string;
  aspect_ratio?: "1:1" | "9:16" | "16:9" | "4:3" | "3:4";
  num_outputs?: number;
  character?: "inbal" | "ilya" | "custom";
  title?: string;
  tags?: string[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
      negative_prompt = "blurry, low-res, watermark, bad anatomy, extra limbs, deformed",
      aspect_ratio = "1:1",
      num_outputs = 1,
      character,
      title,
      tags,
    } = body;

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Astria credentials
    const ASTRIA_API_KEY = Deno.env.get("ASTRIA_API_KEY");
    const ASTRIA_TUNE_ID_INBAL = Deno.env.get("ASTRIA_TUNE_ID_INBAL");
    const ASTRIA_TUNE_ID_ILYA = Deno.env.get("ASTRIA_TUNE_ID_ILYA");

    if (!ASTRIA_API_KEY) {
      return new Response(JSON.stringify({ error: "Astria API not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Select tune and build prompt based on character
    let tuneId: string | undefined;
    let enhancedPrompt = prompt;

    if (character === "inbal") {
      tuneId = ASTRIA_TUNE_ID_INBAL;
      enhancedPrompt = `ohwx woman, ${prompt}`;
    } else if (character === "ilya") {
      tuneId = ASTRIA_TUNE_ID_ILYA;
      enhancedPrompt = `sks man, ${prompt}`;
    }

    if (!tuneId) {
      return new Response(JSON.stringify({ error: "Please select a character (Inbal or Ilya)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add brand colors hint
    enhancedPrompt += ", teal (#00C6AE) and coral (#FF6F61) brand colors";

    // Create pending record in database
    const { data: asset, error: insertError } = await supabase
      .from("marketing_assets")
      .insert({
        created_by: user.id,
        asset_type: "image",
        service: "astria",
        prompt: enhancedPrompt,
        negative_prompt,
        settings: { aspect_ratio, num_outputs, character },
        status: "processing",
        title: title || `Generated image`,
        tags: tags || [],
        estimated_cost_usd: 0.05 * num_outputs, // ~$0.05 per image estimate
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error creating asset record:", insertError);
    }

    // Call Astria API with retries
    let attempt = 0;
    let responseData: any = null;

    while (attempt < MAX_RETRIES) {
      try {
        const response = await fetch(`${ASTRIA_API_BASE}/tunes/${tuneId}/prompts`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${ASTRIA_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: {
              text: enhancedPrompt,
              negative_prompt,
              super_resolution: true,
              face_correct: true,
              callback: null, // We'll poll for results
            },
          }),
        });

        if (response.ok) {
          responseData = await response.json();
          break;
        }

        const status = response.status;

        if (status === 500) {
          attempt++;
          const delay = RETRY_BASE_DELAY * Math.pow(2, attempt - 1);
          console.log(`Server error 500, retry ${attempt}/${MAX_RETRIES} after ${delay}ms`);
          await sleep(delay);
        } else if (status === 504) {
          attempt++;
          console.log(`Gateway timeout 504, waiting 60s before retry ${attempt}/${MAX_RETRIES}`);
          await sleep(60000);
        } else if (status === 422) {
          const errorData = await response.json();
          return new Response(JSON.stringify({ error: `Validation error: ${errorData.message || "Invalid request"}` }), {
            status: 422,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } else if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit reached. Try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } else {
          const errorText = await response.text();
          throw new Error(`Astria API error: ${status} - ${errorText}`);
        }
      } catch (err) {
        if (attempt >= MAX_RETRIES - 1) {
          throw err;
        }
        attempt++;
      }
    }

    if (!responseData) {
      // Update status to failed
      if (asset?.id) {
        await supabase
          .from("marketing_assets")
          .update({ status: "failed" })
          .eq("id", asset.id);
      }

      return new Response(JSON.stringify({ error: "Failed to generate image after retries" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the prompt ID for polling
    const promptId = responseData.id;

    // Poll for completion (Astria is async)
    let imageUrl = null;
    let pollAttempts = 0;
    const maxPollAttempts = 30; // 5 minutes max (10s intervals)

    while (pollAttempts < maxPollAttempts && !imageUrl) {
      await sleep(10000); // Wait 10 seconds between polls

      const statusResponse = await fetch(`${ASTRIA_API_BASE}/tunes/${tuneId}/prompts/${promptId}`, {
        headers: {
          "Authorization": `Bearer ${ASTRIA_API_KEY}`,
        },
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();

        if (statusData.images && statusData.images.length > 0) {
          imageUrl = statusData.images[0];
          break;
        }

        if (statusData.status === "failed") {
          break;
        }
      }

      pollAttempts++;
    }

    // Update record with result
    if (asset?.id) {
      await supabase
        .from("marketing_assets")
        .update({
          status: imageUrl ? "completed" : "failed",
          url: imageUrl,
          thumbnail_url: imageUrl,
        })
        .eq("id", asset.id);
    }

    return new Response(
      JSON.stringify({
        success: !!imageUrl,
        asset_id: asset?.id,
        prompt_id: promptId,
        image_url: imageUrl,
        status: imageUrl ? "completed" : "processing",
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
