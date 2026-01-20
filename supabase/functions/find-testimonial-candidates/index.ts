import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.24.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestimonialCandidate {
  studentName: string;
  reason: string;
  highlights: string[];
  suggestedPlatform: "video" | "google" | "facebook" | "website";
  confidenceScore: number;
  lessonCount: number;
  recentLessons: { date: string; summary: string }[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { limit = 10, minLessons = 3 } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const anthropic = new Anthropic({ apiKey: anthropicKey });

    // Get students with at least minLessons transcripts
    const { data: studentStats, error: statsError } = await supabase
      .from("transcripts")
      .select("student_name")
      .not("student_name", "is", null);

    if (statsError) throw statsError;

    // Count lessons per student
    const lessonCounts: Record<string, number> = {};
    for (const row of studentStats || []) {
      if (row.student_name) {
        lessonCounts[row.student_name] = (lessonCounts[row.student_name] || 0) + 1;
      }
    }

    // Filter students with enough lessons
    const eligibleStudents = Object.entries(lessonCounts)
      .filter(([_, count]) => count >= minLessons)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20) // Top 20 by lesson count
      .map(([name]) => name);

    if (eligibleStudents.length === 0) {
      return new Response(
        JSON.stringify({ candidates: [], message: "לא נמצאו תלמידים עם מספיק שיעורים" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get recent transcripts for eligible students
    const { data: transcripts, error: transcriptsError } = await supabase
      .from("transcripts")
      .select("student_name, title, lesson_date, ai_summary, full_text")
      .in("student_name", eligibleStudents)
      .order("lesson_date", { ascending: false })
      .limit(100);

    if (transcriptsError) throw transcriptsError;

    // Group transcripts by student
    const transcriptsByStudent: Record<string, typeof transcripts> = {};
    for (const t of transcripts || []) {
      if (t.student_name) {
        if (!transcriptsByStudent[t.student_name]) {
          transcriptsByStudent[t.student_name] = [];
        }
        transcriptsByStudent[t.student_name].push(t);
      }
    }

    // Prepare context for Claude
    const studentSummaries = Object.entries(transcriptsByStudent)
      .map(([name, lessons]) => {
        const recentLessons = lessons.slice(0, 5);
        const summaries = recentLessons
          .map(l => `[${l.lesson_date || "?"}] ${l.ai_summary || l.title}`)
          .join("\n");
        return `תלמיד: ${name} (${lessonCounts[name]} שיעורים)\nשיעורים אחרונים:\n${summaries}`;
      })
      .join("\n\n---\n\n");

    // Ask Claude to analyze and find best testimonial candidates
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `אתה עוזר לענבל, מורה לפיתוח קולי, למצוא תלמידים מתאימים לבקש מהם חוות דעת (testimonial).

הנה מידע על התלמידים והשיעורים האחרונים שלהם:

${studentSummaries}

נתח את התלמידים ומצא את ${limit} התלמידים הכי מתאימים לבקש מהם חוות דעת, על סמך:
1. התקדמות משמעותית (שיפור נראה לעין)
2. משוב חיובי בשיעורים
3. התמדה (הרבה שיעורים)
4. סיפור מעניין או ייחודי
5. יכולת הבעה (מדברים טוב על החוויה)

לכל תלמיד, החלט גם איזה סוג חוות דעת הכי מתאים לו:
- video: תלמידים שמדברים טוב, בטוחים בעצמם, יכולים לתת עדות מרגשת
- google: תלמידים עסקיים/מקצועיים, יכתבו ביקורת טובה
- facebook: תלמידים צעירים/פעילים ברשתות
- website: תלמידים עם סיפור מעניין, טקסט ארוך

החזר JSON בפורמט הבא:
{
  "candidates": [
    {
      "studentName": "שם התלמיד",
      "reason": "למה התלמיד הזה מתאים לתת חוות דעת",
      "highlights": ["נקודה חזקה 1", "נקודה חזקה 2"],
      "suggestedPlatform": "video" | "google" | "facebook" | "website",
      "confidenceScore": 0-100
    }
  ]
}

החזר רק JSON תקין, ללא טקסט נוסף.`
        }
      ],
    });

    const aiResponse = response.content[0];
    if (aiResponse.type !== "text") {
      throw new Error("Unexpected AI response type");
    }

    // Parse JSON response
    let candidates: TestimonialCandidate[] = [];
    try {
      const parsed = JSON.parse(aiResponse.text);
      candidates = parsed.candidates.map((c: any) => ({
        ...c,
        lessonCount: lessonCounts[c.studentName] || 0,
        recentLessons: (transcriptsByStudent[c.studentName] || [])
          .slice(0, 3)
          .map(l => ({
            date: l.lesson_date || "לא ידוע",
            summary: l.ai_summary || l.title
          }))
      }));
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiResponse.text);
      throw new Error("Failed to parse AI response");
    }

    return new Response(
      JSON.stringify({ candidates }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error finding testimonial candidates:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
