import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface TranscriptInsight {
  key_topics: string[];
  skills_practiced: string[];
  student_mood: string;
  progress_notes: string;
  teacher_recommendations: string;
  action_items: string[];
}

// Extract insights using Gemini (cheaper & faster for bulk processing)
async function extractInsights(
  transcriptText: string,
  studentName: string
): Promise<TranscriptInsight> {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const prompt = `אתה מנתח שיעורי קול ושירה. נתח את התמליל הבא וחלץ את המידע המבוקש.

תמליל השיעור של ${studentName}:
${transcriptText.slice(0, 8000)}

החזר JSON בלבד בפורמט הבא (בעברית):
{
  "key_topics": ["נושא 1", "נושא 2", "נושא 3"],
  "skills_practiced": ["מיומנות 1", "מיומנות 2"],
  "student_mood": "מצב רוח התלמיד (מילה אחת או שתיים)",
  "progress_notes": "סיכום התקדמות קצר",
  "teacher_recommendations": "המלצות המורה מהשיעור",
  "action_items": ["פעולה 1", "פעולה 2"]
}

הנחיות:
- נושאים טיפוסיים: נשימה סרעפתית, רזוננס, הרחבת טווח, ויברטו, תמיכה, דיקציה, פאסאג'ו, ביטוי רגשי
- מיומנויות טיפוסיות: סקאלות, אינטרוולים, Lip Trills, תרגילי נשימה, הקרנה, דינמיקה, מעברים
- מצבי רוח: מלא מוטיבציה, רגוע, מתוסכל, מתרגש, עייף, מרוכז, נלהב
- אם אין מספיק מידע, השתמש ב-"לא צוין"`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("Failed to extract JSON from:", text);
    return {
      key_topics: ["לא צוין"],
      skills_practiced: ["לא צוין"],
      student_mood: "לא צוין",
      progress_notes: "לא ניתן לחלץ מידע",
      teacher_recommendations: "לא צוין",
      action_items: [],
    };
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    console.error("Failed to parse JSON:", jsonMatch[0]);
    return {
      key_topics: ["לא צוין"],
      skills_practiced: ["לא צוין"],
      student_mood: "לא צוין",
      progress_notes: "לא ניתן לחלץ מידע",
      teacher_recommendations: "לא צוין",
      action_items: [],
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get parameters
    const { limit = 50, offset = 0 } = await req.json().catch(() => ({}));

    // Get transcripts that don't have insights yet
    const { data: transcripts, error: fetchError } = await supabase
      .from("transcripts")
      .select("id, title, full_text, student_name, ai_summary")
      .not("full_text", "is", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (fetchError) {
      throw new Error(`Failed to fetch transcripts: ${fetchError.message}`);
    }

    // Check which already have insights
    const transcriptIds = transcripts?.map((t) => t.id) || [];
    const { data: existingInsights } = await supabase
      .from("transcript_insights")
      .select("transcript_id")
      .in("transcript_id", transcriptIds);

    const existingIds = new Set(existingInsights?.map((i) => i.transcript_id) || []);
    const toProcess = transcripts?.filter((t) => !existingIds.has(t.id)) || [];

    console.log(`Processing ${toProcess.length} transcripts (offset: ${offset})`);

    let processed = 0;
    let errors = 0;

    for (const transcript of toProcess) {
      try {
        // Use full_text or ai_summary as source
        const textToAnalyze = transcript.full_text || transcript.ai_summary || "";

        if (textToAnalyze.length < 100) {
          console.log(`Skipping ${transcript.id}: text too short`);
          continue;
        }

        const insights = await extractInsights(
          textToAnalyze,
          transcript.student_name || "תלמיד"
        );

        // Insert insights
        const { error: insertError } = await supabase
          .from("transcript_insights")
          .insert({
            transcript_id: transcript.id,
            key_topics: insights.key_topics,
            skills_practiced: insights.skills_practiced,
            student_mood: insights.student_mood,
            progress_notes: insights.progress_notes,
            teacher_recommendations: insights.teacher_recommendations,
            action_items: insights.action_items,
            raw_ai_response: insights,
          });

        if (insertError) {
          console.error(`Failed to insert insights for ${transcript.id}:`, insertError);
          errors++;
        } else {
          processed++;
          console.log(`Processed ${transcript.id}: ${transcript.student_name}`);
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (err) {
        console.error(`Error processing ${transcript.id}:`, err);
        errors++;
      }
    }

    // Refresh materialized views if we processed any
    if (processed > 0) {
      try {
        await supabase.rpc("refresh_analytics_views");
        console.log("Refreshed materialized views");
      } catch (err) {
        console.error("Failed to refresh views:", err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        errors,
        total: transcripts?.length || 0,
        alreadyProcessed: existingIds.size,
        message: `Processed ${processed} transcripts with ${errors} errors`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
