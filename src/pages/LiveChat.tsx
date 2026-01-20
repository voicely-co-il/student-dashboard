import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  MessageCircle,
  Send,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Phone,
  Mail,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

interface ChatMessage {
  role: "user" | "assistant" | "agent";
  content: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  visitor_info: {
    name?: string;
    email?: string;
    phone?: string;
  };
  messages: ChatMessage[];
  source: string;
  is_live: boolean;
  assigned_to: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

export default function LiveChat() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch chat sessions
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["chat-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_sessions")
        .select("*")
        .neq("status", "archived")
        .order("last_message_at", { ascending: false });

      if (error) throw error;
      return data as ChatSession[];
    },
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("chat-sessions-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_sessions",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedSession, sessions]);

  // Take over chat session
  const takeOverMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from("chat_sessions")
        .update({
          is_live: true,
          assigned_to: user?.id,
        })
        .eq("id", sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("השתלטת על השיחה");
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
    },
    onError: () => {
      toast.error("שגיאה בהשתלטות על השיחה");
    },
  });

  // Send reply
  const sendReplyMutation = useMutation({
    mutationFn: async ({ sessionId, message }: { sessionId: string; message: string }) => {
      const session = sessions?.find((s) => s.id === sessionId);
      if (!session) throw new Error("Session not found");

      const newMessage: ChatMessage = {
        role: "agent",
        content: message,
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...(session.messages || []), newMessage];

      const { error } = await supabase
        .from("chat_sessions")
        .update({
          messages: updatedMessages,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
    },
    onError: () => {
      toast.error("שגיאה בשליחת ההודעה");
    },
  });

  // Close session
  const closeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from("chat_sessions")
        .update({
          status: "closed",
          is_live: false,
        })
        .eq("id", sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("השיחה נסגרה");
      setSelectedSession(null);
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
    },
    onError: () => {
      toast.error("שגיאה בסגירת השיחה");
    },
  });

  const currentSession = sessions?.find((s) => s.id === selectedSession);
  const activeSessions = sessions?.filter((s) => s.status === "active") || [];
  const closedSessions = sessions?.filter((s) => s.status === "closed") || [];

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedSession) return;
    sendReplyMutation.mutate({ sessionId: selectedSession, message: replyText });
  };

  return (
    <div className="h-screen flex bg-gray-100" dir="rtl">
      {/* Sessions List */}
      <div className="w-80 bg-white border-l flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-purple-500" />
            Live Chat
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeSessions.length} שיחות פעילות
          </p>
        </div>

        <ScrollArea className="flex-1">
          {/* Active Sessions */}
          {activeSessions.length > 0 && (
            <div className="p-2">
              <p className="text-xs font-medium text-gray-500 px-2 mb-2">פעילות</p>
              {activeSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSession(session.id)}
                  className={`w-full p-3 rounded-lg text-right transition-colors ${
                    selectedSession === session.id
                      ? "bg-purple-100 border-purple-300"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {session.visitor_info?.name || "אורח"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {session.messages?.length || 0} הודעות
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {session.is_live ? (
                        <Badge variant="default" className="bg-green-500 text-xs">
                          Live
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">AI</Badge>
                      )}
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(session.last_message_at), {
                          addSuffix: true,
                          locale: he,
                        })}
                      </span>
                    </div>
                  </div>
                  {session.messages && session.messages.length > 0 && (
                    <p className="text-xs text-gray-500 mt-2 truncate">
                      {session.messages[session.messages.length - 1]?.content}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Closed Sessions */}
          {closedSessions.length > 0 && (
            <div className="p-2">
              <Separator className="my-2" />
              <p className="text-xs font-medium text-gray-500 px-2 mb-2">נסגרו</p>
              {closedSessions.slice(0, 10).map((session) => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSession(session.id)}
                  className={`w-full p-3 rounded-lg text-right transition-colors opacity-60 ${
                    selectedSession === session.id
                      ? "bg-gray-100"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-600">
                        {session.visitor_info?.name || "אורח"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(session.created_at), {
                          addSuffix: true,
                          locale: he,
                        })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {isLoading && (
            <div className="p-4 text-center">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-gray-400" />
            </div>
          )}

          {!isLoading && sessions?.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">אין שיחות עדיין</p>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentSession ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setSelectedSession(null)}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="font-bold">
                    {currentSession.visitor_info?.name || "אורח"}
                  </h2>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    {currentSession.visitor_info?.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {currentSession.visitor_info.phone}
                      </span>
                    )}
                    {currentSession.visitor_info?.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {currentSession.visitor_info.email}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(currentSession.created_at), {
                        addSuffix: true,
                        locale: he,
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!currentSession.is_live && currentSession.status === "active" && (
                  <Button
                    onClick={() => takeOverMutation.mutate(currentSession.id)}
                    disabled={takeOverMutation.isPending}
                  >
                    <CheckCircle2 className="w-4 h-4 ml-2" />
                    השתלט על השיחה
                  </Button>
                )}
                {currentSession.status === "active" && (
                  <Button
                    variant="outline"
                    onClick={() => closeSessionMutation.mutate(currentSession.id)}
                    disabled={closeSessionMutation.isPending}
                  >
                    <XCircle className="w-4 h-4 ml-2" />
                    סגור
                  </Button>
                )}
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-3xl mx-auto">
                {currentSession.messages?.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === "user" ? "justify-start" : "justify-end"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-2xl ${
                        message.role === "user"
                          ? "bg-white text-gray-800 rounded-tr-none shadow-sm"
                          : message.role === "agent"
                          ? "bg-green-500 text-white rounded-tl-none"
                          : "bg-purple-500 text-white rounded-tl-none"
                      }`}
                    >
                      {message.role !== "user" && (
                        <p className="text-xs opacity-70 mb-1">
                          {message.role === "agent" ? "נציג" : "בוט"}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.role === "user" ? "text-gray-400" : "opacity-70"
                        }`}
                      >
                        {new Date(message.timestamp).toLocaleTimeString("he-IL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Reply Input */}
            {currentSession.is_live && currentSession.status === "active" && (
              <div className="bg-white border-t p-4">
                <div className="flex gap-2 max-w-3xl mx-auto">
                  <Input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendReply()}
                    placeholder="כתוב תשובה..."
                    className="flex-1"
                    disabled={sendReplyMutation.isPending}
                  />
                  <Button
                    onClick={handleSendReply}
                    disabled={!replyText.trim() || sendReplyMutation.isPending}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {!currentSession.is_live && currentSession.status === "active" && (
              <div className="bg-yellow-50 border-t border-yellow-200 p-4 text-center text-yellow-700">
                <p className="text-sm">
                  הבוט מטפל בשיחה הזו. לחץ "השתלט על השיחה" כדי לענות בעצמך.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">בחר שיחה להציג</p>
              <p className="text-sm">או המתן לשיחות חדשות</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
