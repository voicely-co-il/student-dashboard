// Shared types for teacher chat hooks
import type { ChatMessageData, ChatAction } from "@/components/chat/ChatMessage";

export interface UseChatOptions {
  teacherId?: string;
  projectId?: string | null;
  projectSystemPrompt?: string | null;
}

export interface UseTeacherChatReturn {
  messages: ChatMessageData[];
  isLoading: boolean;
  isLoadingSession: boolean;
  sessionId: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  switchSession: (sessionId: string) => Promise<void>;
  createNewSession: () => Promise<string | null>;
}

export interface SessionData {
  id: string;
  title: string | null;
  messages: any[];
  message_count: number;
}

// Session persistence - how long to keep a session active (24 hours)
export const SESSION_MAX_AGE_HOURS = 24;

// Generate title from first user message (truncate to 40 chars)
export const generateTitle = (message: string): string => {
  const cleaned = message.replace(/\n/g, " ").trim();
  return cleaned.length > 40 ? cleaned.substring(0, 40) + "..." : cleaned;
};

// Create welcome message
export const createWelcomeMessage = (teacherName: string = "ענבל"): ChatMessageData => ({
  id: "welcome",
  role: "assistant",
  content: `שלום ${teacherName}! 👋

אני כאן כדי לעזור לך לנהל את התלמידים והשיעורים שלך.

אפשר לבקש ממני:
• להוסיף או לעדכן תלמידים ב-CRM
• לקבוע שיעורים ביומן
• לחפש מידע בתמלולי השיעורים
• לתכנן שיעורים על בסיס ההיסטוריה

מה תרצי לעשות?`,
  timestamp: new Date(),
});

// Parse session messages from DB format to ChatMessageData
export const parseSessionMessages = (
  sessionMessages: any[],
  teacherName: string,
  addWelcomeBack = true
): ChatMessageData[] => {
  const parsedMessages: ChatMessageData[] = sessionMessages.map((m: any) => ({
    id: m.id || `msg-${Date.now()}-${Math.random()}`,
    role: m.role,
    content: m.content,
    timestamp: new Date(m.timestamp),
    actions: m.actions,
  }));

  if (addWelcomeBack && parsedMessages.length > 0) {
    parsedMessages.push({
      id: "welcome-back",
      role: "assistant",
      content: `ברוכה שובך ${teacherName}! 👋\nהמשכנו מאיפה שעצרנו. מה תרצי לעשות?`,
      timestamp: new Date(),
    });
  }

  return parsedMessages;
};

export type { ChatMessageData, ChatAction };
