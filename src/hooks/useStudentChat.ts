import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ChatMessageData, ChatAction } from "@/components/chat/ChatMessage";

export function useStudentChat() {
  const { user, profile } = useAuth();
  const studentName = profile?.name || "תלמיד/ה";

  const [messages, setMessages] = useState<ChatMessageData[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `שלום ${studentName}! 👋

אני כאן כדי לעזור לך בלמידת הקול והשירה.

אפשר לשאול אותי:
• שאלות על טכניקות קול ושירה
• מה עבדנו בשיעורים האחרונים
• עצות לתרגול ושיפור

מה תרצה לדעת?`,
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!user?.id) {
        console.error("No user ID");
        return;
      }

      // Add user message
      const userMessage: ChatMessageData = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const { data, error } = await supabase.functions.invoke("student-chat", {
          body: {
            message: content,
            studentId: user.id,
            studentName: studentName,
            conversationHistory: messages.slice(-10).map((m) => ({
              role: m.role,
              content: m.content,
            })),
          },
        });

        if (error) {
          throw error;
        }

        const actions: ChatAction[] = [];
        if (data.hasContext) {
          actions.push({
            type: "search_result",
            label: data.questionType === "personal" ? "מהשיעורים שלך" : "מידע מקצועי",
            status: "completed",
          });
        }

        const assistantMessage: ChatMessageData = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.response || "מצטער, לא הצלחתי לעבד את הבקשה.",
          timestamp: new Date(),
          actions: actions.length > 0 ? actions : undefined,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        console.error("Chat error:", error);

        const errorMessage: ChatMessageData = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "מצטער, נתקלתי בבעיה. אנא נסה שוב.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id, studentName, messages]
  );

  const clearHistory = useCallback(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "שיחה חדשה התחילה. במה אוכל לעזור?",
        timestamp: new Date(),
      },
    ]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearHistory,
  };
}
