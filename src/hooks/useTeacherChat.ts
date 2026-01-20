import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ChatMessageData, ChatAction } from "@/components/chat/ChatMessage";

interface UseChatOptions {
  teacherId?: string;
}

export function useTeacherChat({ teacherId }: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessageData[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `שלום ענבל! 👋

אני כאן כדי לעזור לך לנהל את התלמידים והשיעורים שלך.

אפשר לבקש ממני:
• להוסיף או לעדכן תלמידים ב-CRM
• לקבוע שיעורים ביומן
• לחפש מידע בתמלולי השיעורים
• לתכנן שיעורים על בסיס ההיסטוריה

מה תרצי לעשות?`,
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(
    async (content: string) => {
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
        // Call the edge function
        const { data, error } = await supabase.functions.invoke("teacher-chat", {
          body: {
            message: content,
            teacherId,
            conversationHistory: messages.slice(-10).map((m) => ({
              role: m.role,
              content: m.content,
            })),
          },
        });

        if (error) {
          throw error;
        }

        // Parse response
        const assistantMessage: ChatMessageData = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.response || "מצטער, לא הצלחתי לעבד את הבקשה.",
          timestamp: new Date(),
          actions: data.actions as ChatAction[] | undefined,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        console.error("Chat error:", error);

        // Add error message
        const errorMessage: ChatMessageData = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "מצטער, נתקלתי בבעיה. אנא נסי שוב.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [teacherId, messages]
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
