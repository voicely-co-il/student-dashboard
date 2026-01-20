import { useState } from "react";
import {
  useMarketingAssets,
  useGenerateImage,
  useDeleteAsset,
  useMarketingCostThisMonth,
  MarketingAsset,
} from "@/hooks/admin/useMarketingAssets";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1 (ריבוע)" },
  { value: "9:16", label: "9:16 (סטורי)" },
  { value: "16:9", label: "16:9 (לרוחב)" },
  { value: "4:3", label: "4:3 (קלאסי)" },
];

const CHARACTERS = [
  { value: "none", label: "ללא דמות" },
  { value: "inbal", label: "ענבל (ohwx woman)" },
  { value: "ilya", label: "איליה (sks man)" },
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
            src={asset.url}
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
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [character, setCharacter] = useState<string>("none");
  const [title, setTitle] = useState("");

  const generateImage = useGenerateImage();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    await generateImage.mutateAsync({
      prompt: prompt.trim(),
      negative_prompt: negativePrompt.trim() || undefined,
      aspect_ratio: aspectRatio as "1:1" | "9:16" | "16:9" | "4:3",
      character: character !== "none" ? (character as "inbal" | "ilya") : undefined,
      title: title.trim() || undefined,
    });

    setOpen(false);
    setPrompt("");
    setNegativePrompt("");
    setTitle("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Sparkles className="w-4 h-4" />
          צור תמונה
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            יצירת תמונה עם AI
          </DialogTitle>
          <DialogDescription>
            הזן תיאור לתמונה שתרצה ליצור. התמונה תיווצר באמצעות Astria AI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">כותרת (אופציונלי)</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="שם לתמונה..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">תיאור התמונה *</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="תאר את התמונה שאתה רוצה ליצור..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">מה לא לכלול (אופציונלי)</label>
            <Input
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="blurry, low-res, watermark..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <label className="text-sm font-medium">דמות</label>
              <Select value={character} onValueChange={setCharacter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHARACTERS.map((char) => (
                    <SelectItem key={char.value} value={char.value}>
                      {char.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || generateImage.isPending}
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

export default function AdminMarketing() {
  const { data: assets, isLoading, error, refetch, isFetching } = useMarketingAssets();
  const { data: costData } = useMarketingCostThisMonth();
  const deleteAsset = useDeleteAsset();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-500" />
              סטודיו שיווק
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              יצירת תמונות ווידאו עם AI לשיווק
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
              {isFetching ? "מרענן..." : "רענן"}
            </Button>
            <GenerateImageDialog />
          </div>
        </div>

        {/* Cost Summary */}
        {costData && (
          <Card className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <DollarSign className="w-5 h-5 text-purple-600" />
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

        {/* Error */}
        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">שגיאה בטעינת נכסים: {String(error)}</p>
            </CardContent>
          </Card>
        )}

        {/* Content */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : assets && assets.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {assets.map((asset) => (
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
              <Image className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg mb-2">עדיין אין נכסים</h3>
              <p className="text-muted-foreground text-sm mb-4">
                צור את התמונה הראשונה שלך עם AI
              </p>
              <GenerateImageDialog />
            </CardContent>
          </Card>
        )}

        {/* Services Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-base">שירותים זמינים</CardTitle>
            <CardDescription>
              כלים שמחוברים לסטודיו
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Image className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Astria AI</p>
                  <p className="text-xs text-muted-foreground">יצירת תמונות</p>
                </div>
                <Badge variant="secondary" className="ms-auto">פעיל</Badge>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 opacity-50">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Video className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">HeyGen</p>
                  <p className="text-xs text-muted-foreground">יצירת וידאו</p>
                </div>
                <Badge variant="outline" className="ms-auto">בקרוב</Badge>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 opacity-50">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Mic className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">ElevenLabs</p>
                  <p className="text-xs text-muted-foreground">סינתזת קול</p>
                </div>
                <Badge variant="outline" className="ms-auto">בקרוב</Badge>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 opacity-50">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Video className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Runway</p>
                  <p className="text-xs text-muted-foreground">עריכת וידאו AI</p>
                </div>
                <Badge variant="outline" className="ms-auto">בקרוב</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
