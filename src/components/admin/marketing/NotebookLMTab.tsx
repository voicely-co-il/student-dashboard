import { useState, useMemo } from "react";
import {
  useNotebookLMContent,
  useGenerateFromContent,
  useGenerateFromTranscripts,
  useDeleteNotebookLMContent,
  usePendingCount,
  useProcessQueue,
  useTranscripts,
  useTranscriptStudents,
  NotebookLMContent,
  TranscriptItem,
} from "@/hooks/admin/useNotebookLM";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mic,
  Presentation,
  BarChart3,
  HelpCircle,
  Plus,
  Trash2,
  Download,
  Loader2,
  ExternalLink,
  BookOpen,
  RefreshCw,
  Clock,
  FileText,
  Sparkles,
  Play,
  Search,
  Users,
  Calendar,
  ChevronDown,
  Terminal,
  Info,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type ContentTypeFilter = "all" | "podcast" | "slides" | "infographic" | "question";

const CONTENT_TYPES = [
  { value: "podcast", label: "פודקסט", icon: Mic, color: "text-purple-500", description: "שיחה של שני מגישים על התוכן" },
  { value: "slides", label: "מצגת", icon: Presentation, color: "text-blue-500", description: "מצגת עם שקפים מרכזיים" },
  { value: "infographic", label: "אינפוגרפיקה", icon: BarChart3, color: "text-green-500", description: "תמונה ויזואלית עם נקודות מרכזיות" },
] as const;

const QUESTION_TYPE = { value: "question", label: "שאלה", icon: HelpCircle, color: "text-orange-500" };

function ContentTypeIcon({ type, className }: { type: string; className?: string }) {
  const allTypes = [...CONTENT_TYPES, QUESTION_TYPE];
  const contentType = allTypes.find((t) => t.value === type);
  if (!contentType) return null;
  const Icon = contentType.icon;
  return <Icon className={cn("w-4 h-4", contentType.color, className)} />;
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { color: string; label: string }> = {
    pending: { color: "bg-yellow-100 text-yellow-700", label: "ממתין" },
    processing: { color: "bg-blue-100 text-blue-700", label: "בתהליך" },
    completed: { color: "bg-green-100 text-green-700", label: "הושלם" },
    failed: { color: "bg-red-100 text-red-700", label: "נכשל" },
  };

  const variant = variants[status] || variants.pending;

  return (
    <Badge variant="secondary" className={cn("gap-1", variant.color)}>
      {status === "processing" && <Loader2 className="w-3 h-3 animate-spin" />}
      {variant.label}
    </Badge>
  );
}

