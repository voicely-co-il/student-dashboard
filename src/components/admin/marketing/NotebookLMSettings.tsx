/**
 * NotebookLM Settings Component
 *
 * Allows users to configure backend mode:
 * - Auto: Prefer local MCP, fallback to Gemini Cloud
 * - Local: Only use local MCP server
 * - Cloud: Only use Gemini Cloud API
 */

import { useState } from "react";
import {
  useNotebookLMBackendStatus,
  useNotebookLMSettings,
} from "@/hooks/admin/useNotebookLMUnified";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Settings2,
  Server,
  Cloud,
  Zap,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  ChevronDown,
  Terminal,
  Key,
  Info,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BackendMode } from "@/lib/notebooklm";

interface BackendStatusIndicatorProps {
  available: boolean;
  label: string;
  icon: React.ReactNode;
  description?: string;
}

function BackendStatusIndicator({
  available,
  label,
  icon,
  description,
}: BackendStatusIndicatorProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border",
        available
          ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
          : "bg-muted/50 border-border"
      )}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center",
          available
            ? "bg-green-100 dark:bg-green-900/30"
            : "bg-muted"
        )}
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{label}</span>
          {available ? (
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          ) : (
            <XCircle className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}

export function NotebookLMStatusBadge() {
  const { status, isChecking, refresh } = useNotebookLMBackendStatus();

  if (isChecking && !status) {
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="w-3 h-3 animate-spin" />
        בודק...
      </Badge>
    );
  }

  if (!status?.activeBackend) {
    return (
      <Badge
        variant="outline"
        className="gap-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400 cursor-pointer"
        onClick={refresh}
      >
        <XCircle className="w-3 h-3" />
        לא מחובר
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 cursor-pointer",
        status.activeBackend === "local"
          ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400"
          : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
      )}
      onClick={refresh}
    >
      {status.activeBackend === "local" ? (
        <>
          <Server className="w-3 h-3" />
          מקומי
        </>
      ) : (
        <>
          <Cloud className="w-3 h-3" />
          Cloud
        </>
      )}
    </Badge>
  );
}

export function NotebookLMSettingsDialog() {
  const [open, setOpen] = useState(false);
  const { status, isChecking, refresh } = useNotebookLMBackendStatus();
  const { settings, setMode, updateSettings } = useNotebookLMSettings();
  const [geminiKey, setGeminiKey] = useState("");
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  const handleSaveGeminiKey = () => {
    if (geminiKey.trim()) {
      updateSettings({ geminiApiKey: geminiKey.trim() });
      setGeminiKey("");
      refresh();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="w-4 h-4" />
          הגדרות Backend
          <NotebookLMStatusBadge />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            הגדרות NotebookLM
          </DialogTitle>
          <DialogDescription>
            בחר איך לעבד את התוכן - שרת מקומי (חינם) או Gemini Cloud (בתשלום)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Backend Status */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">סטטוס חיבור</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={refresh}
                disabled={isChecking}
              >
                <RefreshCw
                  className={cn("w-4 h-4", isChecking && "animate-spin")}
                />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <BackendStatusIndicator
                available={status?.localAvailable || false}
                label="שרת מקומי"
                icon={<Server className="w-5 h-5 text-purple-600" />}
                description={
                  status?.localAvailable ? "מחובר לפורט 3456" : "לא פעיל"
                }
              />
              <BackendStatusIndicator
                available={status?.cloudAvailable || false}
                label="Gemini Cloud"
                icon={<Cloud className="w-5 h-5 text-blue-600" />}
                description={
                  status?.cloudAvailable ? "API מוגדר" : "חסר API key"
                }
              />
            </div>
          </div>

          {/* Mode Selection */}
          <div>
            <h4 className="text-sm font-medium mb-3">מצב עבודה</h4>
            <Select
              value={settings.mode}
              onValueChange={(value) => setMode(value as BackendMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span>אוטומטי</span>
                    <span className="text-muted-foreground text-xs">
                      (מועדף מקומי, fallback ל-Cloud)
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="local">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-purple-500" />
                    <span>שרת מקומי בלבד</span>
                    <span className="text-muted-foreground text-xs">
                      (חינם)
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="cloud">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-blue-500" />
                    <span>Gemini Cloud בלבד</span>
                    <span className="text-muted-foreground text-xs">
                      (~$0.01/פריט)
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Active backend indicator */}
            {status?.activeBackend && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                פעיל כרגע:{" "}
                {status.activeBackend === "local" ? "שרת מקומי" : "Gemini Cloud"}
              </p>
            )}
            {!status?.activeBackend && (
              <p className="text-xs text-yellow-600 mt-2 flex items-center gap-1">
                <Info className="w-3 h-3" />
                אין backend זמין. הגדר אחד מהאפשרויות למטה.
              </p>
            )}
          </div>

          {/* Gemini API Key */}
          {(settings.mode === "cloud" || settings.mode === "auto") && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Key className="w-4 h-4" />
                Gemini API Key
              </h4>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder={
                    status?.cloudAvailable
                      ? "מוגדר ✓ (הכנס חדש להחלפה)"
                      : "הכנס API key..."
                  }
                  dir="ltr"
                />
                <Button onClick={handleSaveGeminiKey} disabled={!geminiKey.trim()}>
                  שמור
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                קבל API key ב-
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1 mx-1"
                >
                  Google AI Studio
                  <ExternalLink className="w-3 h-3" />
                </a>
                (חינם עד limits יומיים)
              </p>
            </div>
          )}

          {/* Local Server Setup Guide */}
          {(settings.mode === "local" || settings.mode === "auto") && (
            <Collapsible open={showSetupGuide} onOpenChange={setShowSetupGuide}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4" />
                    מדריך הפעלת שרת מקומי
                  </div>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 transition-transform",
                      showSetupGuide && "rotate-180"
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                <Card>
                  <CardContent className="p-3 space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-1">1. התקן את ה-MCP server:</p>
                      <code
                        className="block bg-zinc-900 text-zinc-100 rounded px-3 py-2 text-xs font-mono"
                        dir="ltr"
                      >
                        npm install -g notebooklm-mcp
                      </code>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">2. התחבר לחשבון Google:</p>
                      <code
                        className="block bg-zinc-900 text-zinc-100 rounded px-3 py-2 text-xs font-mono"
                        dir="ltr"
                      >
                        notebooklm-mcp-auth
                      </code>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">3. הפעל את השרת:</p>
                      <code
                        className="block bg-zinc-900 text-zinc-100 rounded px-3 py-2 text-xs font-mono"
                        dir="ltr"
                      >
                        notebooklm-mcp --transport http --port 3456
                      </code>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      השרת צריך לרוץ ברקע כל עוד אתה רוצה ליצור תוכן. אפשר להשאיר
                      אותו פתוח בטרמינל נפרד.
                    </p>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NotebookLMSettingsDialog;
