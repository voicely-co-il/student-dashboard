import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Creative marketing prompt generator - makes parents WANT to join Voicely
const CREATIVE_SUGGESTIONS_PROMPT = `You are a VIRAL social media marketing expert for Voicely vocal studio. Your job is to create WOW visual concepts that make parents want to enroll their kids.

## YOUR MISSION
From lesson transcripts, create IRRESISTIBLE image concepts that:
- Stop the scroll on Instagram/Facebook
- Make parents feel "I want THIS for my child"
- Showcase transformation, confidence, joy
- Are shareable and emotionally powerful

## CREATIVE ANGLES (pick 2-3 per lesson)

### TRANSFORMATION STORIES 🦋
- Before/After emotional arc
- "From shy to STAR" moments
- First note to confident performance
- "Watch me grow" timeline vibes

### VICTORY MOMENTS 🏆
- Hitting that high note
- Overcoming a vocal challenge
- Student's proud moment
- Teacher's "wow" reaction

### EMOTIONAL HOOKS 💫
- Parent-child connection
- "My child found their voice"
- Joy explosion during singing
- Confidence radiating

### TECHNIQUE CELEBRATIONS 🎯
- Breathing mastery visualization
- Posture transformation
- Vocal control demonstration
- Before/during/after practice

### COMMUNITY & BELONGING 👥
- Part of the Voicely family
- Friends singing together
- Student spotlight
- "We celebrate every win"

## OUTPUT FORMAT
For each suggestion, provide:
{
  "suggestions": [
    {
      "title_he": "כותרת קצרה בעברית (3-5 מילים)",
      "hook_he": "הוק שיווקי בעברית - מה ההורה ירגיש?",
      "angle": "TRANSFORMATION|VICTORY|EMOTION|TECHNIQUE|COMMUNITY",
      "image_prompt": "Detailed English prompt following Gemini best practices. Be specific: describe age, emotion, pose, lighting, colors (teal #00C6AE, coral #FF6F61), musical elements, camera angle. No text in image.",
      "caption_he": "קפשן אפשרי לפוסט ברשתות (עם אימוג'י)",
      "hashtags": ["#וויסלי", "#שירה", "#התפתחותילדים"],
      "score": 8.5,
      "why_viral": "One sentence explaining the viral potential"
    }
  ],
  "student_name": "extracted name",
  "lesson_type": "first_lesson|breakthrough|milestone|steady_progress|group",
  "key_achievement": "main thing that happened in Hebrew"
}

## GEMINI BEST PRACTICES
- Use photographic language: "85mm portrait lens", "shallow depth of field", "golden hour lighting"
- Be specific about emotions: not just "happy" but "triumphant", "radiant confidence", "pure joy"
- Include musical visual elements: sound waves, musical notes floating, microphone, vibrant energy
- Voicely colors: teal (#00C6AE) accents, coral (#FF6F61) highlights
- No text/words in images
- Keep subject consistent if describing multiple angles

## SCORING CRITERIA (1-10)
- Emotional impact: Does it make you feel something?
- Shareability: Would a parent share this?
- Uniqueness: Is it different from typical vocal lesson photos?
- Brand alignment: Does it feel "Voicely"?
- Story clarity: Can you understand the story instantly?

Create 3-5 suggestions per lesson, sorted by score (highest first).
ONLY output valid JSON, no other text.`;

interface Suggestion {
  title_he: string;
  hook_he: string;
  angle: string;
  image_prompt: string;
  caption_he: string;
  hashtags: string[];
  score: number;
  why_viral: string;
}

interface SuggestionsResponse {
  suggestions: Suggestion[];
  student_name: string;
  lesson_type: string;
  key_achievement: string;
}

interface TranscriptWithSuggestions {
  transcript_id: string;
  student_name: string;
  lesson_date: string;
  content_preview: string;
  suggestions: Suggestion[];
  lesson_type: string;
  key_achievement: string;
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

