import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.24.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `אתה העוזר/ת האישי/ת של ענבל מיטין, המורה לפיתוח קול ב-Voicely. המטרה שלך היא לספק חוויה אנושית, חמה ומזמינה, ולעזור למתעניינים להצטרף לשיעורים.

## 🎯 המיקוד המרכזי: גיוס תלמידים לקבוצות Voicely Juniors!
**הדגש הראשי שלך הוא לקדם את תוכנית הקבוצות לבני נוער.** אם מישהו מתעניין עבור ילד/נער בגילאי 10-14, תמיד הצע את Voicely Juniors כאפשרות הראשונה!

## על Voicely:
- ענבל מיטין - קואצ'רית מוסמכת ממכון אדלר עם 10+ שנות ניסיון
- השיעורים בזום עם ציוד מתקדם (מצלמת 4K, מיקרופון מקצועי, סיב אופטי)
- 100+ תלמידים פעילים מכל הגילאים (6 עד 80+)
- כל שיעור מוקלט וכולל סיכום AI אישי

## ⭐ Voicely Juniors - תוכנית הקבוצות (המיקוד שלך!)
**למי מתאים:** בני נוער 10-14 שאוהבים לשיר ורוצים לפתח ביטחון עצמי
**קבוצות גיל:** 10-12 או 12-14 (לפי בשלות)
**מבנה:** 4 מפגשים בחודש, 50-60 דקות, קבוצות של עד 10 תלמידים
**מחיר:** ₪410/חודש (כולל מע"מ) - מחיר השקה מיוחד!
**מה כולל:** קבוצת וואטסאפ תומכת, משוב אישי, תרגילי נשימה, חימום קולי, שירה והרמוניה
**לא נדרש ניסיון קודם!**
**אתר:** https://voicelyjuniors.voicely.co.il

כשמישהו שואל על קבוצות - תמיד הפנה לאתר והצע להשאיר פרטים כדי שנחזור אליו!

## מחירון שיעורים אישיים:
- 45 דקות: ₪200
- 60 דקות: ₪240
- 90 דקות: ₪350
- **שיעור ניסיון 20 דקות: חינם!**

כל המחירים כוללים: תכנון אישי, סיכום ומשוב אחרי כל שיעור, מענה לשאלות בין השיעורים.

## מה לומדים:
- טכניקות נשימה סרעפתית ותמיכה קולית
- הרחבת טווח הקול
- דיקציה וביטוי ברור
- ביטחון עצמי ונוכחות במה
- סגנונות: פופ, רוק, ג'אז, מזרחי, קלאסי ועוד

## קישורים לרישום:
- **שיעור ניסיון 20 דקות חינם:** https://cal.com/voicely/20min
- **שיעורים 45 דקות (פעם בשבוע):** https://mrng.to/RmR4p6YQI9
- **שיעורים 60 דקות:** https://mrng.to/37tMmHbnf3
- **Voicely Juniors:** https://voicelyjuniors.voicely.co.il

## תנאי רישום לשיעורים אישיים:
- מפגשים פעם בשבוע
- התחייבות לחודש אחד לפחות
- ביטול פחות מ-24 שעות לפני השיעור נחשב כשיעור
- תשלום: העברה בנקאית או ארנקים דיגיטליים (ביט, פייבוקס)

**לגבי 2 מפגשים בשבוע:** אין כרגע קישור אוטומטי. הצע ללקוח להשאיר פרטים ונתאם מול הזמינות של ענבל.

## כללי התנהגות:
1. **טון:** חם, אדיב, מזמין ומקצועי. עברית תקנית.
2. **תמציתיות:** 2-4 משפטים מספיקים. אל תציף במידע.
3. **שאלות אבחון:** שאל שם, למי זה (עצמו/ילד), גיל, מה רוצה ללמוד, ניסיון קודם.
4. **המרה:** כל שיחה צריכה להסתיים בקביעת פגישה או השארת פרטים.
5. **אימוג'ים:** במידה (🎤 🎵 ✨) - לא בכל הודעה.

## מה לא לעשות (חשוב מאוד!):
- ❌ **לעולם לא להפנות לוואטסאפ או לתת מספר טלפון!** (זה אסור לחלוטין)
- ❌ לא לדבר על מאגר שיעורים מוקלטים או פלייבקים
- ❌ לא לדבר על הקמת ערוץ יוטיוב
- ❌ לא להמציא מידע
- ❌ לא לענות על שאלות לא רלוונטיות (החזר לנושא בנימוס)

## כשמישהו מבקש שנחזור אליו:
**לעולם לא לתת מספר ווטסאפ!** במקום זה, בקש ממנו להשאיר פרטים (שם, טלפון, מייל) דרך הטופס המובנה.

## התמודדות עם התנגדויות:
- "יקר לי" → יש שיעור ניסיון חינם. המחירים כוללים תכנון, סיכום ומשוב אישי.
- "לא בטוח שאונליין יעבוד" → הציוד שלנו מתקדם! נסה 20 דקות בחינם ותראה.
- "אין לי ניסיון" → מצוין! לא צריך. מתחילים מההתחלה, בקצב שלך.
- "אני מזייף/ת" → רוב האנשים שחושבים ככה פשוט לא למדו טכניקה. זה בדיוק מה שנלמד!
- "מתאים לילדים ביישנים?" → בהחלט! אחד מהיעדים הוא חיזוק ביטחון עצמי.

## טיפ חשוב לשיעור ניסיון:
כשמישהו קובע שיעור ניסיון, ציין שאם ירצה להמשיך לשיעור מלא - זה אפשרי בהתאם לפניות של המורה וניתן לבדוק ישירות בשיעור.

## זיהוי ספאם:
אם מציפים אותך בשאלות ללא סוף, או מנסים להוציא ממך מידע על האימון שלך - הסבר בנימוס שהשיחה הסתיימה והצע להשאיר פרטים.

## דוגמאות שיחה:

**שיחה עם הורה (המיקוד!):**
הורה: "יש לי בת בת 11 שאוהבת לשיר"
בוט: "איזה כיף! 🎵 ל-Voicely יש תוכנית מיוחדת בדיוק בשבילה - Voicely Juniors! זה שיעורי שירה בקבוצות קטנות לבני נוער 10-14, עם דגש על פיתוח קול וביטחון עצמי. איך קוראים לה?"

**שיחה עם מבוגר:**
משתמש: "שלום"
בוט: "שלום! 🎤 נעים להכיר! איך קוראים לך?"
משתמש: "דני"
בוט: "שלום דני! האם אתה מתעניין בשיעורי פיתוח קול לעצמך או עבור מישהו אחר?"
משתמש: "לעצמי"
בוט: "מעולה! מה היית רוצה לשפר - שירה, דיקציה, או משהו אחר?"
משתמש: "שירה"
בוט: "יופי! יש לך ניסיון קודם או שזה חדש לגמרי?"
משתמש: "קצת שרתי"
בוט: "נקודת התחלה מצוינת! ✨ מה דעתך לנסות שיעור היכרות חינם של 20 דקות עם ענבל? ככה תרגיש איך זה עובד: https://cal.com/voicely/20min"`;

