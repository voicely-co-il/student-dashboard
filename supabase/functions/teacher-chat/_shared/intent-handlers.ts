// Intent handlers - process each intent type
import type { ClassifiedIntent } from "./types.ts";
import { searchNotionCRM } from "./crm.ts";
import { getCalendarEvents, createCalendarEvent, parseHebrewDateTime } from "./calendar.ts";
import { searchTranscripts } from "./transcripts.ts";
import { searchWeb } from "./web-search.ts";

interface IntentResult {
  context: string;
  actions: any[];
}

export async function handleCrmAddStudent(intent: ClassifiedIntent): Promise<IntentResult> {
  const name = intent.entities.student_name;
  const actions: any[] = [];

  if (name) {
    actions.push({
      type: "crm_add",
      label: `הוספת ${name}`,
      status: "pending",
      data: { name, phone: intent.entities.phone },
    });
    return {
      context: `המשתמש רוצה להוסיף תלמיד בשם "${name}". שאל אם לאשר את ההוספה.`,
      actions,
    };
  }

  return {
    context: "המשתמש רוצה להוסיף תלמיד אבל לא ציין שם. בקש את שם התלמיד.",
    actions,
  };
}

export async function handleCrmSearchStudent(intent: ClassifiedIntent): Promise<IntentResult> {
  const query = intent.entities.student_name || intent.entities.search_query || "";

  if (query) {
    const students = await searchNotionCRM(query);
    if (students.length > 0) {
      return {
        context: `נמצאו ${students.length} תלמידים:\n${students
          .map((s) => `- ${s.name} (${s.status})`)
          .join("\n")}`,
        actions: [],
      };
    }
    return {
      context: `לא נמצאו תלמידים שמתאימים ל-"${query}"`,
      actions: [],
    };
  }

  return { context: "", actions: [] };
}

export async function handleTranscriptSearch(intent: ClassifiedIntent, message: string): Promise<IntentResult> {
  const searchQuery = intent.entities.search_query || message;
  const results = await searchTranscripts(searchQuery, 5);
  const actions: any[] = [];

  if (results.length > 0) {
    actions.push({
      type: "search_result",
      label: `${results.length} תוצאות`,
      status: "completed",
    });
    return {
      context: `נמצאו ${results.length} תוצאות רלוונטיות בתמלולים:\n${results
        .slice(0, 3)
        .map((r: any, i: number) => `${i + 1}. ${r.content?.slice(0, 150)}...`)
        .join("\n\n")}`,
      actions,
    };
  }

  return {
    context: "לא נמצאו תוצאות רלוונטיות בתמלולים.",
    actions,
  };
}

