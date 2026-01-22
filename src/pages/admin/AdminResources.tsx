import { useResourcesUsage, formatBytes, formatCurrency, TableSize } from "@/hooks/admin/useResourcesUsage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Database,
  HardDrive,
  Zap,
  Users,
  Brain,
  Globe,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  AlertOctagon,
  Table,
} from "lucide-react";
import { cn } from "@/lib/utils";

function getStatusColor(percent: number): string {
  if (percent >= 90) return "text-red-500";
  if (percent >= 70) return "text-amber-500";
  return "text-emerald-500";
}

function getProgressColor(percent: number): string {
  if (percent >= 90) return "bg-red-500";
  if (percent >= 70) return "bg-amber-500";
  return "bg-emerald-500";
}

function StatusBadge({ percent }: { percent: number }) {
  if (percent >= 90) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="w-3 h-3" />
        קריטי
      </Badge>
    );
  }
  if (percent >= 70) {
    return (
      <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
        <AlertTriangle className="w-3 h-3" />
        שימו לב
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
      <CheckCircle className="w-3 h-3" />
      תקין
    </Badge>
  );
}

function ResourceCard({
  title,
  description,
  icon: Icon,
  used,
  limit,
  percent,
  usedLabel,
  limitLabel,
  link,
  children,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  used: string | number;
  limit: string | number;
  percent: number;
  usedLabel?: string;
  limitLabel?: string;
  link?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-muted">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="text-xs">{description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge percent={percent} />
            {link && (
              <Button variant="ghost" size="icon" asChild className="h-7 w-7">
                <a href={link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{usedLabel || "בשימוש"}</span>
            <span className={cn("font-medium", getStatusColor(percent))}>
              {used} / {limit}
            </span>
          </div>
          <Progress value={percent} className={cn("h-2", getProgressColor(percent))} />
          <p className="text-xs text-muted-foreground text-left">{percent}% מנוצל</p>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function OverLimitAlert({ percent, resource }: { percent: number; resource: string }) {
  if (percent < 100) return null;

  return (
    <Card className="border-red-500 bg-red-50 dark:bg-red-950/30 mb-6">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <AlertOctagon className="w-6 h-6 text-red-500 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-700 dark:text-red-400">
              חריגה מה-Limit!
            </h3>
            <p className="text-red-600 dark:text-red-300 text-sm mt-1">
              {resource} עבר את המכסה המותרת ({percent}%).
              יש לשדרג לתוכנית Pro ($25/חודש) או לצמצם את השימוש.
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="destructive" asChild>
                <a href="https://supabase.com/dashboard/project/jldfxkbczzxawdqsznze/settings/billing" target="_blank" rel="noopener noreferrer">
                  שדרג ל-Pro
                  <ExternalLink className="w-3 h-3 ms-1" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TableSizesBreakdown({ tables, dbLimit }: { tables: TableSize[]; dbLimit: number }) {
  if (!tables || tables.length === 0) return null;

  const totalBytes = tables.reduce((acc, t) => acc + t.total_bytes, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Table className="w-5 h-5" />
          חלוקת נפח לפי טבלאות
        </CardTitle>
        <CardDescription>
          סה"כ בשימוש: {formatBytes(totalBytes)} מתוך {formatBytes(dbLimit)} ({Math.round((totalBytes / dbLimit) * 100)}% מהמכסה)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {tables.slice(0, 10).map((table) => {
            const percentOfTotal = Math.round((table.total_bytes / totalBytes) * 100);
            return (
              <div key={table.table_name} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-mono text-xs truncate">{table.table_name}</span>
                    <span className="text-muted-foreground">{table.total_size}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${percentOfTotal}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-muted-foreground w-10 text-left">{percentOfTotal}%</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
          האחוזים מייצגים את החלק של כל טבלה מתוך סה"כ הנתונים (לא מהמכסה)
        </p>
        {tables.length > 10 && (
          <p className="text-xs text-muted-foreground mt-1">
            ועוד {tables.length - 10} טבלאות נוספות...
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-4 w-24 mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AdminResources() {
  const { data, isLoading, error, refetch, isFetching } = useResourcesUsage();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">חדר בקרת משאבים</h1>
            <p className="text-muted-foreground text-sm mt-1">
              מעקב אחר ניצול משאבים ותקציבים
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn("w-4 h-4 ms-2", isFetching && "animate-spin")} />
            {isFetching ? "מרענן..." : "רענן"}
          </Button>
        </div>

        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">שגיאה בטעינת נתוני משאבים: {String(error)}</p>
            </CardContent>
          </Card>
        )}

        {/* Over-limit warning */}
        {data && data.supabase.database.percentUsed >= 100 && (
          <OverLimitAlert percent={data.supabase.database.percentUsed} resource="בסיס הנתונים" />
        )}

        {isLoading ? (
          <LoadingSkeleton />
        ) : data ? (
          <div className="space-y-6">
            {/* Supabase Section */}
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-500" />
                Supabase
                <Badge variant="outline">{data.supabase.plan}</Badge>
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <ResourceCard
                  title="בסיס נתונים"
                  description="נפח אחסון PostgreSQL"
                  icon={Database}
                  used={formatBytes(data.supabase.database.sizeUsed)}
                  limit={formatBytes(data.supabase.database.sizeLimit)}
                  percent={data.supabase.database.percentUsed}
                  link="https://supabase.com/dashboard/project/jldfxkbczzxawdqsznze"
                />
                <ResourceCard
                  title="Storage"
                  description="אחסון קבצים"
                  icon={HardDrive}
                  used={formatBytes(data.supabase.storage.sizeUsed)}
                  limit={formatBytes(data.supabase.storage.sizeLimit)}
                  percent={data.supabase.storage.percentUsed}
                />
                <ResourceCard
                  title="Edge Functions"
                  description="קריאות החודש"
                  icon={Zap}
                  used={data.supabase.edgeFunctions.invocations.toLocaleString()}
                  limit={data.supabase.edgeFunctions.limit.toLocaleString()}
                  percent={data.supabase.edgeFunctions.percentUsed}
                />
                <ResourceCard
                  title="משתמשים פעילים"
                  description="MAU (30 יום)"
                  icon={Users}
                  used={data.supabase.auth.monthlyActiveUsers.toLocaleString()}
                  limit={data.supabase.auth.limit.toLocaleString()}
                  percent={data.supabase.auth.percentUsed}
                />
              </div>

              {/* Table sizes breakdown */}
              {data.supabase.tableSizes && data.supabase.tableSizes.length > 0 && (
                <div className="mt-4">
                  <TableSizesBreakdown tables={data.supabase.tableSizes} dbLimit={data.supabase.database.sizeLimit} />
                </div>
              )}
            </div>

            {/* AI Section */}
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
                AI & LLM
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <ResourceCard
                  title="Gemini 2.5 Pro"
                  description="צ'אט AI למורים ותלמידים"
                  icon={Brain}
                  used={formatCurrency(data.gemini.estimatedUsed)}
                  limit={`₪${data.gemini.monthlyBudget}`}
                  percent={data.gemini.percentUsed}
                  usedLabel="עלות משוערת"
                  limitLabel="תקציב חודשי"
                  link="https://aistudio.google.com/"
                >
                  <div className="pt-2 border-t text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">בקשות החודש:</span>
                      <span className="font-medium">{data.gemini.requestsToday}</span>
                    </div>
                  </div>
                </ResourceCard>
                <ResourceCard
                  title="OpenAI Embeddings"
                  description="וקטורים לחיפוש בתמלולים"
                  icon={Brain}
                  used={formatCurrency(data.openai.estimatedUsed)}
                  limit={formatCurrency(data.openai.monthlyBudget)}
                  percent={data.openai.percentUsed}
                  usedLabel="עלות משוערת"
                  limitLabel="תקציב חודשי"
                  link="https://platform.openai.com/usage"
                />
              </div>
            </div>

            {/* Vercel Section */}
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-500" />
                Vercel
                <Badge variant="outline">{data.vercel.plan}</Badge>
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Globe className="w-5 h-5" />
                      Bandwidth
                    </CardTitle>
                    <CardDescription>תעבורת רשת</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      נתוני Bandwidth לא זמינים דרך API.
                      <br />
                      <a
                        href="https://vercel.com/voicelys-projects-bd7b93d9/student-dashboard/usage"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline inline-flex items-center gap-1"
                      >
                        צפה בדשבורד Vercel
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                    <div className="mt-3 p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        <strong>Hobby Plan כולל:</strong>
                        <br />• 100 GB bandwidth / חודש
                        <br />• 6,000 builds / חודש
                        <br />• Serverless functions
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">קישורים שימושיים</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <a
                      href="https://vercel.com/voicelys-projects-bd7b93d9/student-dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded hover:bg-muted text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      דשבורד פרויקט
                    </a>
                    <a
                      href="https://vercel.com/voicelys-projects-bd7b93d9/student-dashboard/deployments"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded hover:bg-muted text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Deployments
                    </a>
                    <a
                      href="https://vercel.com/voicelys-projects-bd7b93d9/student-dashboard/analytics"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded hover:bg-muted text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Analytics
                    </a>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Summary */}
            <Card className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
              <CardHeader>
                <CardTitle>סיכום חודשי</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                    <p className="text-2xl font-bold text-emerald-600">
                      ₪{(data.gemini.estimatedUsed * 3.6 + data.openai.estimatedUsed * 3.6).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">עלות AI משוערת</p>
                  </div>
                  <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                    <p className="text-2xl font-bold text-blue-600">₪0</p>
                    <p className="text-sm text-muted-foreground">Supabase (Free Tier)</p>
                  </div>
                  <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                    <p className="text-2xl font-bold text-purple-600">₪0</p>
                    <p className="text-sm text-muted-foreground">Vercel (Hobby)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
