// Message handling for teacher chat (including streaming)
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateTitle, type ChatMessageData, type ChatAction } from "./types";

interface UseMessagesOptions {
  userId: string | undefined;
  teacherId?: string;
  projectSystemPrompt: string | null;
  saveSession: (
    messages: ChatMessageData[],
    title?: string | null,
    isFirstMessage?: boolean
  ) => void;
}

export function useMessages({
  userId,
  teacherId,
  projectSystemPrompt,
  saveSession,
}: UseMessagesOptions) {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Send message with streaming support
  const sendMessage = useCallback(async (content: string) => {
    if (!userId) {
      console.error("No user ID");
      return;
    }

    // Check if this is the first user message
    const isFirstUserMessage = !messages.some(
      (m) => m.role === "user" && m.id !== "welcome" && m.id !== "welcome-back"
    );
    const newTitle = isFirstUserMessage ? generateTitle(content) : undefined;

    // Add user message
    const userMessage: ChatMessageData = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date(),
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    // Create placeholder for streaming response
    const assistantMessageId = `assistant-${Date.now()}`;
    const assistantMessage: ChatMessageData = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    };

    const messagesWithPlaceholder = [...updatedMessages, assistantMessage];
    setMessages(messagesWithPlaceholder);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const response = await fetch(`${supabaseUrl}/functions/v1/teacher-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          message: content,
          teacherId: teacherId || userId,
          conversationHistory: messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          customSystemPrompt: projectSystemPrompt,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const contentType = response.headers.get("Content-Type") || "";

      if (contentType.includes("text/event-stream")) {
        // Handle streaming response
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";
        let actions: ChatAction[] | undefined;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.metadata) {
                  actions = parsed.metadata.actions;
                }
                if (parsed.text) {
                  fullContent += parsed.text;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessageId
                        ? { ...m, content: fullContent, actions }
                        : m
                    )
                  );
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }

        // Mark streaming complete
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? { ...m, isStreaming: false, content: fullContent || "מצטער, לא הצלחתי לעבד את הבקשה." }
              : m
          )
        );

        const finalMessages = messagesWithPlaceholder.map((m) =>
          m.id === assistantMessageId
            ? { ...m, content: fullContent || "מצטער, לא הצלחתי לעבד את הבקשה.", isStreaming: false, actions }
            : m
        );
        saveSession(finalMessages, newTitle, isFirstUserMessage);
      } else {
        // Handle non-streaming response
        const data = await response.json();

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  content: data.response || "מצטער, לא הצלחתי לעבד את הבקשה.",
                  actions: data.actions,
                  isStreaming: false,
                }
              : m
          )
        );

        const finalMessages = messagesWithPlaceholder.map((m) =>
          m.id === assistantMessageId
            ? {
                ...m,
                content: data.response || "מצטער, לא הצלחתי לעבד את הבקשה.",
                actions: data.actions,
                isStreaming: false,
              }
            : m
        );
        saveSession(finalMessages, newTitle, isFirstUserMessage);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? { ...m, content: "מצטער, נתקלתי בבעיה. אנא נסי שוב.", isStreaming: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [userId, teacherId, messages, saveSession, projectSystemPrompt]);

  return {
    messages,
    setMessages,
    isLoading,
    sendMessage,
  };
}
