// Session management for teacher chat
import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  SESSION_MAX_AGE_HOURS,
  createWelcomeMessage,
  parseSessionMessages,
  type ChatMessageData,
} from "./types";

interface UseSessionOptions {
  userId: string | undefined;
  teacherName: string;
  projectId: string | null;
}

export function useSession({ userId, teacherName, projectId }: UseSessionOptions) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load existing session or create new one
  const loadOrCreateSession = useCallback(async (
    setMessages: (messages: ChatMessageData[]) => void
  ) => {
    if (!userId) return;

    setIsLoadingSession(true);

    try {
      // Note: RPC returns TABLE so we don't use .single()
      const { data: sessions, error } = await supabase
        .rpc("get_active_teacher_session", {
          p_user_id: userId,
          p_max_age_hours: SESSION_MAX_AGE_HOURS,
        });

      const existingSession = sessions?.[0];

      if (existingSession && !error) {
        console.log("Resuming teacher session:", existingSession.id);
        setSessionId(existingSession.id);
        setSessionTitle(existingSession.title);

        const sessionMessages = (existingSession.messages as any[]) || [];
        if (sessionMessages.length > 0) {
          setMessages(parseSessionMessages(sessionMessages, teacherName, true));
        } else {
          setMessages([createWelcomeMessage(teacherName)]);
        }
      } else {
        await createNewSessionInternal(setMessages);
      }
    } catch (error) {
      console.error("Session load error:", error);
      setMessages([createWelcomeMessage(teacherName)]);
    } finally {
      setIsLoadingSession(false);
    }
  }, [userId, teacherName, projectId]);

  // Internal function to create a new session
  const createNewSessionInternal = useCallback(async (
    setMessages: (messages: ChatMessageData[]) => void
  ): Promise<string | null> => {
    if (!userId) return null;

    try {
      const { data: newSession, error: createError } = await supabase
        .from("student_chat_sessions")
        .insert({
          user_id: userId,
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
  }, [userId, teacherName, projectId]);

  // Public function to create a new session
  const createNewSession = useCallback(async (
    setMessages: (messages: ChatMessageData[]) => void
  ): Promise<string | null> => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setIsLoadingSession(true);
    const newId = await createNewSessionInternal(setMessages);
    setIsLoadingSession(false);
    return newId;
  }, [createNewSessionInternal]);

  // Switch to a different session
  const switchSession = useCallback(async (
    newSessionId: string,
    setMessages: (messages: ChatMessageData[]) => void
  ) => {
    if (!userId || newSessionId === sessionId) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setIsLoadingSession(true);

    try {
      const { data: session, error } = await supabase
        .from("student_chat_sessions")
        .select("id, title, messages, message_count")
        .eq("id", newSessionId)
        .eq("user_id", userId)
        .eq("chat_type", "teacher")
        .single();

      if (error || !session) {
        console.error("Error loading session:", error);
        return;
      }

      setSessionId(session.id);
      setSessionTitle(session.title);

      const sessionMessages = (session.messages as any[]) || [];
      if (sessionMessages.length > 0) {
        setMessages(parseSessionMessages(sessionMessages, teacherName, false));
      } else {
        setMessages([createWelcomeMessage(teacherName)]);
      }
    } catch (error) {
      console.error("Error switching session:", error);
    } finally {
      setIsLoadingSession(false);
    }
  }, [userId, sessionId, teacherName]);

  // Save session to database (debounced)
  const saveSession = useCallback((
    messagesToSave: ChatMessageData[],
    title?: string | null,
    isFirstMessage: boolean = false
  ) => {
    if (!sessionId || !userId) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

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
  }, [sessionId, userId]);

  // Cleanup timeout ref
  const cleanup = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
  }, []);

  return {
    sessionId,
    sessionTitle,
    isLoadingSession,
    setIsLoadingSession,
    loadOrCreateSession,
    createNewSession,
    switchSession,
    saveSession,
    cleanup,
  };
}
