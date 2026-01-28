import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  transcript: string;
  studentName?: string;
  studentId?: string;
  previousLessonSummary?: string;
  lessonGoals?: string[];
  teacherPreferences?: string;
}

const SYSTEM_PROMPT = `אתה עוזר AI למורה לשירה/פיתוח קולי במהלך שיעור חי.
תפקידך לנתח את מה שקורה בשיעור בזמן אמת ולהציע טיפים קצרים וישימים למורה.

סוגי טיפים שאתה יכול להציע:
1. 🎵 טכני - הערות על טכניקה קולית, נשימה, תמיכה, רזוננס
2. 💡 הצעה - רעיונות לתרגילים או גישות אלטרנטיביות
3. 📝 הקשר - מידע רלוונטי משיעורים קודמים או מטרות התלמיד

כללים:
- תן 1-3 טיפים קצרים ומעשיים
- התמקד במה שרלוונטי עכשיו לשיעור
- אל תחזור על טיפים שכבר נתת
- שמור על טון חיובי ומעודד
- כתוב בעברית
- כל טיפ צריך להיות משפט אחד או שניים מקסימום

פורמט תשובה (JSON בלבד, בלי טקסט נוסף):
{
  "tips": [
    { "type": "technical", "text": "הטיפ כאן" }
  ]
}`;

// Call Anthropic Claude API
async function callClaude(userMessage: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  return result.content[0]?.text || "";
}

// Call OpenAI API (GPT-4.1-mini - newest model, good Hebrew support)
async function callOpenAI(userMessage: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      max_tokens: 500,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  return result.choices[0]?.message?.content || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { transcript, studentName, previousLessonSummary, lessonGoals, teacherPreferences } = body;

    if (!transcript || transcript.length < 50) {
      return new Response(
        JSON.stringify({ tips: [], reason: "transcript too short" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build user message
    let userMessage = `## תמלול השיעור הנוכחי:\n${transcript}\n\n`;

    if (studentName) {
      userMessage += `## תלמיד: ${studentName}\n\n`;
    }

    if (previousLessonSummary) {
      userMessage += `## סיכום שיעורים קודמים:\n${previousLessonSummary}\n\n`;
    }

    if (lessonGoals && lessonGoals.length > 0) {
      userMessage += `## מטרות השיעור:\n${lessonGoals.map(g => `- ${g}`).join('\n')}\n\n`;
    }

    if (teacherPreferences) {
      userMessage += `## העדפות המורה:\n${teacherPreferences}\n\n`;
    }

    userMessage += `נתח את השיעור והצע טיפים רלוונטיים למורה. החזר JSON בלבד.`;

    // Choose API based on available keys
    let content: string;
    let provider: string;

    if (ANTHROPIC_API_KEY) {
      content = await callClaude(userMessage);
      provider = "claude";
    } else if (OPENAI_API_KEY) {
      content = await callOpenAI(userMessage);
      provider = "openai";
    } else {
      throw new Error("No API key configured (ANTHROPIC_API_KEY or OPENAI_API_KEY)");
    }

    // Parse JSON from response
    let tips: { type: string; text: string }[] = [];
    try {
      const jsonMatch = content.match(/\{[\s\S]*"tips"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        tips = parsed.tips || [];
      }
    } catch (e) {
      console.error("Failed to parse tips JSON:", e, content);
      if (content.trim()) {
        tips = [{ type: "suggestion", text: content.trim().slice(0, 200) }];
      }
    }

    return new Response(
      JSON.stringify({ tips, provider, raw: content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message, tips: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