export async function handleCalendarAddEvent(intent: ClassifiedIntent): Promise<IntentResult> {
  const { student_name, date, time, lesson_type } = intent.entities;
  const actions: any[] = [];

  // Build list of missing information
  const missing: string[] = [];
  if (!student_name) missing.push("שם התלמיד/ה");
  if (!date && !time) missing.push("תאריך ושעה");
  if (!lesson_type) missing.push("סוג השיעור (ניסיון / פרטי 1:1 / קבוצה)");

  if (missing.length > 0) {
    const lessonTypeHebrew = lesson_type === "trial" ? "ניסיון" :
      lesson_type === "one_on_one" ? "פרטי" :
      lesson_type === "group" ? "קבוצתי" : null;

    let contextParts = [`המורה רוצה לקבוע שיעור`];
    if (student_name) contextParts.push(`עם ${student_name}`);
    if (lessonTypeHebrew) contextParts.push(`(${lessonTypeHebrew})`);
    if (date) contextParts.push(`בתאריך ${date}`);
    if (time) contextParts.push(`בשעה ${time}`);

    actions.push({ type: "calendar_add", label: "קביעת שיעור", status: "pending" });

    return {
      context: `${contextParts.join(" ")}.\n\nחסר: ${missing.join(", ")}.\n\nשאל בצורה טבעית וידידותית על הפרטים החסרים. אם חסר סוג שיעור, שאל: "איזה סוג שיעור? ניסיון, פרטי, או קבוצתי?"`,
      actions,
    };
  }

  // We have all the information - create the event
  const parsed = parseHebrewDateTime(date, time);

  if (parsed) {
    const lessonTypeHebrew = lesson_type === "trial" ? "ניסיון" :
      lesson_type === "one_on_one" ? "פרטי" : "קבוצתי";
    const title = `שיעור ${lessonTypeHebrew} - ${student_name}`;

    const result = await createCalendarEvent(
      title,
      parsed.startTime,
      parsed.endTime,
      `שיעור ${lessonTypeHebrew} עם ${student_name}`,
      lesson_type
    );

    if (result.success) {
      const eventDate = new Date(parsed.startTime);
      const formattedDate = eventDate.toLocaleDateString("he-IL", {
        weekday: "long", day: "numeric", month: "long",
      });
      const formattedTime = eventDate.toLocaleTimeString("he-IL", {
        hour: "2-digit", minute: "2-digit",
      });

      actions.push({
        type: "calendar_add",
        label: `שיעור ${lessonTypeHebrew} עם ${student_name}`,
        status: "completed",
      });

      return {
        context: `✅ פעולה הושלמה בהצלחה! שיעור ${lessonTypeHebrew} עם ${student_name} נקבע ליום ${formattedDate} בשעה ${formattedTime} והאירוע נוסף ליומן "${result.calendarName}". אשר את ההצלחה למשתמש.`,
        actions,
      };
    }

    actions.push({ type: "calendar_add", label: "קביעת שיעור", status: "failed" });
    return {
      context: `לא הצלחתי להוסיף את השיעור ליומן: ${result.error}`,
      actions,
    };
  }

  actions.push({ type: "calendar_add", label: "קביעת שיעור", status: "pending" });
  return {
    context: `לא הצלחתי לפענח את התאריך/שעה. בקש מהמורה תאריך ושעה מדויקים יותר.`,
    actions,
  };
}

export async function handleCalendarView(): Promise<IntentResult> {
  const events = await getCalendarEvents(7);

  if (events.length > 0) {
    const eventsList = events.map((e: any) => {
      const start = new Date(e.start);
      const formattedDate = start.toLocaleDateString("he-IL", {
        weekday: "short", day: "numeric", month: "short",
      });
      const formattedTime = start.toLocaleTimeString("he-IL", {
        hour: "2-digit", minute: "2-digit",
      });
      return `- ${formattedDate} ${formattedTime}: ${e.title}`;
    }).join("\n");

    return {
      context: `השיעורים הקרובים בשבוע הבא:\n${eventsList}`,
      actions: [],
    };
  }

  return {
    context: "אין שיעורים מתוכננים לשבוע הקרוב.",
    actions: [],
  };
}

export async function handleLessonPlan(intent: ClassifiedIntent): Promise<IntentResult> {
  const studentName = intent.entities.student_name;

  if (studentName) {
    const results = await searchTranscripts(studentName, 3);
    if (results.length > 0) {
      return {
        context: `נמצאו ${results.length} שיעורים קודמים של ${studentName}. השתמש בהם לתכנון.`,
        actions: [],
      };
    }
    return {
      context: `לא נמצאו שיעורים קודמים של ${studentName}.`,
      actions: [],
    };
  }

  return {
    context: "המשתמש רוצה לתכנן שיעור. שאל עבור איזה תלמיד.",
    actions: [],
  };
}

export async function handleWebSearch(intent: ClassifiedIntent, message: string): Promise<IntentResult> {
  const query = intent.entities.search_query || message;
  const webResult = await searchWeb(query);

  if (webResult) {
    return {
      context: webResult,
      actions: [{ type: "search_result", label: "חיפוש אינטרנט", status: "completed" }],
    };
  }

  return {
    context: "לא הצלחתי לחפש באינטרנט. אנסה לענות על בסיס הידע שלי.",
    actions: [],
  };
}
