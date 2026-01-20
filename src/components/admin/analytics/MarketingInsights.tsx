import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Megaphone,
  Loader2,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Quote,
  BarChart3,
  Copy,
  Check,
  ArrowLeftRight,
} from 'lucide-react';
import { useMarketingInsights } from '@/hooks/admin/useMarketingInsights';
import { toast } from 'sonner';

const COLORS = {
  green: 'hsl(158, 72%, 52%)',
  yellow: 'hsl(45, 90%, 55%)',
  orange: 'hsl(24, 95%, 58%)',
  coral: 'hsl(12, 85%, 55%)',
  mint: 'hsl(158, 60%, 70%)',
};

const MarketingInsights = () => {
  const { data, isLoading, error, refetch, isRefetching } = useMarketingInsights();
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(id);
      toast.success('הועתק ללוח');
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      toast.error('שגיאה בהעתקה');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-voicely-green mb-4" />
        <p className="text-muted-foreground">מחלץ תוכן שיווקי...</p>
        <p className="text-sm text-muted-foreground mt-2">מנתח בעיות נפוצות וסיפורי הצלחה</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-destructive mb-4">שגיאה בחילוץ תוכן שיווקי</p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 ms-2" />
          נסה שוב
        </Button>
      </div>
    );
  }

  const problems = data?.problems || [];
  const transformations = data?.transformations || [];
  const statistics = data?.statistics || [];
  const quotes = data?.quotes || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-voicely-orange" />
            תוכן שיווקי
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            תוכן מוכן לשיווק מתוך התמלולים (אנונימי)
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`w-4 h-4 ms-2 ${isRefetching ? 'animate-spin' : ''}`} />
          {isRefetching ? 'מחלץ...' : 'חלץ מחדש'}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="problems" className="space-y-4">
        <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1.5 rounded-xl">
          <TabsTrigger value="problems" className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            בעיות נפוצות
          </TabsTrigger>
          <TabsTrigger value="transformations" className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4" />
            טרנספורמציות
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            סטטיסטיקות
          </TabsTrigger>
          <TabsTrigger value="quotes" className="flex items-center gap-2">
            <Quote className="w-4 h-4" />
            ציטוטים
          </TabsTrigger>
        </TabsList>

        {/* Problems Tab */}
        <TabsContent value="problems" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            בעיות נפוצות שתלמידים מביאים - מושלם לפרסום ושיווק
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {problems.map((problem, index) => (
              <Card key={index} className="playful-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-voicely-coral" />
                      <Badge variant="secondary">
                        {problem.frequency} אזכורים
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(problem.problem, `problem-${index}`)}
                    >
                      {copiedIndex === `problem-${index}` ? (
                        <Check className="w-4 h-4 text-voicely-green" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="font-medium text-lg mb-3">"{problem.problem}"</p>
                  {problem.sampleQuotes && problem.sampleQuotes.length > 0 && (
                    <div className="space-y-2 pt-3 border-t">
                      <p className="text-xs text-muted-foreground">ציטוטים לדוגמה:</p>
                      {problem.sampleQuotes.slice(0, 2).map((quote, i) => (
                        <p
                          key={i}
                          className="text-sm text-muted-foreground italic bg-muted/50 p-2 rounded"
                        >
                          "{quote}"
                        </p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Transformations Tab */}
        <TabsContent value="transformations" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            סיפורי "לפני ואחרי" - עדויות להשפעת השיטה
          </p>
          <div className="space-y-4">
            {transformations.map((transform, index) => (
              <Card key={index} className="playful-shadow overflow-hidden">
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 md:grid-cols-2">
                    {/* Before */}
                    <div className="p-4 bg-voicely-coral/5 border-b md:border-b-0 md:border-l">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="border-voicely-coral text-voicely-coral">
                          לפני
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {transform.studentLevel}
                        </span>
                      </div>
                      <p className="text-sm">{transform.before}</p>
                    </div>
                    {/* After */}
                    <div className="p-4 bg-voicely-green/5">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="border-voicely-green text-voicely-green">
                          אחרי
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {transform.duration}
                        </span>
                      </div>
                      <p className="text-sm">{transform.after}</p>
                    </div>
                  </div>
                  <div className="px-4 py-2 bg-muted/30 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(
                          `לפני: ${transform.before}\nאחרי: ${transform.after}\n(${transform.duration})`,
                          `transform-${index}`
                        )
                      }
                    >
                      {copiedIndex === `transform-${index}` ? (
                        <>
                          <Check className="w-4 h-4 text-voicely-green ms-2" />
                          הועתק
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 ms-2" />
                          העתק
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            נתונים אגרגטיביים לשימוש בשיווק
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {statistics.map((stat, index) => {
              const colors = Object.values(COLORS);
              const color = colors[index % colors.length];

              return (
                <Card key={index} className="playful-shadow">
                  <CardContent className="p-4 text-center">
                    <div
                      className="text-4xl font-bold mb-2"
                      style={{ color }}
                    >
                      {stat.value}
                    </div>
                    <p className="font-medium mb-1">{stat.stat}</p>
                    <p className="text-sm text-muted-foreground">{stat.context}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-3"
                      onClick={() =>
                        copyToClipboard(`${stat.value} - ${stat.stat}`, `stat-${index}`)
                      }
                    >
                      {copiedIndex === `stat-${index}` ? (
                        <Check className="w-4 h-4 text-voicely-green" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Quotes Tab */}
        <TabsContent value="quotes" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            ציטוטים אנונימיים מתלמידים (ניתן לשימוש בעדויות)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quotes.map((quote, index) => (
              <Card key={index} className="playful-shadow">
                <CardContent className="p-4">
                  <Quote className="w-8 h-8 text-voicely-mint/30 mb-2" />
                  <p className="text-lg italic mb-3">"{quote.text}"</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{quote.context}</Badge>
                      {quote.sentiment && (
                        <Badge
                          variant="outline"
                          className={
                            quote.sentiment === 'positive'
                              ? 'border-voicely-green text-voicely-green'
                              : quote.sentiment === 'negative'
                              ? 'border-voicely-coral text-voicely-coral'
                              : ''
                          }
                        >
                          {quote.sentiment === 'positive'
                            ? 'חיובי'
                            : quote.sentiment === 'negative'
                            ? 'אתגר'
                            : 'ניטרלי'}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(quote.text, `quote-${index}`)}
                    >
                      {copiedIndex === `quote-${index}` ? (
                        <Check className="w-4 h-4 text-voicely-green" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Export Section */}
      <Card className="playful-shadow border-voicely-orange/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-voicely-orange" />
              <div>
                <p className="font-medium">ייצוא תוכן</p>
                <p className="text-sm text-muted-foreground">
                  הורד את כל התוכן השיווקי לקובץ
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                const content = JSON.stringify(data, null, 2);
                const blob = new Blob([content], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'voicely-marketing-content.json';
                a.click();
                toast.success('הקובץ הורד בהצלחה');
              }}
            >
              הורד JSON
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketingInsights;
