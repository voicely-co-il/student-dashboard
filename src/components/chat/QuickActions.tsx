import { UserPlus, Calendar, Search, FileText, Sparkles } from "lucide-react";

interface QuickActionsProps {
  onAction: (action: string) => void;
}

const actions = [
  {
    id: "add_student",
    label: "הוסף תלמיד",
    icon: UserPlus,
    prompt: "אני רוצה להוסיף תלמיד חדש",
  },
  {
    id: "schedule_lesson",
    label: "קבע שיעור",
    icon: Calendar,
    prompt: "אני רוצה לקבוע שיעור",
  },
  {
    id: "search_lessons",
    label: "חפש בשיעורים",
    icon: Search,
    prompt: "אני רוצה לחפש משהו בשיעורים הקודמים",
  },
  {
    id: "lesson_plan",
    label: "תכנית שיעור",
    icon: FileText,
    prompt: "עזור לי לתכנן שיעור",
  },
  {
    id: "insights",
    label: "תובנות",
    icon: Sparkles,
    prompt: "תן לי תובנות על התלמידים שלי",
  },
];

export function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <div
      className="flex flex-wrap gap-1.5 sm:gap-2 px-3 sm:px-4 pb-3 overflow-x-auto"
      role="toolbar"
      aria-label="פעולות מהירות"
    >
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => onAction(action.prompt)}
          className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 shadow-sm hover:bg-emerald-500 hover:text-white hover:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 transition-colors"
          aria-label={action.label}
        >
          <action.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          {action.label}
        </button>
      ))}
    </div>
  );
}
