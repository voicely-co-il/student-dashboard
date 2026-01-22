import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ChatMessageData, ChatAction } from "@/components/chat/ChatMessage";

// Session persistence - how long to keep a session active (24 hours)
const SESSION_MAX_AGE_HOURS = 24;

interface UseChatOptions {
  teacherId?: string;
  projectId?: string | null;
  projectSystemPrompt?: string | null;
}

interface UseTeacherChatReturn {
  messages: ChatMessageData[];
  isLoading: boolean;
  isLoadingSession: boolean;
  sessionId: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  switchSession: (sessionId: string) => Promise<void>;
  createNewSession: () => Promise<string | null>;
}

// Generate title from first user message (truncate to 40 chars)
const generateTitle = (message: string): string => {
  const cleaned = message.replace(/\n/g, " ").trim();
  return cleaned.length > 40 ? cleaned.substring(0, 40) + "..." : cleaned;
};

// Create welcome message
const createWelcomeMessage = (teacherName: string = "ענבל"): ChatMessageData => ({
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

export function useTeacherChat({
  teacherId,
  projectId = null,
  projectSystemPrompt = null,
}: UseChatOptions = {}): UseTeacherChatReturn {
  const { user, profile } = useAuth();
  const teacherName = profile?.name || "ענבל";

  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState<string | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load or create session on mount
  useEffect(() => {
    if (user?.id) {
      loadOrCreateSession();
    }
  }, [user?.id]);

  // Load existing session or create new one
  const loadOrCreateSession = async () => {
    if (!user?.id) return;

    setIsLoadingSession(true);

    try {
      // Try to get active session from last 24 hours
      const { data: existingSession, error } = await supabase
        .rpc("get_active_teacher_session", {
          p_user_id: user.id,
          p_max_age_hours: SESSION_MAX_AGE_HOURS,
        })
        .single();

      if (existingSession && !error) {
        // Resume existing session
        console.log("Resuming teacher session:", existingSession.id);
        setSessionId(existingSession.id);
        setSessionTitle(existingSession.title);

        // Parse messages from session
        const sessionMessages = (existingSession.messages as any[]) || [];
        if (sessionMessages.length > 0) {
          const parsedMessages: ChatMessageData[] = sessionMessages.map(
            (m: any) => ({
              id: m.id || `msg-${Date.now()}-${Math.random()}`,
              role: m.role,
              content: m.content,
              timestamp: new Date(m.timestamp),
              actions: m.actions,
            })
          );

          // Add welcome back message
          parsedMessages.push({
            id: "welcome-back",
            role: "assistant",
            content: `ברוכה שובך ${teacherName}! 👋\nהמשכנו מאיפה שעצרנו. מה תרצי לעשות?`,
            timestamp: new Date(),
          });

          setMessages(parsedMessages);
        } else {
          // Session exists but empty - add welcome
          setMessages([createWelcomeMessage(teacherName)]);
        }
      } else {
        // Create new session
        await createNewSessionInternal();
      }
    } catch (error) {
      console.error("Session load error:", error);
      setMessages([createWelcomeMessage(teacherName)]);
    } finally {
      setIsLoadingSession(false);
    }
  };

  // Internal function to create a new session
  const createNewSessionInternal = async (): Promise<string | null> => {
    if (!user?.id) return null;

    try {
      const { data: newSession, error: createError } = await supabase
        .from("student_chat_sessions")
        .insert({
          user_id: user.id,
          chat_type: "teacher",
          messages: [],
          message_count: 0,
          title: null,
          project_id: projectId,
        })
        .select("id")
        .single();

      if (createError) {
        console.error("Error creating session:", createError);
        setMessages([createWelcomeMessage(teacherName)]);
        return null;
      }

      console.log("Created new teacher session:", newSession.id);
      setSessionId(newSession.id);
      setSessionTitle(null);
      setMessages([createWelcomeMessage(teacherName)]);
      return newSession.id;
    } catch (error) {
      console.error("Session creation error:", error);
      setMessages([createWelcomeMessage(teacherName)]);
      return null;
    }
  };

  // Public function to create a new session (for sidebar "New Chat" button)
  const createNewSession = useCallback(async (): Promise<string | null> => {
    // Save current session if there are messages
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setIsLoadingSession(true);
    const newId = await createNewSessionInternal();
    setIsLoadingSession(false);
    return newId;
  }, [user?.id, teacherName]);

  // Switch to a different session
  const switchSession = useCallback(
    async (newSessionId: string) => {
      if (!user?.id || newSessionId === sessionId) return;

      // Cancel any pending save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      setIsLoadingSession(true);

      try {
        // Fetch the session
        const { data: session, error } = await supabase
          .from("student_chat_sessions")
          .select("id, title, messages, message_count")
          .eq("id", newSessionId)
          .eq("user_id", user.id)
          .eq("chat_type", "teacher")
          .single();

        if (error || !session) {
          console.error("Error loading session:", error);
          return;
        }

        setSessionId(session.id);
        setSessionTitle(session.title);

        // Parse messages
        const sessionMessages = (session.messages as any[]) || [];
        if (sessionMessages.length > 0) {
          const parsedMessages: ChatMessageData[] = sessionMessages.map(
            (m: any) => ({
              id: m.id || `msg-${Date.now()}-${Math.random()}`,
              role: m.role,
              content: m.content,
              timestamp: new Date(m.timestamp),
              actions: m.actions,
            })
          );
          setMessages(parsedMessages);
        } else {
          setMessages([createWelcomeMessage(teacherName)]);
        }
      } catch (error) {
        console.error("Error switching session:", error);
      } finally {
        setIsLoadingSession(false);
      }
    },
    [user?.id, sessionId, teacherName]
  );

  // Save session to database (debounced)
  const saveSession = useCallback(
    (
      messagesToSave: ChatMessageData[],
      title?: string | null,
      isFirstMessage: boolean = false
    ) => {
      if (!sessionId || !user?.id) return;

      // Clear previous timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounce save by 2 seconds (or save immediately if first message)
      const delay = isFirstMessage ? 0 : 2000;

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const messagesForDb = messagesToSave
            .filter((m) => m.id !== "welcome" && m.id !== "welcome-back")
            .map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: m.timestamp.toISOString(),
              actions: m.actions,
            }));

          const updateData: any = {
            messages: messagesForDb,
            message_count: messagesForDb.length,
            last_message_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          // Set title if provided (first user message)
          if (title !== undefined) {
            updateData.title = title;
            setSessionTitle(title);
          }

          await supabase
            .from("student_chat_sessions")
            .update(updateData)
            .eq("id", sessionId);
        } catch (error) {
          console.error("Error saving session:", error);
        }
      }, delay);
    },
    [sessionId, user?.id]
  );

  // Send message with streaming support
  const sendMessage = useCallback(
    async (content: string) => {
      if (!user?.id) {
        console.error("No user ID");
        return;
      }

      // Check if this is the first user message (for title generation)
      const isFirstUserMessage = !messages.some(
        (m) =>
          m.role === "user" && m.id !== "welcome" && m.id !== "welcome-back"
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

      // Add empty assistant message to start streaming into
      const messagesWithPlaceholder = [...updatedMessages, assistantMessage];
      setMessages(messagesWithPlaceholder);

      try {
        // Get Supabase session for auth header
        const { data: { session } } = await supabase.auth.getSession();
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

        // Call the edge function with streaming
        const response = await fetch(`${supabaseUrl}/functions/v1/teacher-chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            message: content,
            teacherId: teacherId || user.id,
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

        // Check if we got a streaming response
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
                if (data === "[DONE]") {
                  continue;
                }
                try {
                  const parsed = JSON.parse(data);

                  // Handle metadata (intent, actions)
                  if (parsed.metadata) {
                    actions = parsed.metadata.actions;
                  }

                  // Handle text chunks
                  if (parsed.text) {
                    fullContent += parsed.text;

                    // Update message content progressively
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantMessageId
                          ? { ...m, content: fullContent, actions }
                          : m
                      )
                    );
                  }
                } catch (e) {
                  // Skip malformed JSON
                }
              }
            }
          }

          // Mark streaming as complete
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? { ...m, isStreaming: false, content: fullContent || "מצטער, לא הצלחתי לעבד את הבקשה." }
                : m
            )
          );

          // Save to session
          const finalMessages = messagesWithPlaceholder.map((m) =>
            m.id === assistantMessageId
              ? { ...m, content: fullContent || "מצטער, לא הצלחתי לעבד את הבקשה.", isStreaming: false, actions }
              : m
          );
          saveSession(finalMessages, newTitle, isFirstUserMessage);
        } else {
          // Handle non-streaming response (fallback)
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

        // Update placeholder with error message
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
    },
    [user?.id, teacherId, messages, saveSession, projectSystemPrompt]
  );

  // Clear history and start new session
  const clearHistory = useCallback(async () => {
    // Cancel any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Create new session
    setIsLoadingSession(true);
    await createNewSessionInternal();
    setIsLoadingSession(false);
  }, [user?.id, teacherName]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    messages,
    isLoading,
    isLoadingSession,
    sessionId,
    sendMessage,
    clearHistory,
    switchSession,
    createNewSession,
  };
}
