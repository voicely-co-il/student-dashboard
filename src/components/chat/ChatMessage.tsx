import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  actions?: ChatAction[];
}

export interface ChatAction {
  type: "crm_add" | "crm_update" | "calendar_add" | "search_result";
  label: string;
  data?: Record<string, unknown>;
  status?: "pending" | "completed" | "failed";
}

interface ChatMessageProps {
  message: ChatMessageData;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 p-3 sm:p-4 rounded-2xl max-w-[90%] sm:max-w-[85%] shadow-md",
        isUser
          ? "ms-auto bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
          : "me-auto bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
      )}
      role="article"
      aria-label={isUser ? "הודעה שלך" : "תגובת העוזר"}
    >
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center",
          isUser ? "bg-emerald-500 text-white" : "bg-orange-500 text-white"
        )}
        aria-hidden="true"
      >
        {isUser ? <User className="w-4 h-4 sm:w-5 sm:h-5" /> : <Bot className="w-4 h-4 sm:w-5 sm:h-5" />}
      </div>

      <div className="flex-1 space-y-2 min-w-0 text-right">
        <p className="text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed text-sm sm:text-base break-words text-right">
          {message.content}
        </p>

        {message.actions && message.actions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2" role="list" aria-label="פעולות">
            {message.actions.map((action, idx) => (
              <ActionBadge key={idx} action={action} />
            ))}
          </div>
        )}

        <p className="text-xs text-slate-500 dark:text-slate-400 text-right">
          {message.timestamp.toLocaleTimeString("he-IL", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

function ActionBadge({ action }: { action: ChatAction }) {
  const statusColors = {
    pending: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700",
    completed: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700",
    failed: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700",
  };

  const typeIcons = {
    crm_add: "➕",
    crm_update: "✏️",
    calendar_add: "📅",
    search_result: "🔍",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border",
        action.status ? statusColors[action.status] : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600"
      )}
    >
      <span>{typeIcons[action.type]}</span>
      <span>{action.label}</span>
    </span>
  );
}
