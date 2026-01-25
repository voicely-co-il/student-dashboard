// Shared types for teacher-chat function

export type Intent =
  | "crm_add_student"
  | "crm_update_student"
  | "crm_search_student"
  | "calendar_add_event"
  | "calendar_view"
  | "transcript_search"
  | "lesson_plan"
  | "web_search"
  | "general_question"
  | "unknown";

export interface ClassifiedIntent {
  intent: Intent;
  entities: Record<string, string | undefined>;
  confidence: number;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
}

export interface Student {
  id: string;
  name: string;
  status: string;
  phone?: string;
}

export interface TranscriptResult {
  chunk_id: string;
  transcript_id: string;
  student_name: string;
  content: string;
  lesson_date: string;
  similarity: number;
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const SYSTEM_PROMPT = `אתה עוזר AI של Voicely, מערכת לניהול שיעורי קול ושירה.
את/ה מדבר/ת עברית ועוזר/ת למורה ענבל לנהל את התלמידים, השיעורים והתמלולים.

יכולות שלך:
1. **CRM (Notion)**: להוסיף תלמידים חדשים, לעדכן פרטים, לחפש תלמידים
2. **יומן (Google Calendar)**: לקבוע שיעורים, לראות זמינות
3. **תמלולים**: לחפש מידע בתמלולי שיעורים קודמים
4. **תכנון**: לעזור בתכנון שיעורים על בסיס היסטוריה

כשמבקשים ממך לבצע פעולה:
- שאל לאשר לפני פעולות שמשנות נתונים
- הצג סיכום של מה שאתה הולך לעשות
- דווח על הצלחה או כישלון

הנחיות:
- דבר בעברית טבעית וחמימה
- היה תמציתי אבל ידידותי
- אם חסר מידע - שאל
- אם לא בטוח - בקש אישור`;