function ContentCard({
  content,
  onDelete,
}: {
  content: NotebookLMContent;
  onDelete: () => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-video bg-muted flex items-center justify-center">
        {content.thumbnail_url ? (
          <img
            src={content.thumbnail_url}
            alt={content.title || "תוכן"}
            className="w-full h-full object-cover"
          />
        ) : (
          <ContentTypeIcon type={content.content_type} className="w-12 h-12 opacity-30" />
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <ContentTypeIcon type={content.content_type} />
            <span className="font-medium text-sm truncate">
              {content.title || content.notebook_name || "ללא כותרת"}
            </span>
          </div>
          <StatusBadge status={content.status} />
        </div>

        {content.content_type === "question" && content.answer && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {content.answer}
          </p>
        )}

        {content.duration_seconds && (
          <p className="text-xs text-muted-foreground mb-2">
            {Math.floor(content.duration_seconds / 60)}:{String(content.duration_seconds % 60).padStart(2, "0")}
          </p>
        )}

        {content.error_message && (
          <p className="text-xs text-red-500 mb-2">{content.error_message}</p>
        )}

        <div className="flex items-center gap-2 mt-3">
          {content.content_url && (
            <>
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a href={content.content_url} download>
                  <Download className="w-4 h-4" />
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a href={content.content_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="text-red-500 hover:text-red-600 mr-auto"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateContentDialog({
  onGenerate,
  isPending,
  trigger,
}: {
  onGenerate: (params: {
    title: string;
    content: string;
    outputs: ("podcast" | "slides" | "infographic")[];
    question?: string;
  }) => void;
  isPending: boolean;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [question, setQuestion] = useState("");
  const [selectedOutputs, setSelectedOutputs] = useState<Set<"podcast" | "slides" | "infographic">>(new Set(["podcast"]));

  const toggleOutput = (output: "podcast" | "slides" | "infographic") => {
    const newSet = new Set(selectedOutputs);
    if (newSet.has(output)) {
      newSet.delete(output);
    } else {
      newSet.add(output);
    }
    setSelectedOutputs(newSet);
  };

  const handleSubmit = () => {
    if (!title || !content || selectedOutputs.size === 0) return;

    onGenerate({
      title,
      content,
      outputs: Array.from(selectedOutputs),
      question: question || undefined,
    });

    setOpen(false);
    setTitle("");
    setContent("");
    setQuestion("");
    setSelectedOutputs(new Set(["podcast"]));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            יצירת תוכן מטקסט חופשי
          </DialogTitle>
          <DialogDescription>
            הכנס תמלול או תוכן ידנית, והמערכת תיצור ממנו את התוצרים שבחרת
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium mb-2 block">כותרת</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="למשל: שיעור פיתוח קול - טכניקות נשימה"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <FileText className="w-4 h-4" />
              תוכן / תמלול
            </label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="הדבק כאן את התמלול או התוכן שממנו תרצה ליצור את התוצרים..."
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {content.length.toLocaleString()} תווים
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-3 block">בחר תוצרים ליצירה</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {CONTENT_TYPES.map((type) => (
                <div
                  key={type.value}
                  className={cn(
                    "border rounded-lg p-3 cursor-pointer transition-all",
                    selectedOutputs.has(type.value)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                  onClick={() => toggleOutput(type.value)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Checkbox
                      checked={selectedOutputs.has(type.value)}
                      onCheckedChange={() => toggleOutput(type.value)}
                    />
                    <type.icon className={cn("w-4 h-4", type.color)} />
                    <span className="font-medium text-sm">{type.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mr-6">
                    {type.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-orange-500" />
              שאלה (אופציונלי)
            </label>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="שאל שאלה על התוכן והמערכת תענה..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setOpen(false)}>
            ביטול
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title || !content || selectedOutputs.size === 0 || isPending}
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
            <Sparkles className="w-4 h-4 ml-2" />
            צור {selectedOutputs.size} תוצרים
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Transcript Picker Dialog - select transcripts from the database
function SetupGuide() {
  const [isOpen, setIsOpen] = useState(false);

  const steps = [
    {
      title: "התחל את MCP Server",
      command: "notebooklm-mcp --transport http --port 3456",
      description: "מפעיל את השרת המקומי שמתחבר ל-NotebookLM",
    },
    {
      title: "עבד את התור",
      command: "npx tsx scripts/process-notebooklm-queue.ts",
      description: "מעבד את כל הפריטים שממתינים בתור",
    },
    {
      title: "הרצה רציפה (אופציונלי)",
      command: "npx tsx scripts/process-notebooklm-queue.ts --watch",
      description: "מריץ כל 30 שניות אוטומטית כשהמחשב דלוק",
    },
  ];

  const troubleshooting = [
    {
      problem: "שגיאת Authentication",
      solution: "הרץ notebooklm-mcp-auth והתחבר מחדש לחשבון Google",
    },
    {
      problem: "MCP Server לא מגיב",
      solution: "בדוק שהפורט 3456 פנוי או הפעל מחדש את השרת",
    },
  ];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-dashed">
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Terminal className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-medium flex items-center gap-2">
                    מדריך הפעלה
                    <Badge variant="outline" className="text-xs">Worker מקומי</Badge>
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    איך לעבד את התור באופן מקומי על המחשב שלך
                  </p>
                </div>
              </div>
              <ChevronDown className={cn(
                "w-5 h-5 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )} />
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 px-4 pb-4 space-y-6">
            {/* Divider */}
            <div className="border-t" />

            {/* How it works */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-500" />
                איך זה עובד?
              </h4>
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-2">
                <p>1. אתה יוצר תוכן בממשק → נוצרת רשומה "ממתין" ב-DB</p>
                <p>2. הסקריפט המקומי קורא את התור ומעבד אותו דרך NotebookLM</p>
                <p>3. התוצרים (פודקסט/מצגת/אינפוגרפיקה) נשמרים ומוצגים כאן</p>
              </div>
            </div>

            {/* Steps */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                שלבי הפעלה
              </h4>
              <div className="space-y-3">
                {steps.map((step, i) => (
                  <div key={i} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                        {i + 1}
                      </Badge>
                      <span className="font-medium text-sm">{step.title}</span>
                    </div>
                    <code className="block bg-zinc-900 text-zinc-100 rounded px-3 py-2 text-xs font-mono mb-2 overflow-x-auto" dir="ltr">
                      {step.command}
                    </code>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Troubleshooting */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                פתרון בעיות
              </h4>
              <div className="space-y-2">
                {troubleshooting.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <Badge variant="outline" className="shrink-0 text-xs">בעיה</Badge>
                    <div>
                      <span className="font-medium">{item.problem}</span>
                      <span className="text-muted-foreground"> → {item.solution}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Files reference */}
            <div className="bg-muted/30 rounded-lg p-3 text-xs">
              <p className="font-medium mb-2">קבצים רלוונטיים:</p>
              <ul className="space-y-1 text-muted-foreground font-mono" dir="ltr">
                <li>scripts/process-notebooklm-queue.ts - Worker</li>
                <li>scripts/check-queue.ts - בדיקת סטטוס</li>
                <li>~/.notebooklm-mcp/auth.json - Cookies</li>
              </ul>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// Transcript Picker Dialog - select transcripts from the database
function TranscriptPickerDialog({
  trigger,
}: {
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [studentFilter, setStudentFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedOutputs, setSelectedOutputs] = useState<Set<"podcast" | "slides" | "infographic">>(new Set(["podcast"]));
  const [customTitle, setCustomTitle] = useState("");

  const { data: transcripts = [], isLoading } = useTranscripts(search || undefined);
  const { data: students = [] } = useTranscriptStudents();
  const generateFromTranscripts = useGenerateFromTranscripts();

  const filteredTranscripts = useMemo(() => {
    if (studentFilter === "all") return transcripts;
    return transcripts.filter((t) => t.student_name === studentFilter);
  }, [transcripts, studentFilter]);

  const toggleTranscript = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleOutput = (output: "podcast" | "slides" | "infographic") => {
    const newSet = new Set(selectedOutputs);
    if (newSet.has(output)) {
      newSet.delete(output);
    } else {
      newSet.add(output);
    }
    setSelectedOutputs(newSet);
  };

  const handleGenerate = () => {
    if (selectedIds.size === 0 || selectedOutputs.size === 0) return;

    generateFromTranscripts.mutate({
      transcript_ids: Array.from(selectedIds),
      outputs: Array.from(selectedOutputs),
      title: customTitle || undefined,
    });

    setOpen(false);
    setSelectedIds(new Set());
    setCustomTitle("");
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString("he-IL", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            יצירת תוכן מתמלולים
          </DialogTitle>
          <DialogDescription>
            בחר תמלולי שיעורים מהמערכת ליצירת פודקסט, מצגת או אינפוגרפיקה
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Search & Filter */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חפש לפי כותרת או שם תלמיד..."
                className="pr-9"
              />
            </div>
            <Select value={studentFilter} onValueChange={setStudentFilter}>
              <SelectTrigger className="w-48">
                <Users className="w-4 h-4 ml-2" />
                <SelectValue placeholder="כל התלמידים" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל התלמידים</SelectItem>
                {students.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected count */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
              <span className="text-sm font-medium">
                {selectedIds.size} תמלולים נבחרו
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                נקה בחירה
              </Button>
            </div>
          )}

          {/* Transcript list */}
          <div className="border rounded-lg max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : filteredTranscripts.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                לא נמצאו תמלולים
              </div>
            ) : (
              <div className="divide-y">
                {filteredTranscripts.map((transcript) => (
                  <div
                    key={transcript.id}
                    className={cn(
                      "flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                      selectedIds.has(transcript.id) && "bg-primary/5"
                    )}
                    onClick={() => toggleTranscript(transcript.id)}
                  >
                    <Checkbox
                      checked={selectedIds.has(transcript.id)}
                      onCheckedChange={() => toggleTranscript(transcript.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {transcript.title || "ללא כותרת"}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {transcript.student_name && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {transcript.student_name}
                          </span>
                        )}
                        {transcript.lesson_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(transcript.lesson_date)}
                          </span>
                        )}
                        {transcript.word_count && (
                          <span>{transcript.word_count.toLocaleString()} מילים</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Custom title */}
          <div>
            <label className="text-sm font-medium mb-2 block">כותרת מותאמת (אופציונלי)</label>
            <Input
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="הכותרת תיווצר אוטומטית מהתמלולים אם לא תמלא"
            />
          </div>

          {/* Output Types */}
          <div>
            <label className="text-sm font-medium mb-3 block">בחר תוצרים ליצירה</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {CONTENT_TYPES.map((type) => (
                <div
                  key={type.value}
                  className={cn(
                    "border rounded-lg p-3 cursor-pointer transition-all",
                    selectedOutputs.has(type.value)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                  onClick={() => toggleOutput(type.value)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Checkbox
                      checked={selectedOutputs.has(type.value)}
                      onCheckedChange={() => toggleOutput(type.value)}
                    />
                    <type.icon className={cn("w-4 h-4", type.color)} />
                    <span className="font-medium text-sm">{type.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mr-6">
                    {type.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setOpen(false)}>
            ביטול
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={selectedIds.size === 0 || selectedOutputs.size === 0 || generateFromTranscripts.isPending}
          >
            {generateFromTranscripts.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
            <Sparkles className="w-4 h-4 ml-2" />
            צור {selectedOutputs.size} תוצרים מ-{selectedIds.size} תמלולים
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function NotebookLMTab() {
  const [filter, setFilter] = useState<ContentTypeFilter>("all");
  const { data: content, isLoading: isLoadingContent, refetch } = useNotebookLMContent(
    filter === "all" ? undefined : filter
  );

  const generateFromContent = useGenerateFromContent();
  const deleteContent = useDeleteNotebookLMContent();
  const processQueue = useProcessQueue();
  const { data: pendingCount = 0 } = usePendingCount();

  const handleGenerate = (params: {
    title: string;
    content: string;
    outputs: ("podcast" | "slides" | "infographic")[];
    question?: string;
  }) => {
    generateFromContent.mutate(params);
  };

  const allFilterTypes = [...CONTENT_TYPES, QUESTION_TYPE];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            NotebookLM Studio
          </h2>
          <p className="text-sm text-muted-foreground">
            צור פודקסטים, מצגות ואינפוגרפיקות מתמלולי שיעורים
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>

          {/* Primary action: Generate from transcripts */}
          <TranscriptPickerDialog
            trigger={
              <Button>
                <FileText className="w-4 h-4 ml-2" />
                יצירה מתמלולים
              </Button>
            }
          />

          {/* Secondary action: Manual text input */}
          <CreateContentDialog
            onGenerate={handleGenerate}
            isPending={generateFromContent.isPending}
            trigger={
              <Button variant="outline">
                <Plus className="w-4 h-4 ml-2" />
                טקסט חופשי
              </Button>
            }
          />
        </div>
      </div>

      {/* Queue Status & Filters */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            הכל
          </Button>
          {allFilterTypes.map((type) => (
            <Button
              key={type.value}
              variant={filter === type.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(type.value as ContentTypeFilter)}
            >
              <type.icon className={cn("w-4 h-4 ml-1", filter !== type.value && type.color)} />
              {type.label}
            </Button>
          ))}
        </div>

        {/* Queue Status */}
        {pendingCount > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-700">
              <Clock className="w-3 h-3" />
              {pendingCount} בתור
            </Badge>
            <Button
              variant="default"
              size="sm"
              onClick={() => processQueue.mutate()}
              disabled={processQueue.isPending}
              className="gap-1"
            >
              {processQueue.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              עבד עכשיו
            </Button>
          </div>
        )}
      </div>

      {/* Content Grid */}
      {isLoadingContent ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <Skeleton className="aspect-video" />
              <CardContent className="p-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : content && content.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {content.map((item) => (
            <ContentCard
              key={item.id}
              content={item}
              onDelete={() => deleteContent.mutate(item.id)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-1">אין תוכן עדיין</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              בחר תמלולי שיעורים מהמערכת וצור מהם פודקסטים, מצגות ואינפוגרפיקות באופן אוטומטי
            </p>
            <TranscriptPickerDialog
              trigger={
                <Button>
                  <FileText className="w-4 h-4 ml-2" />
                  יצירה מתמלולים
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Setup Guide */}
      <SetupGuide />
    </div>
  );
}
