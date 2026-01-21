import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Expert vocal coaching analysis - detailed insights
interface ExpertInsight {
  techniques_worked: Array<{
    technique: string;
    details: string;
    student_response: string;
  }>;
  exercises_performed: Array<{
    name: string;
    purpose: string;
    execution: string;
  }>;
  technical_progress: {
    improvements: string[];
    breakthroughs: string[];
    challenges_overcome: string[];
  };
  areas_to_work: Array<{
    area: string;
    current_level: string;
    specific_issues: string[];
    recommended_exercises: string[];
  }>;
  repertoire: Array<{
    song: string;
    artist: string;
    style: string;
    focus_areas: string[];
  }>;
  emotional_state: {
    motivation_level: string;
    energy: string;
    receptiveness: string;
    confidence: string;
  };
  specific_recommendations: {
    home_practice: string[];
    focus_next_lesson: string[];
    songs_to_explore: string[];
  };
  lesson_summary: string;
  teacher_notes_detected: string[];
}

// Basic insight format (for backward compatibility)
interface BasicInsight {
  key_topics: string[];
  skills_practiced: string[];
  student_mood: string;
  progress_notes: string;
  teacher_recommendations: string;
  action_items: string[];
}

// Expert analysis prompt
const EXPERT_PROMPT = `אתה מומחה לפדגוגיה ווקאלית עם ניסיון של 20 שנה בהוראת קול ושירה.
נתח את תמליל השיעור הבא וחלץ מידע מפורט על התקדמות התלמיד.

## הנחיות לניתוח:

### 1. טכניקות שנעבדו
זהה את הטכניקות הספציפיות:
- תמיכת נשימה (Breath Support / Appoggio)
- רזוננס (Resonance - mask, chest, head)
- רגיסטרים (Registration - chest/mix/head/passaggio)
- ויברטו, דינמיקה, דיקציה
- הרחבת טווח (Range Extension)

### 2. תרגילים שבוצעו
- Lip Trills, Humming, Sirens
- סקאלות, אינטרוולים
- תרגילי סגנון (riffs, runs)

### 3. התקדמות טכנית
- מה השתפר במהלך השיעור
- אירורקה moments
- התגברות על קשיים

### 4. אזורי עבודה
- מתחים (tension patterns)
- בעיות נשימה
- קשיים ברגיסטרים

### 5. רפרטואר - שירים שנעבדו

### 6. מצב רגשי - מוטיבציה, אנרגיה, ביטחון

### 7. המלצות ספציפיות
- תרגילים לבית
- מיקוד לשיעור הבא
- שירים מומלצים

---

תמליל השיעור של STUDENT_NAME:
TRANSCRIPT_TEXT

---

החזר JSON בלבד בפורמט:
{
  "techniques_worked": [
    {"technique": "שם הטכניקה", "details": "פירוט", "student_response": "תגובת התלמיד"}
  ],
  "exercises_performed": [
    {"name": "שם התרגיל", "purpose": "מטרה", "execution": "טוב/בינוני/צריך עבודה"}
  ],
  "technical_progress": {
    "improvements": ["שיפור"],
    "breakthroughs": ["פריצת דרך"],
    "challenges_overcome": ["אתגר שהתגברו עליו"]
  },
  "areas_to_work": [
    {"area": "אזור", "current_level": "1-5", "specific_issues": ["בעיה"], "recommended_exercises": ["תרגיל"]}
  ],
  "repertoire": [
    {"song": "שיר", "artist": "אמן", "style": "סגנון", "focus_areas": ["מיקוד"]}
  ],
  "emotional_state": {
    "motivation_level": "גבוהה/בינונית/נמוכה",
    "energy": "גבוהה/בינונית/נמוכה",
    "receptiveness": "גבוהה/בינונית/נמוכה",
    "confidence": "גבוה/בינוני/נמוך"
  },
  "specific_recommendations": {
    "home_practice": ["תרגיל לבית"],
    "focus_next_lesson": ["מיקוד"],
    "songs_to_explore": ["שיר מומלץ"]
  },
  "lesson_summary": "סיכום קצר",
  "teacher_notes_detected": ["הערות מהמורה"]
}`;

