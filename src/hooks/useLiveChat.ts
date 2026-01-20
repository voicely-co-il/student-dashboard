import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ChatMessage {
  role: "user" | "assistant" | "agent";
  content: string;
  timestamp: string;
}

interface UseLiveChatOptions {
  sessionId: string | null;
  enabled?: boolean;
}

export function useLiveChat({ sessionId, enabled = true }: UseLiveChatOptions) {
  const [isLive, setIsLive] = useState(false);
  const [latestAgentMessage, setLatestAgentMessage] = useState<ChatMessage | null>(null);

  const checkForNewMessages = useCallback(async () => {
    if (!sessionId || !enabled) return;

    try {
      const { data: session } = await supabase
        .from("chat_sessions")
        .select("is_live, messages")
        .eq("id", sessionId)
        .single();

      if (session) {
        setIsLive(session.is_live || false);

        // Find the latest agent message
        const messages = session.messages as ChatMessage[] || [];
        const agentMessages = messages.filter(m => m.role === "agent");

        if (agentMessages.length > 0) {
          const latest = agentMessages[agentMessages.length - 1];
          setLatestAgentMessage(latest);
        }
      }
    } catch (error) {
      console.error("Error checking for new messages:", error);
    }
  }, [sessionId, enabled]);

  useEffect(() => {
    if (!sessionId || !enabled) return;

    // Initial check
    checkForNewMessages();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`chat-session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const newData = payload.new as {
            is_live: boolean;
            messages: ChatMessage[];
          };

          setIsLive(newData.is_live || false);

          // Check for new agent messages
          const agentMessages = (newData.messages || []).filter(m => m.role === "agent");
          if (agentMessages.length > 0) {
            const latest = agentMessages[agentMessages.length - 1];
            setLatestAgentMessage(latest);
          }
        }
      )
      .subscribe();

    // Also poll every 3 seconds as backup
    const pollInterval = setInterval(checkForNewMessages, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [sessionId, enabled, checkForNewMessages]);

  return {
    isLive,
    latestAgentMessage,
    checkForNewMessages,
  };
}
