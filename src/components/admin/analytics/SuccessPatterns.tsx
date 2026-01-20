import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Target,
  Loader2,
  RefreshCw,
  TrendingUp,
  CheckCircle2,
  ArrowUpRight,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import { useSuccessPatterns } from '@/hooks/admin/useSuccessPatterns';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

const COLORS = {
  green: 'hsl(158, 72%, 52%)',
  mint: 'hsl(158, 60%, 70%)',
  yellow: 'hsl(45, 90%, 55%)',
  orange: 'hsl(24, 95%, 58%)',
  coral: 'hsl(12, 85%, 55%)',
  blue: 'hsl(200, 80%, 50%)',
};

const SuccessPatterns = () => {
  const { data, isLoading, error, refetch, isRefetching } = useSuccessPatterns();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-voicely-green mb-4" />
        <p className="text-muted-foreground">מנתח דפוסי הצלחה...</p>
        <p className="text-sm text-muted-foreground mt-2">משווה בין תלמידים מתקדמים לאחרים</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-destructive mb-4">שגיאה בניתוח דפוסי ההצלחה</p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 ms-2" />
          נסה שוב
        </Button>
      </div>
    );
  }

  const successFactors = data?.successFactors || [];
  const effectiveTechniques = data?.effectiveTechniques || [];
  const lessonPatterns = data?.optimalLessonPatterns || [];

  // Prepare chart data
  const factorsChartData = successFactors.slice(0, 6).map((factor, index) => ({
    name: factor.factor,
    correlation: Math.round(factor.correlation * 100),
    fill: Object.values(COLORS)[index % Object.values(COLORS).length],
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-voicely-green" />
            דפוסי הצלחה
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            מה מוביל להתקדמות? ניתוח של {data?.analyzedStudents || 0} תלמידים
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`w-4 h-4 ms-2 ${isRefetching ? 'animate-spin' : ''}`} />
          {isRefetching ? 'מנתח...' : 'נתח מחדש'}
        </Button>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="playful-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-voicely-green/10">
                <TrendingUp className="w-5 h-5 text-voicely-green" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">תלמידים מתקדמים</p>
                <p className="text-2xl font-bold">{data?.successfulStudents || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="playful-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-voicely-yellow/10">
                <BarChart3 className="w-5 h-5 text-voicely-yellow" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ממוצע התקדמות</p>
                <p className="text-2xl font-bold">{data?.avgProgressDelta || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="playful-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-voicely-mint/10">
                <Sparkles className="w-5 h-5 text-voicely-mint" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">גורמי הצלחה שזוהו</p>
                <p className="text-2xl font-bold">{successFactors.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Success Factors Chart */}
      <Card className="playful-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ArrowUpRight className="w-5 h-5 text-voicely-green" />
            גורמי הצלחה (מתאם עם התקדמות)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {factorsChartData.length > 0 ? (
            <div className="h-[300px]" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={factorsChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                >
                  <XAxis type="number" domain={[0, 100]} unit="%" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    width={110}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      direction: 'rtl',
                    }}
                    formatter={(value: number) => [`${value}%`, 'מתאם']}
                  />
                  <Bar dataKey="correlation" radius={[0, 4, 4, 0]}>
                    {factorsChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              אין נתונים זמינים
            </div>
          )}
        </CardContent>
      </Card>

      {/* Success Factors Details */}
      <Card className="playful-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">פירוט גורמי ההצלחה</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {successFactors.map((factor, index) => {
              const color = Object.values(COLORS)[index % Object.values(COLORS).length];
              const correlationPercent = Math.round(factor.correlation * 100);

              return (
                <div
                  key={index}
                  className="p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-medium">{factor.factor}</span>
                    </div>
                    <Badge
                      style={{
                        backgroundColor: `${color}20`,
                        color: color,
                      }}
                    >
                      {correlationPercent}% מתאם
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{factor.description}</p>
                  <Progress
                    value={correlationPercent}
                    className="h-1.5"
                  />
                  {factor.evidence && factor.evidence.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">עדויות:</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {factor.evidence.slice(0, 2).map((ev, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="w-3 h-3 text-voicely-green mt-0.5 flex-shrink-0" />
                            {ev}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Effective Techniques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="playful-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="w-5 h-5 text-voicely-mint" />
              טכניקות אפקטיביות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {effectiveTechniques.map((technique, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <span className="font-medium">{technique.technique}</span>
                  <Badge variant="secondary" className="bg-voicely-green/10 text-voicely-green">
                    {technique.successRate}% הצלחה
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="playful-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-voicely-yellow" />
              דפוסי שיעור מומלצים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lessonPatterns.map((pattern, index) => (
                <div key={index} className="p-3 rounded-lg border bg-card">
                  <div className="font-medium mb-1">{pattern.pattern}</div>
                  <p className="text-sm text-muted-foreground">{pattern.impact}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuccessPatterns;
