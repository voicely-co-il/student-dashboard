import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Loader2, Calendar } from "lucide-react";

// Cal.com embed types
declare global {
  interface Window {
    Cal?: {
      (action: string, ...args: unknown[]): void;
      ns?: Record<string, (action: string, ...args: unknown[]) => void>;
      loaded?: boolean;
      q?: unknown[];
    };
  }
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface VisitorInfo {
  name?: string;
  email?: string;
  phone?: string;
}

interface BookingOption {
  label: string;
  url: string;
  calLink?: string; // Cal.com link for popup (e.g., "voicely/20min")
}

interface ActionResponse {
  type: "show_lead_form" | "show_booking_options" | "none";
  data?: {
    options?: BookingOption[];
  };
}

interface VoicelyChatWidgetProps {
  supabaseUrl: string;
  position?: "bottom-right" | "bottom-left";
  primaryColor?: string;
  title?: string;
  subtitle?: string;
  welcomeMessage?: string;
  suggestions?: string[];
  calcomUsername?: string; // Cal.com username for embed (e.g., "voicely")
}

export function VoicelyChatWidget({
  supabaseUrl,
  position = "bottom-right",
  primaryColor = "#8B5CF6",
  title = "Voicely",
  subtitle = "פיתוח קול והעצמה רגשית",
  welcomeMessage = "שלום! 🎤 איך אוכל לעזור לך היום?",
  suggestions = [
    "שיעור ניסיון 20 דק (חינם)",
    "לקבוע שיעור בתשלום",
    "Voicely Juniors - בני נוער שרים בקבוצה",
  ],
  calcomUsername = "voicely",
}: VoicelyChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: welcomeMessage, timestamp: new Date() },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [visitorInfo, setVisitorInfo] = useState<VisitorInfo>({});
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showBookingOptions, setShowBookingOptions] = useState<BookingOption[] | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [calLoaded, setCalLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load Cal.com embed script
  useEffect(() => {
    if (calLoaded || typeof window === "undefined") return;

    // Cal.com embed loader
    (function (C, A, L) {
      const p = function (a: Window["Cal"], ar: unknown[]) {
        a?.q?.push(ar);
      };
      const d = C.document;
      C.Cal =
        C.Cal ||
        function (...args: unknown[]) {
          const cal = C.Cal;
          if (!cal?.loaded) {
            if (cal) {
              cal.ns = {};
              cal.q = cal.q || [];
            }
            const script = d.createElement("script");
            script.src = A;
            script.async = true;
            d.head.appendChild(script);
            if (cal) cal.loaded = true;
          }
          if (args[0] === L) {
            const api = function (...apiArgs: unknown[]) {
              p(api as unknown as Window["Cal"], apiArgs);
            };
            const namespace = args[1] as string;
            (api as unknown as Window["Cal"]).q = [];
            if (typeof namespace === "string" && cal?.ns) {
              cal.ns[namespace] = api as (action: string, ...args: unknown[]) => void;
              p(api as unknown as Window["Cal"], args);
            } else {
              p(cal, args);
            }
            return;
          }
          p(cal, args);
        };
    })(window, "https://app.cal.com/embed/embed.js", "init");

    // Initialize Cal
    window.Cal?.("init", { origin: "https://cal.com" });

    // Configure UI
    window.Cal?.("ui", {
      theme: "light",
      styles: { branding: { brandColor: primaryColor } },
      hideEventTypeDetails: false,
    });

    setCalLoaded(true);
  }, [calLoaded, primaryColor]);

  // Open Cal.com popup
  const openCalPopup = useCallback((calLink: string) => {
    if (!window.Cal) {
      // Fallback to URL if Cal not loaded
      window.open(`https://cal.com/${calLink}`, "_blank");
      return;
    }
    window.Cal("modal", {
      calLink,
      config: {
        layout: "month_view",
        theme: "light",
      },
    });
  }, []);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    setShowSuggestions(false);
    const userMessage: Message = {
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/website-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

      if (data.sessionId) {
        setSessionId(data.sessionId);
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message || "מצטער, משהו השתבש. נסה שוב.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Handle actions
      if (data.action) {
        handleAction(data.action);
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

  const handleAction = (action: ActionResponse) => {
    if (action.type === "show_lead_form") {
      setShowLeadForm(true);
    } else if (action.type === "show_booking_options" && action.data?.options) {
      setShowBookingOptions(action.data.options);
    }
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const info: VisitorInfo = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
    };
    setVisitorInfo(info);
    setShowLeadForm(false);

    // Send thank you message
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `תודה ${info.name}! 🙏 קיבלנו את הפרטים שלך ונחזור אליך בהקדם.`,
        timestamp: new Date(),
      },
    ]);

    // Save lead to database
    try {
      await fetch(`${supabaseUrl}/functions/v1/save-lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...info, sessionId, source: "chat_widget" }),
      });
    } catch {
      // Ignore errors
    }
  };

  const positionClasses =
    position === "bottom-right" ? "left-4 sm:left-auto sm:right-4" : "right-4 sm:right-auto sm:left-4";

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-4 ${positionClasses} z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110`}
          style={{ backgroundColor: primaryColor }}
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed bottom-4 ${positionClasses} z-50 w-[calc(100%-2rem)] sm:w-96 h-[500px] max-h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden`}
          dir="rtl"
        >
          {/* Header */}
          <div
            className="p-4 text-white flex items-center justify-between"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-xl">🎤</span>
              </div>
              <div>
                <h3 className="font-bold">{title}</h3>
                <p className="text-sm opacity-90">{subtitle}</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl ${
                    message.role === "user"
                      ? "bg-gray-200 text-gray-800 rounded-tr-none"
                      : "text-white rounded-tl-none"
                  }`}
                  style={message.role === "assistant" ? { backgroundColor: primaryColor } : {}}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-end">
                <div
                  className="p-3 rounded-2xl rounded-tl-none text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              </div>
            )}

            {/* Suggestions */}
            {showSuggestions && messages.length === 1 && (
              <div className="flex flex-wrap gap-2 justify-end">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => sendMessage(suggestion)}
                    className="text-sm px-3 py-2 rounded-full border-2 hover:bg-gray-100 transition-colors"
                    style={{ borderColor: primaryColor, color: primaryColor }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {/* Booking Options */}
            {showBookingOptions && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 text-center">בחר אפשרות:</p>
                {showBookingOptions.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      if (option.calLink) {
                        openCalPopup(option.calLink);
                      } else {
                        window.open(option.url, "_blank");
                      }
                      setShowBookingOptions(null);
                    }}
                    className="w-full p-3 text-center text-white rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {option.calLink && <Calendar className="w-4 h-4" />}
                    {option.label}
                  </button>
                ))}
              </div>
            )}

            {/* Lead Form */}
            {showLeadForm && (
              <form onSubmit={handleLeadSubmit} className="bg-white p-4 rounded-lg shadow space-y-3">
                <p className="text-sm font-medium text-gray-700">השאר פרטים ונחזור אליך:</p>
                <input
                  name="name"
                  placeholder="שם מלא *"
                  required
                  className="w-full p-2 border rounded-lg text-sm"
                />
                <input
                  name="phone"
                  placeholder="טלפון *"
                  required
                  type="tel"
                  className="w-full p-2 border rounded-lg text-sm"
                />
                <input
                  name="email"
                  placeholder="אימייל"
                  type="email"
                  className="w-full p-2 border rounded-lg text-sm"
                />
                <button
                  type="submit"
                  className="w-full p-2 text-white rounded-lg text-sm font-medium"
                  style={{ backgroundColor: primaryColor }}
                >
                  שלח פרטים
                </button>
              </form>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t bg-white">
            <div className="flex gap-2">
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage(inputValue)}
                placeholder="כתוב הודעה..."
                className="flex-1 p-3 border rounded-full text-sm focus:outline-none focus:ring-2"
                style={{ focusRing: primaryColor } as React.CSSProperties}
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage(inputValue)}
                disabled={!inputValue.trim() || isLoading}
                className="p-3 rounded-full text-white disabled:opacity-50 transition-opacity"
                style={{ backgroundColor: primaryColor }}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default VoicelyChatWidget;
