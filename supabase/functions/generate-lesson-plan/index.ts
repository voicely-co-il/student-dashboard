import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.24.0";
import OpenAI from "https://esm.sh/openai@4.28.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { studentId, lessonsToInclude = 5, customInstructions } = await req.json();

    if (!studentId) {
      return new Response(JSON.stringify({ error: "studentId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const openai = new OpenAI({ apiKey: openaiKey });

    // Get student info
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select(`
        id,
        level,
        goals,
        tags,
        profiles!inner(full_name)
      `)
      .eq("id", studentId)
      .single();

    if (studentError || !student) {
      throw new Error("Student not found");
    }

    // Get recent transcripts with context
    const { data: recentContext } = await supabase.rpc(
      "get_student_transcript_context",
      {
        p_student_id: studentId,
        p_limit: lessonsToInclude,
      }
    );

    // Get full transcript content for the most recent lessons
    const { data: recentTranscripts } = await supabase
      .from("transcripts")
      .select("title, full_text, ai_summary, lesson_date")
      .eq("student_id", studentId)
      .order("lesson_date", { ascending: false })
      .limit(lessonsToInclude);

    // Prepare context for AI
    const lessonsContext = recentTranscripts
      ?.map(
        (t) => `
### שיעור: ${t.title}
תאריך: ${t.lesson_date ? new Date(t.lesson_date).toLocaleDateString("he-IL") : "לא ידוע"}
${t.ai_summary || t.full_text?.substring(0, 2000) || "אין תוכן"}
`
      )
      .join("\n---\n");

    // Generate lesson plan with Claude
    const prompt = `אתה מורה לפיתוח קולי מנוסה. בהתבסס על היסטוריית השיעורים של התלמיד/ה, צור תוכנית לימודים מותאמת אישית.

## פרטי התלמיד/ה:
- שם: ${(student as any).profiles?.full_name || "לא ידוע"}
- רמה: ${student.level || "לא מוגדר"}
- מטרות: ${student.goals || "לא מוגדר"}
- תגיות: ${student.tags?.join(", ") || "אין"}

## שיעורים אחרונים:
${lessonsContext || "אין היסטוריה זמינה"}

${customInstructions ? `## הנחיות נוספות מהמורה:\n${customInstructions}` : ""}

## צור תוכנית לימודים הכוללת:

1. **סיכום התקדמות** - מה השתפר? מה עדיין דורש עבודה?

2. **מטרות לשיעור הבא** - 2-3 מטרות ספציפיות ומדידות

3. **תרגילים מומלצים** - 3-4 תרגילים עם הסברים קצרים:
   - תרגילי חימום
   - תרגילי טכניקה
   - תרגילי שירים/רפרטואר

4. **נקודות להתמקדות** - מה לשים לב אליו במיוחד

5. **שיעורי בית** - תרגול לבין השיעורים

כתוב בעברית, בצורה ידידותית ומקצועית.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const lessonPlan =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Save the generated plan
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week

    const { data: savedPlan, error: saveError } = await supabase
      .from("weekly_plans")
      .upsert(
        {
          student_id: studentId,
          week_start: weekStart.toISOString().split("T")[0],
          goals: [lessonPlan], // Store the full plan in goals for now
          exercises: {
            generated_at: new Date().toISOString(),
            lessons_analyzed: lessonsToInclude,
            custom_instructions: customInstructions,
          },
        },
        {
          onConflict: "student_id,week_start",
        }
      )
      .select()
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        lessonPlan,
        student: {
          name: (student as any).profiles?.full_name,
          level: student.level,
        },
        lessonsAnalyzed: recentTranscripts?.length || 0,
        savedPlanId: savedPlan?.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating lesson plan:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
