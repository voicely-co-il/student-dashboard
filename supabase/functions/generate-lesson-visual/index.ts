import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface GenerateRequest {
  // Option 1: From transcript
  transcript_id?: string;

  // Option 2: Direct text
  lesson_content?: string;
  student_name?: string;
  lesson_date?: string;

  // Settings
  style?: "cartoon" | "watercolor" | "realistic" | "minimalist";
  aspect_ratio?: "1:1" | "16:9" | "9:16";
}

// System prompt for extracting visual elements from lesson content
const VISUAL_EXTRACTION_PROMPT = `אתה מומחה ביצירת תיאורים ויזואליים לשיעורי קול ושירה.

תפקידך: לקרוא תמלול של שיעור ולחלץ 2-3 נקודות מפתח ויזואליות שאפשר להמחיש בתמונה.

כללים:
1. התמקד ברגעי למידה חיוביים ומעודדים
2. חשוב על אלמנטים שקשורים לקול, שירה, נשימה, תנועה
3. השתמש בתיאורים קונקרטיים וויזואליים
4. הימנע מטקסט או מילים בתמונה

פורמט התשובה - JSON בלבד:
{
  "key_moments": ["רגע 1", "רגע 2"],
  "visual_elements": ["אלמנט 1", "אלמנט 2", "אלמנט 3"],
  "mood": "מילה אחת שמתארת את האווירה",
  "image_prompt": "תיאור מפורט לתמונה באנגלית, 2-3 משפטים"
}`;

// Generate image prompt from lesson content
async function extractVisualPrompt(
  lessonContent: string,
  openaiKey: string
): Promise<{ keyMoments: string[]; visualElements: string[]; mood: string; imagePrompt: string }> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: VISUAL_EXTRACTION_PROMPT },
        { role: "user", content: `תמלול השיעור:\n\n${lessonContent.slice(0, 4000)}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI error: ${response.status}`);
  }

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);

  return {
    keyMoments: result.key_moments || [],
    visualElements: result.visual_elements || [],
    mood: result.mood || "inspiring",
    imagePrompt: result.image_prompt || "",
  };
}

// Generate image with Gemini
async function generateImageWithGemini(
  prompt: string,
  geminiKey: string,
  style: string,
  aspectRatio: string
): Promise<{ imageUrl: string; revisedPrompt?: string }> {
  // Style modifiers
  const styleModifiers: Record<string, string> = {
    cartoon: "colorful cartoon illustration style, playful, vibrant colors",
    watercolor: "soft watercolor painting style, gentle colors, artistic",
    realistic: "photorealistic, high quality, detailed lighting",
    minimalist: "clean minimalist illustration, simple shapes, modern design",
  };

  const fullPrompt = `${prompt}. Style: ${styleModifiers[style] || styleModifiers.cartoon}. No text or letters in the image.`;

  // Gemini 2.5 Flash with image generation
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Generate an image: ${fullPrompt}`,
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Gemini error:", error);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();

  // Extract image from response
  const parts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData?.mimeType?.startsWith("image/"));

  if (!imagePart?.inlineData) {
    throw new Error("No image generated");
  }

  // Return base64 data URL
  const imageUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;

  return { imageUrl };
}

// Upload image to Supabase Storage
async function uploadToStorage(
  supabase: ReturnType<typeof createClient>,
  imageDataUrl: string,
  filename: string
): Promise<string> {
  // Convert base64 to blob
  const base64Data = imageDataUrl.split(",")[1];
  const mimeType = imageDataUrl.split(";")[0].split(":")[1];
  const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

  const { data, error } = await supabase.storage
    .from("lesson-visuals")
    .upload(filename, binaryData, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    console.error("Storage upload error:", error);
    throw new Error("Failed to upload image");
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("lesson-visuals")
    .getPublicUrl(data.path);

  return urlData.publicUrl;
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

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin/teacher role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "teacher"])
      .limit(1);

    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Teacher or admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request
    const body: GenerateRequest = await req.json();
    const {
      transcript_id,
      lesson_content,
      student_name,
      lesson_date,
      style = "cartoon",
      aspect_ratio = "1:1",
    } = body;

    // Get lesson content
    let content = lesson_content || "";
    let studentNameFinal = student_name || "תלמיד";
    let lessonDateFinal = lesson_date ? new Date(lesson_date) : new Date();
    let transcriptIdFinal = transcript_id;

    if (transcript_id && !lesson_content) {
      const { data: transcript, error: transcriptError } = await supabase
        .from("transcripts")
        .select("content, student_name, lesson_date")
        .eq("id", transcript_id)
        .single();

      if (transcriptError || !transcript) {
        return new Response(JSON.stringify({ error: "Transcript not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      content = transcript.content;
      studentNameFinal = transcript.student_name || studentNameFinal;
      lessonDateFinal = transcript.lesson_date ? new Date(transcript.lesson_date) : lessonDateFinal;
    }

    if (!content) {
      return new Response(JSON.stringify({ error: "No content provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get API keys
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!OPENAI_API_KEY || !GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "API keys not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create pending record
    const { data: visual, error: insertError } = await supabase
      .from("lesson_visuals")
      .insert({
        transcript_id: transcriptIdFinal,
        student_name: studentNameFinal,
        lesson_date: lessonDateFinal.toISOString().split("T")[0],
        source_text: content.slice(0, 2000),
        prompt: "Generating...",
        model: "gemini-2.0-flash",
        settings: { style, aspect_ratio },
        status: "generating",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      // Step 1: Extract visual prompt from content
      console.log("Extracting visual elements...");
      const { imagePrompt, keyMoments, mood } = await extractVisualPrompt(content, OPENAI_API_KEY);

      // Update record with prompt
      await supabase
        .from("lesson_visuals")
        .update({ prompt: imagePrompt, source_text: keyMoments.join("\n") })
        .eq("id", visual.id);

      // Step 2: Generate image with Gemini
      console.log("Generating image with Gemini...");
      const { imageUrl: imageDataUrl } = await generateImageWithGemini(
        imagePrompt,
        GEMINI_API_KEY,
        style,
        aspect_ratio
      );

      // Step 3: Upload to storage
      console.log("Uploading to storage...");
      const filename = `${studentNameFinal.replace(/\s+/g, "-")}-${lessonDateFinal.toISOString().split("T")[0]}-${visual.id.slice(0, 8)}.png`;
      const publicUrl = await uploadToStorage(supabase, imageDataUrl, filename);

      // Update record with final URL
      await supabase
        .from("lesson_visuals")
        .update({
          image_url: publicUrl,
          thumbnail_url: publicUrl,
          status: "completed",
        })
        .eq("id", visual.id);

      return new Response(
        JSON.stringify({
          success: true,
          visual_id: visual.id,
          image_url: publicUrl,
          prompt: imagePrompt,
          mood,
          key_moments: keyMoments,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (genError) {
      console.error("Generation error:", genError);

      // Update status to failed
      await supabase
        .from("lesson_visuals")
        .update({
          status: "failed",
          error_message: genError instanceof Error ? genError.message : String(genError),
        })
        .eq("id", visual.id);

      return new Response(
        JSON.stringify({
          error: genError instanceof Error ? genError.message : "Generation failed",
          visual_id: visual.id,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