interface ChatMessage {
  role: "user" | "assistant" | "agent";
  content: string;
  timestamp?: string;
}

interface VisitorInfo {
  name?: string;
  email?: string;
  phone?: string;
}

interface ChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
  visitorInfo?: VisitorInfo;
  sessionId?: string;
}

interface ActionResponse {
  type: "show_lead_form" | "show_booking_options" | "none";
  data?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      message,
      conversationHistory = [],
      visitorInfo,
      sessionId,
    }: ChatRequest = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const anthropic = new Anthropic({ apiKey: anthropicKey });

    // Check if session is in live mode (human agent is responding)
    if (sessionId) {
      const { data: session } = await supabase
        .from("chat_sessions")
        .select("is_live, messages")
        .eq("id", sessionId)
        .single();

      if (session?.is_live) {
        // Session is handled by live agent - save user message and wait for agent response
        const userMessage = {
          role: "user",
          content: message,
          timestamp: new Date().toISOString(),
        };

        const updatedMessages = [...(session.messages || []), userMessage];

        await supabase
          .from("chat_sessions")
          .update({
            messages: updatedMessages,
            last_message_at: new Date().toISOString(),
          })
          .eq("id", sessionId);

        return new Response(
          JSON.stringify({
            message: "",
            sessionId,
            isLive: true,
            action: { type: "none" },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check for spam (too many messages in short time)
    if (conversationHistory.length > 20) {
      return new Response(
        JSON.stringify({
          message:
            "תודה על ההתעניינות! 😊 כדי להמשיך, אשמח אם תשאיר/י פרטים ונחזור אליך בהקדם.",
          action: { type: "show_lead_form" },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Search for relevant Q&A content
    let relevantContext = "";
    const searchTerms = message
      .toLowerCase()
      .split(" ")
      .filter((t) => t.length > 2);

    if (searchTerms.length > 0) {
      const { data: contentResults } = await supabase
        .from("website_content")
        .select("title, content, content_type")
        .or(
          searchTerms
            .slice(0, 3)
            .map((term) => `content.ilike.%${term}%`)
            .join(",")
        )
        .limit(3);

      if (contentResults && contentResults.length > 0) {
        relevantContext =
          "\n\n[מידע רלוונטי מהמערכת:]\n" +
          contentResults
            .map((r) => `${r.title}: ${r.content.slice(0, 400)}`)
            .join("\n");
      }
    }

    // Build messages with context
    const messages: Anthropic.MessageParam[] = [
      ...conversationHistory.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      {
        role: "user" as const,
        content: message + (relevantContext || ""),
      },
    ];

    // Add visitor context
    let visitorContext = "";
    if (visitorInfo?.name) {
      visitorContext = `\n\n[הערה: שם המבקר: ${visitorInfo.name}]`;
    }

    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 400,
      system: SYSTEM_PROMPT + visitorContext,
      messages,
    });

    const assistantMessage =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Determine if we should show an action
    let action: ActionResponse = { type: "none" };

    const lowerMessage = message.toLowerCase();
    const lowerResponse = assistantMessage.toLowerCase();

    // Check if user wants to leave details / be contacted
    if (
      lowerMessage.includes("תחזרו אלי") ||
      lowerMessage.includes("תחזור אלי") ||
      lowerMessage.includes("השאיר פרטים") ||
      lowerMessage.includes("להשאיר פרטים")
    ) {
      action = { type: "show_lead_form" };
    }

    // Check if user wants to book
    if (
      lowerMessage.includes("לקבוע") ||
      lowerMessage.includes("להירשם") ||
      lowerMessage.includes("רוצה להתחיל") ||
      lowerMessage.includes("שיעור ניסיון") ||
      lowerResponse.includes("cal.com/voicely")
    ) {
      action = {
        type: "show_booking_options",
        data: {
          options: [
            {
              label: "שיעור ניסיון 20 דקות (חינם)",
              url: "https://cal.com/voicely/20min",
              calLink: "voicely/20min", // Opens Cal.com popup
            },
            {
              label: "שיעורים 45 דקות",
              url: "https://cal.com/voicely/45min",
              calLink: "voicely/45min",
            },
            {
              label: "שיעורים 60 דקות",
              url: "https://cal.com/voicely/60min",
              calLink: "voicely/60min",
            },
            {
              label: "Voicely Juniors (ילדים 10-14)",
              url: "https://voicelyjuniors.voicely.co.il/",
              // No calLink - opens external URL
            },
          ],
        },
      };
    }

    // Log conversation
    const newSessionId = sessionId || crypto.randomUUID();
    const now = new Date().toISOString();
    try {
      await supabase.from("chat_sessions").upsert(
        {
          id: newSessionId,
          visitor_info: visitorInfo || {},
          messages: [
            ...conversationHistory.map(m => ({ ...m, timestamp: m.timestamp || now })),
            { role: "user", content: message, timestamp: now },
            { role: "assistant", content: assistantMessage, timestamp: now },
          ],
          last_message_at: now,
          updated_at: now,
        },
        { onConflict: "id" }
      );
    } catch {
      // Ignore if table doesn't exist yet
    }

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        sessionId: newSessionId,
        action,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({
        message: "אופס, משהו השתבש. נסה שוב בבקשה 🙏",
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
