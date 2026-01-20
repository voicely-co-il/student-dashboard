import { useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTeacherChat } from "@/hooks/useTeacherChat";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { QuickActions } from "@/components/chat/QuickActions";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, RotateCcw, Settings } from "lucide-react";
import { Link } from "react-router-dom";

export default function TeacherChat() {
  const { user } = useAuth();
  const { messages, isLoading, sendMessage, clearHistory } = useTeacherChat({
    teacherId: user?.id,
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleQuickAction = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between px-3 sm:px-4 py-3">
          <Link to="/" aria-label="חזרה לדף הבית">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>

          <div className="text-center">
            <h1 className="font-semibold text-slate-800 dark:text-slate-100 text-base sm:text-lg">עוזר Voicely</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">מנהל CRM, יומן ותובנות</p>
          </div>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={clearHistory}
              className="rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              title="שיחה חדשה"
              aria-label="התחל שיחה חדשה"
            >
              <RotateCcw className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              title="הגדרות"
              aria-label="הגדרות"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <QuickActions onAction={handleQuickAction} />
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3 sm:p-4 bg-slate-100/50 dark:bg-slate-800/50" ref={scrollRef}>
        <div className="space-y-3 sm:space-y-4 max-w-2xl mx-auto pb-4" role="log" aria-live="polite" aria-label="היסטוריית שיחה">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {isLoading && (
            <div className="flex justify-center py-4" aria-label="טוען תגובה">
              <div className="flex gap-2">
                <span className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-lg">
        <ChatInput onSend={sendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
}
