import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, ExternalLink, UserCircle } from "lucide-react";
import { useLiveChat } from "@/hooks/useLiveChat";

interface Message {
  role: "user" | "assistant" | "agent";
  content: string;
  timestamp: Date;
}

interface VisitorInfo {
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

interface BookingOption {
  label: string;
  url: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const SUGGESTIONS = [
  "שיעור ניסיון 20 דק (חינם)",
  "Voicely Juniors - בני נוער שרים בקבוצה",
  "לקבוע שיעור בתשלום",
  "מה העלויות?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "שלום! 🎤 אני כאן לספק מידע על שיעורי פיתוח קול עם ענבל.\n\nאם יש לך שאלות על השיעורים, תהליך הלמידה, או כל דבר אחר שקשור לפיתוח קול, אני כאן לעזור!\n\nאיך אוכל לסייע לך היום?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [visitorInfo, setVisitorInfo] = useState<VisitorInfo>({});
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [bookingOptions, setBookingOptions] = useState<BookingOption[] | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [processedAgentMessages, setProcessedAgentMessages] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Live chat hook for real-time agent responses
  const { isLive, latestAgentMessage } = useLiveChat({
    sessionId,
    enabled: !!sessionId,
  });

  // Handle new agent messages from live chat
  useEffect(() => {
    if (latestAgentMessage && !processedAgentMessages.has(latestAgentMessage.timestamp)) {
      const newMessage: Message = {
        role: "agent",
        content: latestAgentMessage.content,
        timestamp: new Date(latestAgentMessage.timestamp),
      };

      setMessages((prev) => {
        // Check if this message is already in the list
        const exists = prev.some(
          (m) => m.role === "agent" && m.content === latestAgentMessage.content
        );
        if (exists) return prev;
        return [...prev, newMessage];
      });

      setProcessedAgentMessages((prev) => new Set(prev).add(latestAgentMessage.timestamp));
    }
  }, [latestAgentMessage, processedAgentMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    setShowSuggestions(false);
    setBookingOptions(null);

    const userMessage: Message = {
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/website-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          visitorInfo,
          sessionId,
        }),
      });

      const data = await response.json();

      if (data.sessionId) setSessionId(data.sessionId);

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message || "מצטער, משהו השתבש. נסה שוב.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Handle actions
      if (data.action?.type === "show_lead_form") {
        setShowLeadForm(true);
      } else if (data.action?.type === "show_booking_options") {
        setBookingOptions(data.action.data?.options || null);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "אופס, משהו השתבש. נסה שוב בבקשה 🙏",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const info: VisitorInfo = {
      name: formData.get("name") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      notes: formData.get("notes") as string,
    };
    setVisitorInfo(info);
    setShowLeadForm(false);

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `תודה ${info.name}! 🙏 קיבלנו את הפרטים שלך ונחזור אליך בהקדם.`,
        timestamp: new Date(),
      },
    ]);

    // Save lead
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/save-lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...info, sessionId, source: "chat_page" }),
      });
    } catch {
      // Ignore
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex flex-col" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-2xl">🎤</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Voicely</h1>
              <p className="text-sm text-gray-600">פיתוח קול והעצמה רגשית</p>
            </div>
          </div>
          {isLive && (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              נציג/ה זמין/ה
            </div>
          )}
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${
                  message.role === "user"
                    ? "bg-white text-gray-800 rounded-tr-none"
                    : message.role === "agent"
                    ? "bg-gradient-to-br from-green-500 to-emerald-500 text-white rounded-tl-none"
                    : "bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-tl-none"
                }`}
              >
                {message.role === "agent" && (
                  <p className="text-xs text-white/80 mb-1 flex items-center gap-1">
                    <UserCircle className="w-3 h-3" /> נציג/ה אנושי/ת
                  </p>
                )}
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                <p
                  className={`text-xs mt-2 ${
                    message.role === "user" ? "text-gray-400" : "text-white/70"
                  }`}
                >
                  {message.timestamp.toLocaleTimeString("he-IL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-end">
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white p-4 rounded-2xl rounded-tl-none">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            </div>
          )}

          {/* Suggestions */}
          {showSuggestions && messages.length === 1 && (
            <div className="flex flex-wrap gap-2 justify-end">
              {SUGGESTIONS.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => sendMessage(suggestion)}
                  className="px-4 py-2 rounded-full border-2 border-purple-400 text-purple-600 hover:bg-purple-50 transition-colors text-sm"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Booking Options */}
          {bookingOptions && (
            <div className="flex justify-end">
              <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2 max-w-[85%]">
                <p className="text-sm text-gray-600 font-medium">בחר אפשרות:</p>
                {bookingOptions.map((option, index) => (
                  <a
                    key={index}
                    href={option.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity"
                  >
                    <span>{option.label}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Lead Form */}
          {showLeadForm && (
            <div className="flex justify-end">
              <form
                onSubmit={handleLeadSubmit}
                className="bg-white rounded-2xl shadow-sm p-4 space-y-3 max-w-[85%] w-full"
              >
                <p className="font-medium text-gray-700">השאר פרטים ונחזור אליך:</p>
                <input
                  name="name"
                  placeholder="שם מלא *"
                  required
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400 focus:outline-none"
                />
                <input
                  name="phone"
                  placeholder="טלפון *"
                  required
                  type="tel"
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400 focus:outline-none"
                />
                <input
                  name="email"
                  placeholder="אימייל"
                  type="email"
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400 focus:outline-none"
                />
                <textarea
                  name="notes"
                  placeholder="ספר לנו קצת על המטרות שלך..."
                  rows={2}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400 focus:outline-none resize-none"
                />
                <button
                  type="submit"
                  className="w-full p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  שלח פרטים
                </button>
              </form>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mt-auto">
          <div className="flex gap-3">
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage(inputValue)}
              placeholder="כתוב הודעה..."
              className="flex-1 p-3 border rounded-full focus:outline-none focus:ring-2 focus:ring-purple-400"
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage(inputValue)}
              disabled={!inputValue.trim() || isLoading}
              className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full disabled:opacity-50 transition-opacity hover:opacity-90"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-3 text-sm text-gray-500">
        <a href="https://www.voicely.co.il" target="_blank" rel="noopener noreferrer" className="hover:text-purple-600">
          voicely.co.il
        </a>
      </footer>
    </div>
  );
}
