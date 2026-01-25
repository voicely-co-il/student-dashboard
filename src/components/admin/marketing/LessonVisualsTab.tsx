import { useState } from "react";
import {
  useLessonVisuals,
  useRecentVisuals,
  useGenerateVisual,
  useDeleteVisual,
  LessonVisual,
} from "@/hooks/admin/useLessonVisuals";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Image,
  Sparkles,
  Trash2,
  Download,
  Loader2,
  RefreshCw,
  ExternalLink,
  Calendar,
  User,
  Wand2,
  ImagePlus,
  Clock,
  Check,
  X,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

function StatusBadge({ status }: { status: LessonVisual["status"] }) {
  const variants = {
    pending: { color: "bg-yellow-100 text-yellow-700", label: "ממתין", icon: Clock },
    generating: { color: "bg-blue-100 text-blue-700", label: "מייצר", icon: Loader2 },
    completed: { color: "bg-green-100 text-green-700", label: "הושלם", icon: Check },
    failed: { color: "bg-red-100 text-red-700", label: "נכשל", icon: X },
  };

  const variant = variants[status] || variants.pending;
  const Icon = variant.icon;

  return (
    <Badge variant="secondary" className={cn("gap-1", variant.color)}>
      <Icon className={cn("w-3 h-3", status === "generating" && "animate-spin")} />
      {variant.label}
    </Badge>
  );
}

