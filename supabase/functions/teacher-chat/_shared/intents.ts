// Intent classification using Gemini
import type { ClassifiedIntent, ConversationMessage } from "./types.ts";

export async function classifyIntent(
  message: string,
  history: ConversationMessage[]
): Promise<ClassifiedIntent> {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");

  const classificationPrompt = `You are classifying user intent for a voice teacher's assistant app.

Message: "${message}"

Recent conversation:
${history.slice(-3).map(m => `${m.role}: ${m.content}`).join("\n")}

Return JSON in this exact format:
{
  "intent": "crm_add_student" | "crm_update_student" | "crm_search_student" | "calendar_add_event" | "calendar_view" | "transcript_search" | "lesson_plan" | "web_search" | "general_question" | "unknown",
  "entities": {
    "student_name": "name of the student mentioned (e.g., Dana, Sarah Cohen)",
    "date": "date mentioned (e.g., tomorrow, מחר, 21/1, יום שני)",
    "time": "time mentioned (e.g., 15:00, 3pm, בשעה 10)",
    "phone": "phone number if mentioned",
    "search_query": "search terms if relevant",
    "lesson_type": "trial | one_on_one | group | null (detect from: שיעור ניסיון/trial, שיעור פרטי/1:1/אחד על אחד, קבוצה/קבוצתי/group)"
  },
  "confidence": 0.0-1.0
}

Important:
- Extract student_name from phrases like "lesson with Dana", "שיעור עם דנה", "for student X".
- lesson_type detection:
  - "trial" = שיעור ניסיון, trial lesson, ניסיון
  - "one_on_one" = שיעור פרטי, 1:1, אחד על אחד, פרטי
  - "group" = קבוצה, קבוצתי, group
  - null = not specified (need to ask)
- web_search: Use when user asks about general knowledge, techniques, methods, or anything that requires up-to-date information from the internet (e.g., "what is belting", "how to warm up voice", "מה זה head voice").
Return ONLY valid JSON, no markdown or extra text.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: classificationPrompt }] }],
          generationConfig: { maxOutputTokens: 500 },
        }),
      }
    );

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("Classification error:", error);
  }

  return { intent: "general_question", entities: {}, confidence: 0.5 };
}