    // Verify user (or service role)
    const token = authHeader.replace("Bearer ", "");

    // Check if this is the service role key (for internal calls)
    const isServiceRole = token === supabaseKey;

    if (!isServiceRole) {
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
    }
    // Service role bypasses role check (for internal use)

    // Parse request
    const body = await req.json();
    const {
      days = 7, // How many days back to look
      limit = 5, // How many transcripts to analyze
      transcript_id = null, // Optional: specific transcript
      surprise_me = false // Random selection mode
    } = body;

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch recent transcripts
    let transcriptsQuery = supabase
      .from("transcripts")
      .select("id, full_text, student_name, lesson_date, created_at")
      .not("full_text", "is", null)
      .neq("full_text", ""); // Has non-empty content

    if (transcript_id) {
      // Specific transcript
      transcriptsQuery = transcriptsQuery.eq("id", transcript_id);
    } else {
      // Recent transcripts
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - days);

      transcriptsQuery = transcriptsQuery
        .gte("created_at", sinceDate.toISOString())
        .order("created_at", { ascending: false });

      if (surprise_me) {
        // Random selection - get more and shuffle
        transcriptsQuery = transcriptsQuery.limit(20);
      } else {
        transcriptsQuery = transcriptsQuery.limit(limit);
      }
    }

    const { data: transcripts, error: transcriptError } = await transcriptsQuery;

    console.log("Query params:", { days, limit, transcript_id, surprise_me });
    console.log("Transcripts found:", transcripts?.length || 0);
    if (transcriptError) {
      console.error("Transcript fetch error:", transcriptError);
      return new Response(JSON.stringify({ error: "Failed to fetch transcripts", details: transcriptError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!transcripts || transcripts.length === 0) {
      return new Response(
        JSON.stringify({
          suggestions: [],
          message: "No recent transcripts found"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Shuffle and pick random ones for surprise mode
    let selectedTranscripts = transcripts;
    if (surprise_me && transcripts.length > limit) {
      selectedTranscripts = transcripts
        .sort(() => Math.random() - 0.5)
        .slice(0, limit);
    }

    // Generate suggestions for each transcript
    const results: TranscriptWithSuggestions[] = [];

    for (const transcript of selectedTranscripts) {
      try {
        // Call OpenAI for creative suggestions
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: CREATIVE_SUGGESTIONS_PROMPT },
              {
                role: "user",
                content: `Lesson transcript:\n\nStudent: ${transcript.student_name || "Unknown"}\nDate: ${transcript.lesson_date || "Unknown"}\n\n${transcript.full_text.slice(0, 4000)}`
              },
            ],
            response_format: { type: "json_object" },
            temperature: 0.85, // Higher for more creativity
          }),
        });

        if (!response.ok) {
          console.error(`OpenAI error for transcript ${transcript.id}:`, await response.text());
          continue;
        }

        const data = await response.json();
        const parsed: SuggestionsResponse = JSON.parse(data.choices[0].message.content);

        results.push({
          transcript_id: transcript.id,
          student_name: parsed.student_name || transcript.student_name || "תלמיד",
          lesson_date: transcript.lesson_date || transcript.created_at.split("T")[0],
          content_preview: transcript.full_text.slice(0, 200) + "...",
          suggestions: parsed.suggestions.sort((a, b) => b.score - a.score),
          lesson_type: parsed.lesson_type || "steady_progress",
          key_achievement: parsed.key_achievement || "",
        });
      } catch (err) {
        console.error(`Error processing transcript ${transcript.id}:`, err);
        continue;
      }
    }

    // Sort by highest score suggestion
    results.sort((a, b) => {
      const maxA = Math.max(...a.suggestions.map(s => s.score));
      const maxB = Math.max(...b.suggestions.map(s => s.score));
      return maxB - maxA;
    });

    return new Response(
      JSON.stringify({
        success: true,
        count: results.length,
        suggestions: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

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
