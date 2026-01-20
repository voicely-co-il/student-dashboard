import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.24.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GeneratedRequest {
  message: string;
  subject?: string;
  platform: string;
  tone: string;
  personalDetails: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      studentName,
      platform = "whatsapp",
      tone = "warm",
      includeSpecificMoments = true
    } = await req.json();

    if (!studentName) {
      return new Response(
        JSON.stringify({ error: "studentName is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const anthropic = new Anthropic({ apiKey: anthropicKey });

    // Get student's transcripts for context
    const { data: transcripts, error: transcriptsError } = await supabase
      .from("transcripts")
      .select("title, lesson_date, ai_summary, full_text")
      .eq("student_name", studentName)
      .order("lesson_date", { ascending: false })
      .limit(10);

    if (transcriptsError) throw transcriptsError;

    if (!transcripts || transcripts.length === 0) {
      return new Response(
        JSON.stringify({ error: "לא נמצאו שיעורים לתלמיד זה" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build context from transcripts
    const lessonsContext = transcripts
      .map(t => {
        let content = `[${t.lesson_date || "?"}] ${t.title}`;
        if (t.ai_summary) content += `\nסיכום: ${t.ai_summary}`;
        // Include some full text for specific moments
        if (includeSpecificMoments && t.full_text) {
          const snippet = t.full_text.substring(0, 1000);
          content += `\nקטע מהשיעור: ${snippet}...`;
        }
        return content;
      })
      .join("\n\n---\n\n");

    const platformInstructions: Record<string, string> = {
      whatsapp: `הודעת וואטסאפ אישית וחמה. קצרה אבל לבבית. ניתן להשתמש באימוג'ים באופן מתון.`,
      email: `מייל עם נושא ותוכן. יותר פורמלי אבל עדיין אישי. כולל שורת נושא.`,
      video: `בקשה להקליט סרטון וידאו קצר (30-60 שניות). הסבר מה לכלול, תן נקודות לדבר עליהן.`,
      google: `בקשה להשאיר ביקורת בגוגל. כולל קישור ישיר והסבר פשוט איך לעשות את זה.`,
      facebook: `בקשה לכתוב פוסט או תגובה בפייסבוק. טון צעיר ואנרגטי.`
    };

    const toneInstructions: Record<string, string> = {
      warm: "חם ואישי, כמו חברה טובה",
      professional: "מקצועי ומכבד",
      playful: "שובב וקליל עם הומור",
      grateful: "מודה ומעריך, מרגש"
    };

    // Generate personalized testimonial request
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `את ענבל, מורה לפיתוח קולי עם שיטה ייחודית. את רוצה לבקש מ${studentName} חוות דעת.

הנה מידע על השיעורים שלכם יחד:
${lessonsContext}

כתבי בקשה לחוות דעת ב${platform === "whatsapp" ? "וואטסאפ" : platform}.

הנחיות:
- פלטפורמה: ${platformInstructions[platform] || platformInstructions.whatsapp}
- טון: ${toneInstructions[tone] || toneInstructions.warm}
- חובה להזכיר רגעים ספציפיים מהשיעורים (השתמשי במידע מעל)
- הבקשה צריכה להרגיש אותנטית ואישית, לא גנרית
- ${platform === "video" ? "עדיפות לוידאו - הדגישי את זה" : ""}

${platform === "video" ? `
אם מבקשים וידאו, תני נקודות מנחות:
1. מה היה לפני (האתגר/הקושי)
2. מה השתנה (ההתקדמות)
3. איך זה משפיע על החיים
4. מה ייחודי בשיטה/בחוויה
` : ""}

החזירי JSON בפורמט:
{
  "message": "ההודעה המלאה",
  ${platform === "email" ? '"subject": "נושא המייל",' : ""}
  "platform": "${platform}",
  "tone": "${tone}",
  "personalDetails": ["פרט אישי 1 שהוזכר", "פרט 2", "..."]
}

החזירי רק JSON תקין, ללא טקסט נוסף.`
        }
      ],
    });

    const aiResponse = response.content[0];
    if (aiResponse.type !== "text") {
      throw new Error("Unexpected AI response type");
    }

    // Parse JSON response
    let generatedRequest: GeneratedRequest;
    try {
      generatedRequest = JSON.parse(aiResponse.text);
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiResponse.text);
      throw new Error("Failed to parse AI response");
    }

    return new Response(
      JSON.stringify({
        request: generatedRequest,
        studentName,
        lessonsCount: transcripts.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating testimonial request:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
