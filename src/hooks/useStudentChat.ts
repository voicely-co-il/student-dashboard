import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ChatMessageData, ChatAction } from "@/components/chat/ChatMessage";

// Session persistence - how long to keep a session active (24 hours)
const SESSION_MAX_AGE_HOURS = 24;

export function useStudentChat() {
  const { user, profile } = useAuth();
  const studentName = profile?.name || "תלמיד/ה";

  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [memoriesCount, setMemoriesCount] = useState(0);

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
        .rpc("get_active_chat_session", {
          p_user_id: user.id,
          p_chat_type: "student",
          p_max_age_hours: SESSION_MAX_AGE_HOURS,
        })
        .single();

      if (existingSession && !error) {
        // Resume existing session
        console.log("Resuming session:", existingSession.id);
        setSessionId(existingSession.id);

        // Parse messages from session
        const sessionMessages = (existingSession.messages as any[]) || [];
        if (sessionMessages.length > 0) {
          const parsedMessages: ChatMessageData[] = sessionMessages.map((m: any) => ({
            id: m.id || `msg-${Date.now()}-${Math.random()}`,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.timestamp),
            actions: m.actions,
          }));

          // Add welcome back message
          parsedMessages.push({
            id: "welcome-back",
            role: "assistant",
            content: `ברוך שובך ${studentName}! 👋\nהמשכנו מאיפה שעצרנו. יש לך שאלות נוספות?`,
            timestamp: new Date(),
          });

          setMessages(parsedMessages);
        } else {
          // Session exists but empty - add welcome
          setMessages([createWelcomeMessage(studentName)]);
        }
      } else {
        // Create new session
        const { data: newSession, error: createError } = await supabase
          .from("student_chat_sessions")
          .insert({
            user_id: user.id,
            chat_type: "student",
            messages: [],
            message_count: 0,
          })
          .select("id")
          .single();

        if (createError) {
          console.error("Error creating session:", createError);
          // Continue without persistence
          setMessages([createWelcomeMessage(studentName)]);
        } else {
          console.log("Created new session:", newSession.id);
          setSessionId(newSession.id);
          setMessages([createWelcomeMessage(studentName)]);
        }
      }

      // Load memory stats
      loadMemoryStats();
    } catch (error) {
      console.error("Session load error:", error);
      setMessages([createWelcomeMessage(studentName)]);
    } finally {
      setIsLoadingSession(false);
    }
  };

  // Create welcome message
  const createWelcomeMessage = (name: string): ChatMessageData => ({
    id: "welcome",
    role: "assistant",
    content: `שלום ${name}! 👋

אני כאן כדי לעזור לך בלמידת הקול והשירה.

אפשר לשאול אותי:
• שאלות על טכניקות קול ושירה
• מה עבדנו בשיעורים האחרונים
• עצות לתרגול ושיפור

מה תרצה לדעת?`,
    timestamp: new Date(),
  });

  // Load user's memory stats
  const loadMemoryStats = async () => {
    if (!user?.id) return;

    try {
      const { data } = await supabase
        .rpc("get_user_memory_stats", { p_user_id: user.id })
        .single();

      if (data) {
        setMemoriesCount(data.total_memories || 0);
      }
    } catch (error) {
      // Ignore - stats are optional
    }
  };

  // Save session to database (debounced)
  const saveSession = useCallback(
    (messagesToSave: ChatMessageData[]) => {
      if (!sessionId || !user?.id) return;

      // Clear previous timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounce save by 2 seconds
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

          await supabase
            .from("student_chat_sessions")
            .update({
              messages: messagesForDb,
              message_count: messagesForDb.length,
              last_message_at: new Date().toISOString(),
            })
            .eq("id", sessionId);
        } catch (error) {
          console.error("Error saving session:", error);
        }
      }, 2000);
    },
    [sessionId, user?.id]
  );

  // Send message
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
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setIsLoading(true);

      try {
        const { data, error } = await supabase.functions.invoke("student-chat", {
          body: {
            message: content,
            studentId: user.id,
            studentName: studentName,
            sessionId: sessionId,
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
        if (data.memoriesUsed > 0) {
          actions.push({
            type: "memory",
            label: `${data.memoriesUsed} זיכרונות`,
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

        const finalMessages = [...updatedMessages, assistantMessage];
        setMessages(finalMessages);

        // Save to session
        saveSession(finalMessages);

        // Trigger memory extraction in background (after response)
        extractMemoriesInBackground(finalMessages.slice(-6));
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
    [user?.id, studentName, messages, sessionId, saveSession]
  );

  // Extract memories in background
  const extractMemoriesInBackground = async (recentMessages: ChatMessageData[]) => {
    if (!user?.id || !sessionId) return;

    try {
      await supabase.functions.invoke("memory-manager", {
        body: {
          operation: "extract",
          userId: user.id,
          sessionId: sessionId,
          messages: recentMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        },
      });

      // Refresh memory count
      loadMemoryStats();
    } catch (error) {
      // Silent fail - memory extraction is optional
      console.log("Memory extraction skipped:", error);
    }
  };

  // Clear history and start new session
  const clearHistory = useCallback(async () => {
    if (sessionId && user?.id) {
      // Summarize old session before clearing
      try {
        await supabase.functions.invoke("memory-manager", {
          body: {
            operation: "summarize",
            userId: user.id,
            sessionId: sessionId,
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          },
        });
      } catch {
        // Ignore summarization errors
      }

      // Create new session
      const { data: newSession } = await supabase
        .from("student_chat_sessions")
        .insert({
          user_id: user.id,
          chat_type: "student",
          messages: [],
          message_count: 0,
        })
        .select("id")
        .single();

      if (newSession) {
        setSessionId(newSession.id);
      }
    }

    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "שיחה חדשה התחילה. במה אוכל לעזור?",
        timestamp: new Date(),
      },
    ]);
  }, [sessionId, user?.id, messages]);

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
    sendMessage,
    clearHistory,
    sessionId,
    memoriesCount,
  };
}
