import { useState } from "react";
import {
  useMarketingAssets,
  useGenerateImage,
  useGenerateCreativeImage,
  useGenerateVideo,
  useGenerateVoice,
  useGenerateAvatar,
  useDeleteAsset,
  useMarketingCostThisMonth,
  useMarketingScenarios,
  useMarketingModels,
  MarketingAsset,
  MarketingScenario,
  MarketingModel,
} from "@/hooks/admin/useMarketingAssets";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Video,
  Mic,
  Plus,
  Trash2,
  Download,
  Loader2,
  Sparkles,
  DollarSign,
  RefreshCw,
  ExternalLink,
  Users,
  Palette,
  Film,
  FolderOpen,
  Settings,
  Wand2,
  BookOpen,
  AudioLines,
  UserCircle,
  Play,
  Pause,
  ImagePlus,
} from "lucide-react";
import NotebookLMTab from "@/components/admin/marketing/NotebookLMTab";
import LessonVisualsTab from "@/components/admin/marketing/LessonVisualsTab";
import { cn } from "@/lib/utils";

type StudioTab = "characters" | "creative" | "video" | "voice" | "avatar" | "notebooklm" | "visuals" | "library" | "settings";

/** Proxy Astria image URLs through our API to avoid CORS issues */
function proxyImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'mp.astria.ai' || parsed.hostname === 'cdn.astria.ai' || parsed.hostname.endsWith('.amazonaws.com')) {
      return `/api/image-proxy?url=${encodeURIComponent(url)}`;
    }
  } catch {
    // not a valid URL, return as-is
  }
  return url;
}

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1 (ריבוע)" },
  { value: "3:4", label: "3:4 (פורטרט)" },
  { value: "9:16", label: "9:16 (סטורי)" },
  { value: "16:9", label: "16:9 (לרוחב)" },
  { value: "4:3", label: "4:3 (קלאסי)" },
];

function AssetTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "image":
      return <Image className="w-4 h-4" />;
    case "video":
      return <Video className="w-4 h-4" />;
    case "audio":
    case "voice":
      return <Mic className="w-4 h-4" />;
    default:
      return <Image className="w-4 h-4" />;
  }
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
      {variant.label}
    </Badge>
  );
}

