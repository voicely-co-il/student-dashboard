import { useRef, useEffect } from "react";
import { useStudentChat } from "@/hooks/useStudentChat";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { QuickActions } from "@/components/chat/QuickActions";
import { MemoryPanel } from "@/components/chat/MemoryPanel";
import { ArrowRight, Trash2, Sparkles, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const StudentChat = () => {
  const {
    messages,
    isLoading,
    isLoadingSession,
    sendMessage,
    clearHistory,
  } = useStudentChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const quickActions = [
    { label: "מה עבדנו בשיעור האחרון?", prompt: "מה עבדנו בשיעור האחרון שלי?" },
    { label: "איך לשפר נשימה?", prompt: "איך אני יכול לשפר את הנשימה שלי בזמן שירה?" },
    { label: "תרגילים לחימום", prompt: "תן לי תרגילי חימום קוליים" },
    { label: "טיפים לביטחון בבמה", prompt: "איך להרגיש יותר בטוח על הבמה?" },
  ];

  // Show loading while session is being loaded
  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-voicely-green mb-4" />
        <p className="text-muted-foreground">טוען את השיחה...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 max-w-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/student">
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="font-semibold text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-voicely-green" />
                  עוזר הלמידה שלי
                </h1>
                <p className="text-xs text-muted-foreground">
                  שאל אותי על טכניקה או השיעורים שלך
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <MemoryPanel />
              <Button
                variant="ghost"
                size="sm"
                onClick={clearHistory}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 ms-1" />
                נקה
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="container mx-auto px-4 py-4 max-w-3xl space-y-4">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-4 py-3 max-w-[85%]">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-sm">חושב...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      {messages.length <= 1 && (
        <div className="border-t bg-card/50 py-3">
          <div className="container mx-auto px-4 max-w-3xl">
            <QuickActions actions={quickActions} onSelect={sendMessage} />
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t bg-card sticky bottom-0">
        <div className="container mx-auto px-4 py-3 max-w-3xl">
          <ChatInput
            onSend={sendMessage}
            disabled={isLoading}
            placeholder="שאל שאלה על טכניקה או השיעורים שלך..."
          />
        </div>
      </div>
    </div>
  );
};

export default StudentChat;
