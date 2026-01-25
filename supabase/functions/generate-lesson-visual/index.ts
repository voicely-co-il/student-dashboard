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

  // Option 3: Direct prompt (from suggestions system)
  direct_prompt?: string;

  // Settings
  style?: "cartoon" | "watercolor" | "realistic" | "minimalist";
  aspect_ratio?: "1:1" | "16:9" | "9:16";
}

// Voicely Image Prompt System - optimized for Gemini Imagen
// Based on Timeless prompt system + Gemini best practices

const VISUAL_EXTRACTION_PROMPT = `You are the Voicely Image Prompt Agent, creating celebration images for vocal lesson students.

GOAL: From each lesson transcript, create a WOW marketing image prompt:
- Celebration, victory, emotion, atmosphere
- Student-centered, safe, non-stocky
- Musical visual elements (sound waves, notes, motion)

EXTRACT FROM LESSON:
• Student name(s) and approximate age
• Type: first lesson / breakthrough / milestone / steady progress / group
• Main achievement and emotional tone
• Key technique practiced

VISUAL STYLE BASELINE (Gemini-optimized):
- High quality, 4K cinematic image
- Bright, clear lighting, shallow depth of field
- Musical icons, sound waves, sparkles, motion
- Student singing/practicing with big positive emotion
- Colors: vibrant teal (#00C6AE) and coral (#FF6F61) accents

PROMPT STRUCTURE (follow exactly):
[Subject + age + emotion] [Action/pose] in [Location]. [Composition/camera]. [Lighting]. [Style].

CARD TYPES (pick the most relevant):
1. HERO_WIN - celebrate main achievement, fireworks vibe
2. TECHNIQUE_FOCUS - highlight vocal technique (breathing, posture, projection)
3. EMOTION_STORY - before/after emotional shift
4. MOTIVATION - atmospheric, inspirational mood

OUTPUT FORMAT - JSON only:
{
  "student_name": "extracted name or 'תלמיד/ה'",
  "student_age": "teen/child/adult if detectable",
  "card_type": "HERO_WIN|TECHNIQUE_FOCUS|EMOTION_STORY|MOTIVATION",
  "main_achievement": "1 sentence in Hebrew",
  "key_moments": ["moment 1", "moment 2"],
  "mood": "one word: triumphant/confident/joyful/focused/inspired",
  "image_prompt": "Full prompt in English, 2-3 sentences following the structure above. Be descriptive not repetitive."
}

IMPORTANT GEMINI RULES:
- No text/words in the image (Gemini can add text but we want clean images)
- Use photographic language: wide-angle shot, 85mm portrait, soft bokeh
- Keep character consistent: describe specific features
- Be specific about lighting: golden hour, studio lights, dramatic backlight`;

interface ExtractedVisual {
  studentName: string;
  studentAge: string;
  cardType: string;
  mainAchievement: string;
  keyMoments: string[];
  mood: string;
  imagePrompt: string;
}

// Generate image prompt from lesson content
async function extractVisualPrompt(
  lessonContent: string,
  openaiKey: string
): Promise<ExtractedVisual> {
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
        { role: "user", content: `Lesson transcript:\n\n${lessonContent.slice(0, 4000)}` },
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
    studentName: result.student_name || "תלמיד/ה",
    studentAge: result.student_age || "teen",
    cardType: result.card_type || "HERO_WIN",
    mainAchievement: result.main_achievement || "",
    keyMoments: result.key_moments || [],
    mood: result.mood || "inspired",
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
  // Gemini-optimized style modifiers (following best practices)
  const styleModifiers: Record<string, string> = {
    cartoon: "Vibrant colorful cartoon illustration. Bright teal and coral accents. Playful, celebratory mood. 85mm portrait lens perspective. Soft bokeh background.",
    watercolor: "Soft watercolor painting style. Gentle pastel colors with teal and coral highlights. Dreamy, artistic atmosphere. Natural light filtering through.",
    realistic: "Photorealistic high quality image. Professional studio lighting with dramatic backlight. Shallow depth of field. 4K cinematic look.",
    minimalist: "Clean minimalist modern illustration. Simple geometric shapes. Bold teal (#00C6AE) and coral (#FF6F61) color palette. Lots of white space.",
  };

  // Gemini works best with natural language, no keyword spam
  const fullPrompt = `${prompt} ${styleModifiers[style] || styleModifiers.cartoon} Important: No text, words, or letters anywhere in the image.`;

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

    // Check admin/instructor role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "instructor"])
      .limit(1);

    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Instructor or admin access required" }), {
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
      direct_prompt,
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
      // Step 1: Extract visual prompt from content OR use direct prompt
      let imagePrompt: string;
      let keyMoments: string[] = [];
      let mood = "inspired";
      let mainAchievement = "";
      let cardType = "HERO_WIN";
      let extractedName = studentNameFinal;

      if (direct_prompt) {
        // Use the pre-generated prompt from suggestions system
        console.log("Using direct prompt from suggestions...");
        imagePrompt = direct_prompt;
      } else {
        // Extract visual prompt from content
        console.log("Extracting visual elements...");
        const extracted = await extractVisualPrompt(content, OPENAI_API_KEY);
        imagePrompt = extracted.imagePrompt;
        keyMoments = extracted.keyMoments;
        mood = extracted.mood;
        mainAchievement = extracted.mainAchievement;
        cardType = extracted.cardType;
        extractedName = extracted.studentName;
      }

      // Use extracted student name if not provided
      if (!student_name && extractedName && extractedName !== "תלמיד/ה") {
        studentNameFinal = extractedName;
      }

      // Update record with prompt and achievement
      await supabase
        .from("lesson_visuals")
        .update({
          prompt: imagePrompt,
          source_text: `${mainAchievement}\n\n${keyMoments.join("\n")}`,
          student_name: studentNameFinal,
          settings: { style, aspect_ratio, card_type: cardType, mood },
        })
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
          card_type: cardType,
          main_achievement: mainAchievement,
          key_moments: keyMoments,
          student_name: studentNameFinal,
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
