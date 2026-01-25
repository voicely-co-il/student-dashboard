// Main teacher chat hook - composes session and message hooks
// Total: ~60 lines (down from 506!)
import { useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSession } from "./useSession";
import { useMessages } from "./useMessages";
import type { UseChatOptions, UseTeacherChatReturn } from "./types";

export function useTeacherChat({
  teacherId,
  projectId = null,
  projectSystemPrompt = null,
}: UseChatOptions = {}): UseTeacherChatReturn {
  const { user, profile } = useAuth();
  const teacherName = profile?.name || "ענבל";

  // Session management
  const {
    sessionId,
    isLoadingSession,
    loadOrCreateSession,
    createNewSession,
    switchSession,
    saveSession,
    cleanup,
  } = useSession({
    userId: user?.id,
    teacherName,
    projectId,
  });

  // Message handling
  const {
    messages,
    setMessages,
    isLoading,
    sendMessage,
  } = useMessages({
    userId: user?.id,
    teacherId,
    projectSystemPrompt,
    saveSession,
  });

  // Load session on mount
  useEffect(() => {
    if (user?.id) {
      loadOrCreateSession(setMessages);
    }
  }, [user?.id, loadOrCreateSession, setMessages]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Clear history and start new session
  const clearHistory = useCallback(async () => {
    await createNewSession(setMessages);
  }, [createNewSession, setMessages]);

  // Switch session wrapper
  const handleSwitchSession = useCallback(async (newSessionId: string) => {
    await switchSession(newSessionId, setMessages);
  }, [switchSession, setMessages]);

  // Create new session wrapper
  const handleCreateNewSession = useCallback(async (): Promise<string | null> => {
    return await createNewSession(setMessages);
  }, [createNewSession, setMessages]);

  return {
    messages,
    isLoading,
    isLoadingSession,
    sessionId,
    sendMessage,
    clearHistory,
    switchSession: handleSwitchSession,
    createNewSession: handleCreateNewSession,
  };
}
