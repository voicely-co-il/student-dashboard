import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface TeacherChatSession {
  id: string;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
  preview: string | null;
}

export interface GroupedSessions {
  today: TeacherChatSession[];
  yesterday: TeacherChatSession[];
  previousWeek: TeacherChatSession[];
  older: TeacherChatSession[];
}

export function useTeacherChatSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<TeacherChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all sessions for sidebar
  const fetchSessions = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase.rpc(
        "get_teacher_chat_sessions",
        {
          p_user_id: user.id,
          p_limit: 50,
        }
      );

      if (fetchError) throw fetchError;

      setSessions((data as TeacherChatSession[]) || []);
    } catch (err) {
      console.error("Error fetching sessions:", err);
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Delete a session (soft delete)
  const deleteSession = useCallback(
    async (sessionId: string): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        const { data, error: deleteError } = await supabase.rpc(
          "delete_teacher_chat_session",
          {
            p_session_id: sessionId,
            p_user_id: user.id,
          }
        );

        if (deleteError) throw deleteError;

        if (data) {
          // Remove from local state
          setSessions((prev) => prev.filter((s) => s.id !== sessionId));
          return true;
        }
        return false;
      } catch (err) {
        console.error("Error deleting session:", err);
        return false;
      }
    },
    [user?.id]
  );

  // Add a new session to the list (called after creating)
  const addSessionToList = useCallback((session: TeacherChatSession) => {
    setSessions((prev) => [session, ...prev]);
  }, []);

  // Update a session in the list
  const updateSessionInList = useCallback(
    (sessionId: string, updates: Partial<TeacherChatSession>) => {
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, ...updates } : s))
      );
    },
    []
  );

  // Group sessions by date
  const groupedSessions: GroupedSessions = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const weekAgo = new Date(today.getTime() - 7 * 86400000);

    const groups: GroupedSessions = {
      today: [],
      yesterday: [],
      previousWeek: [],
      older: [],
    };

    for (const session of sessions) {
      const sessionDate = new Date(session.updated_at);

      if (sessionDate >= today) {
        groups.today.push(session);
      } else if (sessionDate >= yesterday) {
        groups.yesterday.push(session);
      } else if (sessionDate >= weekAgo) {
        groups.previousWeek.push(session);
      } else {
        groups.older.push(session);
      }
    }

    return groups;
  }, [sessions]);

  // Check if there are any sessions
  const hasAnySessions = useMemo(
    () =>
      groupedSessions.today.length > 0 ||
      groupedSessions.yesterday.length > 0 ||
      groupedSessions.previousWeek.length > 0 ||
      groupedSessions.older.length > 0,
    [groupedSessions]
  );

  // Initial fetch
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    groupedSessions,
    hasAnySessions,
    isLoading,
    error,
    fetchSessions,
    deleteSession,
    addSessionToList,
    updateSessionInList,
  };
}