// Quick analysis prompt (for batch processing - cheaper)
const QUICK_PROMPT = `אתה מומחה לפיתוח קול. נתח בקצרה את תמליל השיעור.

תמליל השיעור של STUDENT_NAME:
TRANSCRIPT_TEXT

החזר JSON בלבד:
{
  "key_topics": ["3 נושאים עיקריים"],
  "skills_practiced": ["3 מיומנויות שנעבדו"],
  "student_mood": "מילה אחת - מצב רוח (מלא מוטיבציה/רגוע/מתוסכל/נלהב/מרוכז)",
  "progress_notes": "משפט אחד על התקדמות",
  "teacher_recommendations": "המלצה עיקרית מהשיעור",
  "action_items": ["2 פעולות לביצוע"]
}

הנחיות:
- נושאים: נשימה סרעפתית, רזוננס, טווח, ויברטו, תמיכה, דיקציה, פאסאג'ו
- מיומנויות: סקאלות, Lip Trills, נשימה, הקרנה, דינמיקה, מעברים
- אם אין מידע מספיק, כתוב "לא צוין"`;

// Extract insights using Gemini
async function extractInsights(
  transcriptText: string,
  studentName: string,
  useExpertMode: boolean = false
): Promise<BasicInsight | ExpertInsight> {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const prompt = useExpertMode ? EXPERT_PROMPT : QUICK_PROMPT;
  const finalPrompt = prompt
    .replace("STUDENT_NAME", studentName)
    .replace("TRANSCRIPT_TEXT", transcriptText.slice(0, useExpertMode ? 12000 : 6000));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: finalPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: useExpertMode ? 2048 : 1024,
        },
      }),
    }
  );

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("Failed to extract JSON from:", text.slice(0, 200));
    return getDefaultInsight(useExpertMode);
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    console.error("Failed to parse JSON:", jsonMatch[0].slice(0, 200));
    return getDefaultInsight(useExpertMode);
  }
}

function getDefaultInsight(expert: boolean): BasicInsight {
  return {
    key_topics: ["לא צוין"],
    skills_practiced: ["לא צוין"],
    student_mood: "לא צוין",
    progress_notes: "לא ניתן לחלץ מידע",
    teacher_recommendations: "לא צוין",
    action_items: [],
  };
}

// Convert expert insight to basic format for storage
function expertToBasic(expert: ExpertInsight): BasicInsight {
  return {
    key_topics: expert.techniques_worked?.map(t => t.technique) || ["לא צוין"],
    skills_practiced: expert.exercises_performed?.map(e => e.name) || ["לא צוין"],
    student_mood: expert.emotional_state?.motivation_level || "לא צוין",
    progress_notes: expert.lesson_summary || "לא צוין",
    teacher_recommendations: expert.specific_recommendations?.focus_next_lesson?.join(", ") || "לא צוין",
    action_items: expert.specific_recommendations?.home_practice || [],
  };
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
    const {
      limit = 50,
      offset = 0,
      expert_mode = false,  // Use expert analysis (more detailed, costs more)
      student_id = null     // Optional: process specific student only
    } = await req.json().catch(() => ({}));

    // Build query
    let query = supabase
      .from("transcripts")
      .select("id, title, full_text, student_name, ai_summary, lesson_date")
      .not("full_text", "is", null)
      .order("created_at", { ascending: false });

    if (student_id) {
      query = query.eq("student_name", student_id);
    }

    const { data: transcripts, error: fetchError } = await query.range(offset, offset + limit - 1);

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

    console.log(`Processing ${toProcess.length} transcripts (expert_mode: ${expert_mode}, offset: ${offset})`);

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

        const rawInsight = await extractInsights(
          textToAnalyze,
          transcript.student_name || "תלמיד",
          expert_mode
        );

        // Convert to basic format if needed
        const insight = expert_mode && 'techniques_worked' in rawInsight
          ? expertToBasic(rawInsight as ExpertInsight)
          : rawInsight as BasicInsight;

        // Insert insights
        const { error: insertError } = await supabase
          .from("transcript_insights")
          .insert({
            transcript_id: transcript.id,
            key_topics: insight.key_topics,
            skills_practiced: insight.skills_practiced,
            student_mood: insight.student_mood,
            progress_notes: insight.progress_notes,
            teacher_recommendations: insight.teacher_recommendations,
            action_items: insight.action_items,
            raw_ai_response: rawInsight, // Store full expert response
          });

        if (insertError) {
          console.error(`Failed to insert insights for ${transcript.id}:`, insertError);
          errors++;
        } else {
          processed++;
          console.log(`✓ ${transcript.id}: ${transcript.student_name} (${insight.key_topics.slice(0, 2).join(", ")})`);
        }

        // Delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, expert_mode ? 500 : 200));
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
        expert_mode,
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
