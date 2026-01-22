import { useState } from "react";
import { cn } from "@/lib/utils";
import { Bot, User, Copy, Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  actions?: ChatAction[];
  isStreaming?: boolean;
}

export interface ChatAction {
  type: "crm_add" | "crm_update" | "calendar_add" | "search_result" | "memory";
  label: string;
  data?: Record<string, unknown>;
  status?: "pending" | "completed" | "failed";
}

interface ChatMessageProps {
  message: ChatMessageData;
  showShareButton?: boolean;
}

export function ChatMessage({ message, showShareButton = true }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(message.content);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div
      className={cn(
        "group relative flex gap-3 p-3 sm:p-4 rounded-2xl max-w-[90%] sm:max-w-[85%] shadow-md",
        isUser
          ? "ms-auto bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
          : "me-auto bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
      )}
      role="article"
      aria-label={isUser ? "הודעה שלך" : "תגובת העוזר"}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center",
          isUser ? "bg-emerald-500 text-white" : "bg-orange-500 text-white"
        )}
        aria-hidden="true"
      >
        {isUser ? (
          <User className="w-4 h-4 sm:w-5 sm:h-5" />
        ) : (
          <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-2 min-w-0 text-right">
        <p className="text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed text-sm sm:text-base break-words text-right">
          {message.content}
          {message.isStreaming && (
            <span className="inline-block w-2 h-4 bg-emerald-500 animate-pulse mr-1 align-middle" />
          )}
        </p>

        {message.actions && message.actions.length > 0 && (
          <div
            className="flex flex-wrap gap-2 mt-2"
            role="list"
            aria-label="פעולות"
          >
            {message.actions.map((action, idx) => (
              <ActionBadge key={idx} action={action} />
            ))}
          </div>
        )}

        {/* Footer: Timestamp + Action Buttons */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {message.timestamp.toLocaleTimeString("he-IL", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          {/* Action buttons - show on hover */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{copied ? "הועתק!" : "העתק"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {showShareButton && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-500 hover:text-green-600 dark:text-slate-400 dark:hover:text-green-400"
                      onClick={handleShareWhatsApp}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>שתף בוואטסאפ</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionBadge({ action }: { action: ChatAction }) {
  const statusColors = {
    pending:
      "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700",
    completed:
      "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700",
    failed:
      "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700",
  };

  const typeIcons: Record<string, string> = {
    crm_add: "+",
    crm_update: "~",
    calendar_add: "#",
    search_result: "?",
    memory: "*",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border",
        action.status
          ? statusColors[action.status]
          : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600"
      )}
    >
      <span>{typeIcons[action.type] || ">"}</span>
      <span>{action.label}</span>
    </span>
  );
}