function VisualCard({ visual, onDelete }: { visual: LessonVisual; onDelete: () => void }) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <>
      <Card className="overflow-hidden group">
        {/* Preview */}
        <div className="aspect-square bg-muted relative">
          {visual.image_url ? (
            <img
              src={visual.image_url}
              alt={`תמונה לשיעור של ${visual.student_name}`}
              className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
              onClick={() => setShowPreview(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {visual.status === "generating" ? (
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              ) : visual.status === "failed" ? (
                <X className="w-8 h-8 text-red-400" />
              ) : (
                <Image className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
          )}
          <div className="absolute top-2 right-2">
            <StatusBadge status={visual.status} />
          </div>
          {visual.image_url && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                variant="secondary"
                size="sm"
                className="gap-1"
                onClick={() => setShowPreview(true)}
              >
                <Eye className="w-4 h-4" />
                הצג
              </Button>
            </div>
          )}
        </div>

        {/* Info */}
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-sm truncate flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                {visual.student_name || "תלמיד"}
              </p>
              {visual.lesson_date && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(visual.lesson_date).toLocaleDateString("he-IL")}
                </p>
              )}
            </div>
            <Badge variant="outline" className="shrink-0 text-[10px]">
              {visual.model}
            </Badge>
          </div>

          {visual.prompt && (
            <p className="text-xs text-muted-foreground line-clamp-2" dir="ltr">
              {visual.prompt}
            </p>
          )}

          {visual.error_message && (
            <p className="text-xs text-red-500 line-clamp-2">{visual.error_message}</p>
          )}

          {/* Actions */}
          <div className="flex gap-1 pt-1">
            {visual.image_url && (
              <>
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                  <a href={visual.image_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                  <a href={visual.image_url} download>
                    <Download className="w-3 h-3" />
                  </a>
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive ms-auto"
              onClick={onDelete}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Full Preview Dialog */}
      {showPreview && visual.image_url && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {visual.student_name} - {visual.lesson_date && new Date(visual.lesson_date).toLocaleDateString("he-IL")}
              </DialogTitle>
            </DialogHeader>
            <div className="relative">
              <img
                src={visual.image_url}
                alt=""
                className="w-full rounded-lg"
              />
            </div>
            {visual.prompt && (
              <p className="text-sm text-muted-foreground" dir="ltr">{visual.prompt}</p>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function GenerateVisualDialog() {
  const [open, setOpen] = useState(false);
  const [lessonContent, setLessonContent] = useState("");
  const [studentName, setStudentName] = useState("");
  const [lessonDate, setLessonDate] = useState(new Date().toISOString().split("T")[0]);
  const [style, setStyle] = useState<"cartoon" | "watercolor" | "realistic" | "minimalist">("cartoon");

  const generateVisual = useGenerateVisual();

  const STYLE_OPTIONS = [
    { value: "cartoon", label: "קריקטורה צבעונית", emoji: "🎨" },
    { value: "watercolor", label: "צבעי מים", emoji: "🖌️" },
    { value: "realistic", label: "ריאליסטי", emoji: "📷" },
    { value: "minimalist", label: "מינימליסטי", emoji: "✨" },
  ];

  const handleGenerate = async () => {
    if (!lessonContent.trim()) return;

    await generateVisual.mutateAsync({
      lesson_content: lessonContent.trim(),
      student_name: studentName.trim() || "תלמיד",
      lesson_date: lessonDate,
      style,
    });

    setOpen(false);
    setLessonContent("");
    setStudentName("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <ImagePlus className="w-4 h-4" />
          צור תמונה חדשה
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-emerald-500" />
            יצירת תמונה לשיעור
          </DialogTitle>
          <DialogDescription>
            הכנס תוכן מהשיעור והמערכת תיצור תמונה מחזקת ומעודדת לתלמיד
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">שם התלמיד</label>
              <Input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="שם התלמיד..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">תאריך השיעור</label>
              <Input
                type="date"
                value={lessonDate}
                onChange={(e) => setLessonDate(e.target.value)}
              />
            </div>
          </div>

          {/* Lesson Content */}
          <div className="space-y-2">
            <label className="text-sm font-medium">תוכן/תמלול השיעור *</label>
            <Textarea
              value={lessonContent}
              onChange={(e) => setLessonContent(e.target.value)}
              placeholder="הדבק כאן את תמלול השיעור או נקודות מרכזיות מהשיעור..."
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              המערכת תזהה אוטומטית רגעים חיוביים ותיצור prompt לתמונה
            </p>
          </div>

          {/* Style Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">סגנון התמונה</label>
            <div className="grid grid-cols-4 gap-2">
              {STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStyle(opt.value as typeof style)}
                  className={cn(
                    "p-3 rounded-lg border text-center transition-all",
                    style === opt.value
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                      : "border-muted hover:border-emerald-200"
                  )}
                >
                  <div className="text-xl mb-1">{opt.emoji}</div>
                  <div className="text-[10px]">{opt.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Cost Note */}
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span className="font-medium">Gemini Imagen</span>
              <Badge variant="outline" className="ms-auto">~$0.04</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              התמונה תיווצר עם Gemini 2.0 Flash - תמונות צבעוניות ומעודדות
            </p>
          </div>

          {/* Generate Button */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!lessonContent.trim() || generateVisual.isPending}
              className="min-w-[120px]"
            >
              {generateVisual.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ms-2" />
                  מייצר...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 ms-2" />
                  צור תמונה
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <Card key={i}>
          <Skeleton className="aspect-square" />
          <CardContent className="p-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32 mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function LessonVisualsTab() {
  const { data: visuals, isLoading, refetch, isFetching } = useLessonVisuals();
  const { data: recentVisuals } = useRecentVisuals(4);
  const deleteVisual = useDeleteVisual();
  const [filter, setFilter] = useState<"all" | "completed" | "pending" | "failed">("all");
  const [search, setSearch] = useState("");

  const filteredVisuals = visuals?.filter((v) => {
    if (filter !== "all" && v.status !== filter) return false;
    if (search && !v.student_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Image className="w-5 h-5 text-emerald-500" />
            תמונות שיעור
          </h2>
          <p className="text-sm text-muted-foreground">
            תמונות ויזואליות מחזקות לתלמידים מתמלולי שיעורים
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn("w-4 h-4 ms-2", isFetching && "animate-spin")} />
            רענן
          </Button>
          <GenerateVisualDialog />
        </div>
      </div>

      {/* Recent Visuals (Quick Preview) */}
      {recentVisuals && recentVisuals.length > 0 && (
        <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />
              אחרונות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3">
              {recentVisuals.map((v) => (
                <div key={v.id} className="aspect-square rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
                  {v.image_url ? (
                    <img src={v.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="חיפוש לפי שם תלמיד..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">הכל</SelectItem>
            <SelectItem value="completed">הושלמו</SelectItem>
            <SelectItem value="pending">ממתינים</SelectItem>
            <SelectItem value="failed">נכשלו</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Visuals Grid */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : filteredVisuals.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredVisuals.map((visual) => (
            <VisualCard
              key={visual.id}
              visual={visual}
              onDelete={() => deleteVisual.mutate(visual.id)}
            />
          ))}
        </div>
      ) : (
        <Card className="py-12">
          <CardContent className="text-center">
            <Image className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">
              {search ? "לא נמצאו תוצאות" : "עדיין אין תמונות"}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {search ? "נסה לחפש שם אחר" : "צור את התמונה הראשונה לתלמיד"}
            </p>
            <GenerateVisualDialog />
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-gradient-to-r from-emerald-50 to-cyan-50 dark:from-emerald-950/30 dark:to-cyan-950/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium">איך זה עובד?</p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>1. הכנס תמלול או סיכום מהשיעור</li>
                <li>2. GPT-4o מחלץ נקודות מפתח ויזואליות</li>
                <li>3. Gemini מייצר תמונה מחזקת ומעודדת</li>
                <li>4. התמונה נשמרת בגלריית התלמיד</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