function AssetCard({ asset, onDelete }: { asset: MarketingAsset; onDelete: () => void }) {
  return (
    <Card className="overflow-hidden">
      {/* Preview */}
      <div className="aspect-square bg-muted relative">
        {asset.url ? (
          <img
            src={proxyImageUrl(asset.url) || asset.url}
            alt={asset.title || "Generated asset"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {asset.status === "processing" ? (
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            ) : (
              <AssetTypeIcon type={asset.asset_type} />
            )}
          </div>
        )}
        <div className="absolute top-2 right-2">
          <StatusBadge status={asset.status} />
        </div>
      </div>

      {/* Info */}
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{asset.title || "ללא כותרת"}</p>
            <p className="text-xs text-muted-foreground">
              {asset.service} • {new Date(asset.created_at).toLocaleDateString("he-IL")}
            </p>
          </div>
          <Badge variant="outline" className="shrink-0">
            ${asset.estimated_cost_usd.toFixed(2)}
          </Badge>
        </div>

        {asset.prompt && (
          <p className="text-xs text-muted-foreground line-clamp-2">{asset.prompt}</p>
        )}

        {/* Actions */}
        <div className="flex gap-1 pt-1">
          {asset.url && (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                <a href={asset.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                <a href={asset.url} download>
                  <Download className="w-3 h-3" />
                </a>
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function GenerateImageDialog() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<string>("3:4");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedScenario, setSelectedScenario] = useState<string>("");
  const [title, setTitle] = useState("");

  const generateImage = useGenerateImage();
  const { data: scenarios } = useMarketingScenarios();
  const { data: models } = useMarketingModels();

  const handleScenarioSelect = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = scenarios?.find(s => s.id === scenarioId);
    if (scenario) {
      setPrompt(scenario.prompt_template);
      setTitle(scenario.name_he);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !selectedModel) return;

    const model = models?.find(m => m.id === selectedModel);

    await generateImage.mutateAsync({
      prompt: prompt.trim(),
      negative_prompt: negativePrompt.trim() || undefined,
      aspect_ratio: aspectRatio as "1:1" | "9:16" | "16:9" | "4:3" | "3:4",
      character: model?.name as "inbal" | "ilya",
      title: title.trim() || undefined,
    });

    setOpen(false);
    setPrompt("");
    setNegativePrompt("");
    setTitle("");
    setSelectedScenario("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Sparkles className="w-4 h-4" />
          צור תמונה
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            יצירת תמונה עם AI
          </DialogTitle>
          <DialogDescription>
            בחר דמות, סגנון ותאר את התמונה שתרצה ליצור
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Step 1: Select Character */}
          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center gap-2">
              <span className="bg-purple-100 text-purple-700 rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span>
              בחר דמות *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {models?.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => setSelectedModel(model.id)}
                  className={cn(
                    "p-4 rounded-lg border-2 text-center transition-all",
                    selectedModel === model.id
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30"
                      : "border-muted hover:border-purple-200"
                  )}
                >
                  <div className="text-2xl mb-1">
                    {model.name === "inbal" ? "👩" : "👨"}
                  </div>
                  <div className="font-medium">{model.name_he}</div>
                  <div className="text-xs text-muted-foreground">{model.token}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Select Scenario */}
          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center gap-2">
              <span className="bg-purple-100 text-purple-700 rounded-full w-5 h-5 flex items-center justify-center text-xs">2</span>
              בחר סגנון (או כתוב בעצמך)
            </label>
            <div className="flex flex-wrap gap-2">
              {scenarios?.map((scenario) => (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => handleScenarioSelect(scenario.id)}
                  className={cn(
                    "px-3 py-2 rounded-lg border text-sm transition-all flex items-center gap-1.5",
                    selectedScenario === scenario.id
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30"
                      : "border-muted hover:border-purple-200"
                  )}
                >
                  <span>{scenario.emoji}</span>
                  <span>{scenario.name_he}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Customize Prompt */}
          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center gap-2">
              <span className="bg-purple-100 text-purple-700 rounded-full w-5 h-5 flex items-center justify-center text-xs">3</span>
              תיאור התמונה *
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="תאר את התמונה שאתה רוצה ליצור..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Advanced Options */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>אפשרויות נוספות</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">כותרת</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="שם לתמונה..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">יחס תמונה</label>
                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASPECT_RATIOS.map((ratio) => (
                      <SelectItem key={ratio.value} value={ratio.value}>
                        {ratio.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">מה לא לכלול</label>
              <Input
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="blurry, low-res, watermark..."
              />
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || !selectedModel || generateImage.isPending}
              className="min-w-[120px]"
            >
              {generateImage.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ms-2" />
                  יוצר...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 ms-2" />
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

// Tab: Characters (Astria - trained models)
function CharactersTab() {
  const { data: assets, isLoading, error, refetch, isFetching } = useMarketingAssets();
  const deleteAsset = useDeleteAsset();

  // Filter only Astria character images
  const characterAssets = assets?.filter(a => a.service === "astria") || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            דמויות Voicely
          </h2>
          <p className="text-sm text-muted-foreground">
            תמונות של ענבל ואיליה עם מודלים מאומנים (Astria)
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
          <GenerateImageDialog />
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">שגיאה: {String(error)}</p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <LoadingSkeleton />
      ) : characterAssets.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {characterAssets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onDelete={() => deleteAsset.mutate(asset.id)}
            />
          ))}
        </div>
      ) : (
        <Card className="py-12">
          <CardContent className="text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">עדיין אין תמונות דמויות</h3>
            <p className="text-muted-foreground text-sm mb-4">
              צור תמונות של ענבל או איליה עם מודלים מאומנים
            </p>
            <GenerateImageDialog />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Dialog for creating DALL-E images
function GenerateCreativeDialog() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<"vivid" | "natural">("vivid");
  const [size, setSize] = useState<"1024x1024" | "1792x1024" | "1024x1792">("1024x1024");
  const [quality, setQuality] = useState<"standard" | "hd">("standard");
  const [title, setTitle] = useState("");

  const generateImage = useGenerateCreativeImage();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    await generateImage.mutateAsync({
      prompt: prompt.trim(),
      style,
      size,
      quality,
      title: title.trim() || undefined,
    });

    setOpen(false);
    setPrompt("");
    setTitle("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Wand2 className="w-4 h-4" />
          צור תמונה
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-pink-500" />
            יצירת תמונה עם DALL-E 3
          </DialogTitle>
          <DialogDescription>
            תאר את התמונה שתרצה ליצור - אינפוגרפיקה, איור, באנר וכו'
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">תיאור התמונה *</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="תאר בפירוט את התמונה שאתה רוצה... לדוגמה: אינפוגרפיקה על יתרונות שיעורי קול, בסגנון מודרני עם צבעי טורקיז וקורל"
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">סגנון</label>
              <Select value={style} onValueChange={(v) => setStyle(v as typeof style)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vivid">חי ודרמטי</SelectItem>
                  <SelectItem value="natural">טבעי ומציאותי</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">גודל</label>
              <Select value={size} onValueChange={(v) => setSize(v as typeof size)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1024x1024">1024×1024 (ריבוע)</SelectItem>
                  <SelectItem value="1792x1024">1792×1024 (לרוחב)</SelectItem>
                  <SelectItem value="1024x1792">1024×1792 (לגובה)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">איכות</label>
              <Select value={quality} onValueChange={(v) => setQuality(v as typeof quality)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">רגילה ($0.04)</SelectItem>
                  <SelectItem value="hd">גבוהה HD ($0.08)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">כותרת</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="שם לתמונה..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || generateImage.isPending}
              className="min-w-[120px]"
            >
              {generateImage.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ms-2" />
                  יוצר...
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

// Tab: Creative (DALL-E / ChatGPT Image - general purpose)
function CreativeTab() {
  const { data: assets, isLoading, refetch, isFetching } = useMarketingAssets();
  const deleteAsset = useDeleteAsset();

  // Filter only DALL-E images
  const creativeAssets = assets?.filter(a => a.service === "dalle3") || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Palette className="w-5 h-5 text-pink-500" />
            יצירה חופשית
          </h2>
          <p className="text-sm text-muted-foreground">
            תמונות כלליות עם DALL-E 3 / ChatGPT Image
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
          <GenerateCreativeDialog />
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : creativeAssets.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {creativeAssets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onDelete={() => deleteAsset.mutate(asset.id)}
            />
          ))}
        </div>
      ) : (
        <Card className="py-12">
          <CardContent className="text-center">
            <Palette className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">עדיין אין תמונות יצירתיות</h3>
            <p className="text-muted-foreground text-sm mb-4">
              צור אינפוגרפיקה, איורים ותמונות כלליות עם DALL-E 3
            </p>
            <GenerateCreativeDialog />
          </CardContent>
        </Card>
      )}

      <Card className="bg-gradient-to-r from-pink-50 to-orange-50 dark:from-pink-950/30 dark:to-orange-950/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-pink-500/10">
              <Sparkles className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <p className="font-medium">טיפים ליצירה טובה</p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• תאר בפירוט מה אתה רוצה לראות</li>
                <li>• ציין סגנון: מודרני, מינימליסטי, צבעוני וכו'</li>
                <li>• הוסף צבעי מותג: טורקיז (#00C6AE) וקורל (#FF6F61)</li>
                <li>• לאינפוגרפיקה: ציין את המידע שצריך להופיע</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Dialog for creating videos
function GenerateVideoDialog() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<"text-to-video" | "image-to-video">("text-to-video");
  const [imageUrl, setImageUrl] = useState("");
  const [duration, setDuration] = useState<"5" | "10">("5");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [title, setTitle] = useState("");

  const generateVideo = useGenerateVideo();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (mode === "image-to-video" && !imageUrl.trim()) return;

    await generateVideo.mutateAsync({
      prompt: prompt.trim(),
      mode,
      image_url: mode === "image-to-video" ? imageUrl.trim() : undefined,
      duration,
      aspect_ratio: aspectRatio,
      service: "kling",
      title: title.trim() || undefined,
    });

    setOpen(false);
    setPrompt("");
    setImageUrl("");
    setTitle("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Video className="w-4 h-4" />
          צור וידאו
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="w-5 h-5 text-blue-500" />
            יצירת וידאו עם Kling AI
          </DialogTitle>
          <DialogDescription>
            צור וידאו מטקסט או המר תמונה לאנימציה
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">סוג יצירה</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("text-to-video")}
                className={cn(
                  "p-3 rounded-lg border text-center transition-all",
                  mode === "text-to-video"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                    : "border-muted hover:border-blue-200"
                )}
              >
                <div className="text-sm font-medium">טקסט → וידאו</div>
                <div className="text-xs text-muted-foreground">צור מאפס</div>
              </button>
              <button
                type="button"
                onClick={() => setMode("image-to-video")}
                className={cn(
                  "p-3 rounded-lg border text-center transition-all",
                  mode === "image-to-video"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                    : "border-muted hover:border-blue-200"
                )}
              >
                <div className="text-sm font-medium">תמונה → וידאו</div>
                <div className="text-xs text-muted-foreground">הנפש תמונה</div>
              </button>
            </div>
          </div>

          {/* Image URL (for image-to-video) */}
          {mode === "image-to-video" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">קישור לתמונה *</label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>
          )}

          {/* Prompt */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {mode === "text-to-video" ? "תיאור הוידאו *" : "תיאור התנועה *"}
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                mode === "text-to-video"
                  ? "תאר את הסצנה... לדוגמה: מורה לזמרה מלמדת תלמיד בסטודיו מקצועי"
                  : "תאר את התנועה... לדוגמה: הדמות מתחילה לשיר ולהזיז את הידיים"
              }
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Settings */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">משך</label>
              <Select value={duration} onValueChange={(v) => setDuration(v as typeof duration)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 שניות</SelectItem>
                  <SelectItem value="10">10 שניות</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">יחס</label>
              <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as typeof aspectRatio)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16:9">16:9 לרוחב</SelectItem>
                  <SelectItem value="9:16">9:16 סטורי</SelectItem>
                  <SelectItem value="1:1">1:1 ריבוע</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">כותרת</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="שם..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={
                !prompt.trim() ||
                (mode === "image-to-video" && !imageUrl.trim()) ||
                generateVideo.isPending
              }
              className="min-w-[120px]"
            >
              {generateVideo.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ms-2" />
                  יוצר...
                </>
              ) : (
                <>
                  <Video className="w-4 h-4 ms-2" />
                  צור וידאו
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Tab: Video (Kling / Seedance)
function VideoTab() {
  const { data: assets, isLoading, refetch, isFetching } = useMarketingAssets();
  const deleteAsset = useDeleteAsset();

  // Filter only video assets
  const videoAssets = assets?.filter(a => a.asset_type === "video") || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Film className="w-5 h-5 text-blue-500" />
            וידאו
          </h2>
          <p className="text-sm text-muted-foreground">
            יצירת וידאו עם Kling 2.6 / Seedance
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
          <GenerateVideoDialog />
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : videoAssets.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {videoAssets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onDelete={() => deleteAsset.mutate(asset.id)}
            />
          ))}
        </div>
      ) : (
        <Card className="py-12">
          <CardContent className="text-center">
            <Film className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">עדיין אין וידאו</h3>
            <p className="text-muted-foreground text-sm mb-4">
              צור וידאו מטקסט או הנפש תמונה
            </p>
            <GenerateVideoDialog />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Video className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Kling 2.6</p>
                <p className="text-sm text-muted-foreground mt-1">
                  וידאו ריאליסטי מתמונות או טקסט
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 opacity-60">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">Seedance <Badge variant="outline" className="ms-2">בקרוב</Badge></p>
                <p className="text-sm text-muted-foreground mt-1">
                  אנימציות ריקוד ותנועה
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Dialog for generating voice
function GenerateVoiceDialog() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [voiceName, setVoiceName] = useState("rachel");
  const [stability, setStability] = useState(0.5);
  const [title, setTitle] = useState("");

  const generateVoice = useGenerateVoice();

  const VOICE_OPTIONS = [
    { value: "rachel", label: "Rachel (אנגלית)", emoji: "👩‍🦰" },
    { value: "bella", label: "Bella (נשית)", emoji: "👩" },
    { value: "josh", label: "Josh (גברית)", emoji: "👨" },
  ];

  const handleGenerate = async () => {
    if (!text.trim()) return;

    await generateVoice.mutateAsync({
      text: text.trim(),
      voice_name: voiceName,
      stability,
      title: title.trim() || undefined,
    });

    setOpen(false);
    setText("");
    setTitle("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <AudioLines className="w-4 h-4" />
          צור קול
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AudioLines className="w-5 h-5 text-green-500" />
            יצירת קול עם ElevenLabs
          </DialogTitle>
          <DialogDescription>
            הפוך טקסט לדיבור טבעי עם קולות AI
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Text Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">טקסט לקריינות *</label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="הכנס את הטקסט שברצונך להפוך לדיבור..."
              rows={5}
              className="resize-none"
              maxLength={5000}
            />
            <p className="text-xs text-muted-foreground text-left">
              {text.length}/5000 תווים
            </p>
          </div>

          {/* Voice Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">בחר קול</label>
            <div className="grid grid-cols-3 gap-2">
              {VOICE_OPTIONS.map((voice) => (
                <button
                  key={voice.value}
                  type="button"
                  onClick={() => setVoiceName(voice.value)}
                  className={cn(
                    "p-3 rounded-lg border text-center transition-all",
                    voiceName === voice.value
                      ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                      : "border-muted hover:border-green-200"
                  )}
                >
                  <div className="text-xl mb-1">{voice.emoji}</div>
                  <div className="text-xs">{voice.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">יציבות: {(stability * 100).toFixed(0)}%</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={stability}
                onChange={(e) => setStability(parseFloat(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                נמוך = יותר אקספרסיבי, גבוה = יותר עקבי
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">כותרת</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="שם לקובץ..."
              />
            </div>
          </div>

          {/* Estimated Cost */}
          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            <div className="flex justify-between">
              <span>עלות משוערת:</span>
              <span className="font-medium">${((text.length / 1000) * 0.30).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!text.trim() || generateVoice.isPending}
              className="min-w-[120px]"
            >
              {generateVoice.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ms-2" />
                  יוצר...
                </>
              ) : (
                <>
                  <AudioLines className="w-4 h-4 ms-2" />
                  צור קול
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Tab: Voice (ElevenLabs)
function VoiceTab() {
  const { data: assets, isLoading, refetch, isFetching } = useMarketingAssets();
  const deleteAsset = useDeleteAsset();
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Filter only voice assets
  const voiceAssets = assets?.filter(a => a.asset_type === "voice" || a.service === "elevenlabs") || [];

  const togglePlay = (asset: MarketingAsset) => {
    if (playingId === asset.id) {
      setPlayingId(null);
      // Stop audio
      const audio = document.getElementById(`audio-${asset.id}`) as HTMLAudioElement;
      audio?.pause();
    } else {
      // Stop any playing audio
      if (playingId) {
        const prevAudio = document.getElementById(`audio-${playingId}`) as HTMLAudioElement;
        prevAudio?.pause();
      }
      setPlayingId(asset.id);
      const audio = document.getElementById(`audio-${asset.id}`) as HTMLAudioElement;
      audio?.play();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AudioLines className="w-5 h-5 text-green-500" />
            יצירת קול
          </h2>
          <p className="text-sm text-muted-foreground">
            קריינות וקולות AI עם ElevenLabs
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
          <GenerateVoiceDialog />
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : voiceAssets.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {voiceAssets.map((asset) => (
            <Card key={asset.id} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{asset.title || "ללא כותרת"}</p>
                    <p className="text-xs text-muted-foreground">
                      {asset.service} • {new Date(asset.created_at).toLocaleDateString("he-IL")}
                    </p>
                  </div>
                  <StatusBadge status={asset.status} />
                </div>

                {asset.prompt && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{asset.prompt}</p>
                )}

                {/* Audio Player */}
                {asset.url && asset.status === "completed" && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-full bg-green-500 hover:bg-green-600 text-white"
                      onClick={() => togglePlay(asset)}
                    >
                      {playingId === asset.id ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4 ms-0.5" />
                      )}
                    </Button>
                    <div className="flex-1">
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 w-0" />
                      </div>
                    </div>
                    <audio
                      id={`audio-${asset.id}`}
                      src={asset.url}
                      onEnded={() => setPlayingId(null)}
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-1 pt-1 justify-between">
                  <Badge variant="outline">${asset.estimated_cost_usd.toFixed(2)}</Badge>
                  <div className="flex gap-1">
                    {asset.url && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                        <a href={asset.url} download>
                          <Download className="w-3 h-3" />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => deleteAsset.mutate(asset.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="py-12">
          <CardContent className="text-center">
            <AudioLines className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">עדיין אין קבצי קול</h3>
            <p className="text-muted-foreground text-sm mb-4">
              צור קריינות וקולות AI מטקסט
            </p>
            <GenerateVoiceDialog />
          </CardContent>
        </Card>
      )}

      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <AudioLines className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium">ElevenLabs - קולות AI מתקדמים</p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• תמיכה בעברית עם מודל Multilingual v2</li>
                <li>• קולות טבעיים ואקספרסיביים</li>
                <li>• ~$0.30 ל-1000 תווים</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Dialog for generating avatar
function GenerateAvatarDialog() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [avatarId, setAvatarId] = useState("");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [background, setBackground] = useState("#FFFFFF");
  const [title, setTitle] = useState("");

  const generateAvatar = useGenerateAvatar();

  const AVATAR_OPTIONS = [
    { value: "josh_lite3_20230714", label: "Josh", emoji: "👨‍💼" },
    { value: "anna_public_3_20240108", label: "Anna", emoji: "👩‍💼" },
    { value: "monica_fitness_20230714", label: "Monica", emoji: "👩‍🦱" },
  ];

  const handleGenerate = async () => {
    if (!text.trim()) return;

    await generateAvatar.mutateAsync({
      text: text.trim(),
      avatar_id: avatarId || AVATAR_OPTIONS[0].value,
      aspect_ratio: aspectRatio,
      background,
      title: title.trim() || undefined,
    });

    setOpen(false);
    setText("");
    setTitle("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserCircle className="w-4 h-4" />
          צור אווטר
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-indigo-500" />
            יצירת אווטר מדבר עם HeyGen
          </DialogTitle>
          <DialogDescription>
            צור וידאו של אווטר שמדבר את הטקסט שלך
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Text Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">טקסט לדיבור *</label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="הכנס את הטקסט שהאווטר יגיד..."
              rows={4}
              className="resize-none"
              maxLength={3000}
            />
            <p className="text-xs text-muted-foreground text-left">
              {text.length}/3000 תווים
            </p>
          </div>

          {/* Avatar Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">בחר אווטר</label>
            <div className="grid grid-cols-3 gap-2">
              {AVATAR_OPTIONS.map((avatar) => (
                <button
                  key={avatar.value}
                  type="button"
                  onClick={() => setAvatarId(avatar.value)}
                  className={cn(
                    "p-3 rounded-lg border text-center transition-all",
                    (avatarId || AVATAR_OPTIONS[0].value) === avatar.value
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                      : "border-muted hover:border-indigo-200"
                  )}
                >
                  <div className="text-2xl mb-1">{avatar.emoji}</div>
                  <div className="text-xs">{avatar.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">יחס תמונה</label>
              <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as typeof aspectRatio)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16:9">16:9 לרוחב</SelectItem>
                  <SelectItem value="9:16">9:16 סטורי</SelectItem>
                  <SelectItem value="1:1">1:1 ריבוע</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">רקע</label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  className="w-12 h-9 p-1 cursor-pointer"
                />
                <Input
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  placeholder="#FFFFFF"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">כותרת</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="שם לוידאו..."
            />
          </div>

          {/* Estimated Cost */}
          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            <div className="flex justify-between">
              <span>עלות משוערת:</span>
              <span className="font-medium">
                ${(Math.ceil(text.length / 150) * 0.75).toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ~{Math.ceil(text.length / 150)} דקות וידאו
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!text.trim() || generateAvatar.isPending}
              className="min-w-[120px]"
            >
              {generateAvatar.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ms-2" />
                  יוצר...
                </>
              ) : (
                <>
                  <UserCircle className="w-4 h-4 ms-2" />
                  צור אווטר
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Tab: Avatar (HeyGen)
function AvatarTab() {
  const { data: assets, isLoading, refetch, isFetching } = useMarketingAssets();
  const deleteAsset = useDeleteAsset();

  // Filter only HeyGen avatar videos
  const avatarAssets = assets?.filter(a => a.service === "heygen") || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-indigo-500" />
            אווטרים מדברים
          </h2>
          <p className="text-sm text-muted-foreground">
            וידאו של אווטרים AI עם HeyGen
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
          <GenerateAvatarDialog />
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : avatarAssets.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {avatarAssets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onDelete={() => deleteAsset.mutate(asset.id)}
            />
          ))}
        </div>
      ) : (
        <Card className="py-12">
          <CardContent className="text-center">
            <UserCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">עדיין אין וידאו אווטר</h3>
            <p className="text-muted-foreground text-sm mb-4">
              צור וידאו של אווטר AI שמדבר את הטקסט שלך
            </p>
            <GenerateAvatarDialog />
          </CardContent>
        </Card>
      )}

      <Card className="bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10">
              <UserCircle className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-medium">HeyGen - אווטרים AI מציאותיים</p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• אווטרים מציאותיים שמדברים כל שפה</li>
                <li>• סנכרון שפתיים מושלם</li>
                <li>• ~$0.75 לדקת וידאו</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Tab: Library (All assets with filtering)
function LibraryTab() {
  const { data: assets, isLoading, refetch, isFetching } = useMarketingAssets();
  const { data: costData } = useMarketingCostThisMonth();
  const deleteAsset = useDeleteAsset();
  const [filter, setFilter] = useState<"all" | "image" | "video" | "voice">("all");
  const [search, setSearch] = useState("");

  const filteredAssets = assets?.filter(a => {
    if (filter !== "all" && a.asset_type !== filter) return false;
    if (search && !a.title?.toLowerCase().includes(search.toLowerCase()) &&
        !a.prompt?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-amber-500" />
            ספריית נכסים
          </h2>
          <p className="text-sm text-muted-foreground">
            כל הנכסים שנוצרו ({assets?.length || 0} פריטים)
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn("w-4 h-4 ms-2", isFetching && "animate-spin")} />
          רענן
        </Button>
      </div>

      {/* Cost Summary */}
      {costData && (
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">עלות החודש</p>
                  <p className="text-xl font-bold">
                    ${costData.totalUsd.toFixed(2)}
                    <span className="text-sm font-normal text-muted-foreground ms-1">
                      (≈₪{costData.totalIls.toFixed(0)})
                    </span>
                  </p>
                </div>
              </div>
              <Badge variant="secondary">{costData.assetCount} פריטים</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="חיפוש..."
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
            <SelectItem value="image">תמונות</SelectItem>
            <SelectItem value="video">וידאו</SelectItem>
            <SelectItem value="voice">קול</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Assets Grid */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : filteredAssets.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredAssets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onDelete={() => deleteAsset.mutate(asset.id)}
            />
          ))}
        </div>
      ) : (
        <Card className="py-12">
          <CardContent className="text-center">
            <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">
              {search ? "לא נמצאו תוצאות" : "הספרייה ריקה"}
            </h3>
            <p className="text-muted-foreground text-sm">
              {search ? "נסה לחפש משהו אחר" : "צור את הנכס הראשון שלך"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Tab: Settings (Training, API keys, etc)
function SettingsTab() {
  const { data: models } = useMarketingModels();
  const { data: scenarios } = useMarketingScenarios();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-500" />
          הגדרות וניהול
        </h2>
        <p className="text-sm text-muted-foreground">
          מודלים מאומנים, תבניות ושירותים
        </p>
      </div>

      {/* Trained Models */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            מודלים מאומנים
          </CardTitle>
          <CardDescription>דמויות שאומנו עם Astria / Flux</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {models?.map((model) => (
              <div key={model.id} className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="text-2xl">
                  {model.name === "inbal" ? "👩" : "👨"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{model.name_he}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    Token: {model.token} • Tune: {model.tune_id}
                  </p>
                </div>
                <Badge variant="secondary">פעיל</Badge>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="mt-4 gap-2" disabled>
            <Plus className="w-4 h-4" />
            אמן מודל חדש (Flux 2)
            <Badge variant="outline">בקרוב</Badge>
          </Button>
        </CardContent>
      </Card>

      {/* Quick Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            תבניות מהירות
          </CardTitle>
          <CardDescription>סגנונות ותבניות ליצירת תמונות</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {scenarios?.map((scenario) => (
              <Badge key={scenario.id} variant="secondary" className="gap-1">
                {scenario.emoji} {scenario.name_he}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Services Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">שירותים מחוברים</CardTitle>
          <CardDescription>סטטוס API וחיבורים</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Image className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Astria AI</p>
                <p className="text-xs text-muted-foreground">תמונות דמויות</p>
              </div>
              <Badge className="bg-green-100 text-green-700">מחובר</Badge>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-lg bg-pink-500/10">
                <Wand2 className="w-5 h-5 text-pink-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">DALL-E 3 / GPT</p>
                <p className="text-xs text-muted-foreground">תמונות כלליות</p>
              </div>
              <Badge className="bg-green-100 text-green-700">מחובר</Badge>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 opacity-60">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Video className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Kling 2.6</p>
                <p className="text-xs text-muted-foreground">יצירת וידאו</p>
              </div>
              <Badge variant="outline">לא מחובר</Badge>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 opacity-60">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Sparkles className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Flux 2 Pro</p>
                <p className="text-xs text-muted-foreground">אימון מודלים</p>
              </div>
              <Badge variant="outline">לא מחובר</Badge>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 opacity-60">
              <div className="p-2 rounded-lg bg-green-500/10">
                <AudioLines className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">ElevenLabs</p>
                <p className="text-xs text-muted-foreground">יצירת קול AI</p>
              </div>
              <Badge variant="outline">לא מחובר</Badge>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 opacity-60">
              <div className="p-2 rounded-lg bg-indigo-500/10">
                <UserCircle className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">HeyGen</p>
                <p className="text-xs text-muted-foreground">אווטרים מדברים</p>
              </div>
              <Badge variant="outline">לא מחובר</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminMarketing() {
  const [activeTab, setActiveTab] = useState<StudioTab>("characters");
  const { data: costData } = useMarketingCostThisMonth();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-500" />
              Voicely Studio
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              יצירת תוכן שיווקי עם AI - תמונות, וידאו ואנימציות
            </p>
          </div>
          {costData && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">החודש:</span>
              <span className="font-medium">${costData.totalUsd.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as StudioTab)}>
          <TabsList className="flex w-full overflow-x-auto mb-6">
            <TabsTrigger value="characters" className="flex-1 gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">דמויות</span>
            </TabsTrigger>
            <TabsTrigger value="creative" className="flex-1 gap-2">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">יצירה</span>
            </TabsTrigger>
            <TabsTrigger value="video" className="flex-1 gap-2">
              <Film className="w-4 h-4" />
              <span className="hidden sm:inline">וידאו</span>
            </TabsTrigger>
            <TabsTrigger value="voice" className="flex-1 gap-2">
              <AudioLines className="w-4 h-4" />
              <span className="hidden sm:inline">קול</span>
            </TabsTrigger>
            <TabsTrigger value="avatar" className="flex-1 gap-2">
              <UserCircle className="w-4 h-4" />
              <span className="hidden sm:inline">אווטר</span>
            </TabsTrigger>
            <TabsTrigger value="notebooklm" className="flex-1 gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">NotebookLM</span>
            </TabsTrigger>
            <TabsTrigger value="visuals" className="flex-1 gap-2">
              <ImagePlus className="w-4 h-4" />
              <span className="hidden sm:inline">תמונות</span>
            </TabsTrigger>
            <TabsTrigger value="library" className="flex-1 gap-2">
              <FolderOpen className="w-4 h-4" />
              <span className="hidden sm:inline">ספרייה</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-1 gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">הגדרות</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="characters">
            <CharactersTab />
          </TabsContent>

          <TabsContent value="creative">
            <CreativeTab />
          </TabsContent>

          <TabsContent value="video">
            <VideoTab />
          </TabsContent>

          <TabsContent value="voice">
            <VoiceTab />
          </TabsContent>

          <TabsContent value="avatar">
            <AvatarTab />
          </TabsContent>

          <TabsContent value="notebooklm">
            <NotebookLMTab />
          </TabsContent>

          <TabsContent value="visuals">
            <LessonVisualsTab />
          </TabsContent>

          <TabsContent value="library">
            <LibraryTab />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
