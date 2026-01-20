import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrendingUp, Hash, Calendar, Loader2, BookOpen } from 'lucide-react';
import { useTrends } from '@/hooks/admin/useTrends';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from 'recharts';

const COLORS = [
  'hsl(158, 72%, 52%)',  // green
  'hsl(158, 60%, 70%)',  // mint
  'hsl(45, 90%, 55%)',   // yellow
  'hsl(24, 95%, 58%)',   // orange
  'hsl(12, 85%, 55%)',   // coral
  'hsl(200, 80%, 50%)',  // blue
  'hsl(280, 70%, 60%)',  // purple
  'hsl(340, 80%, 55%)',  // pink
];

type Granularity = 'week' | 'month';

const TrendsDashboard = () => {
  const [granularity, setGranularity] = useState<Granularity>('month');
  const { data, isLoading, error } = useTrends({ granularity });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-voicely-green" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-destructive mb-2">שגיאה בטעינת הנתונים</p>
        <p className="text-muted-foreground text-sm">{error.message}</p>
      </div>
    );
  }

  // Transform data for charts
  const lessonsChartData = data?.lessonsOverTime?.map((item) => ({
    period: formatPeriod(item.period, granularity),
    count: item.count,
  })) || [];

  // Create combined topic trend data for multi-line chart
  const topicTrendData = createCombinedTrendData(
    data?.topicTrends?.slice(0, 5) || [],
    granularity
  );

  // Create combined skill trend data
  const skillTrendData = createCombinedTrendData(
    data?.skillTrends?.slice(0, 5) || [],
    granularity
  );

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="playful-shadow">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">תקופה:</span>
            </div>
            <Select value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">שבועי</SelectItem>
                <SelectItem value="month">חודשי</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lessons Over Time */}
      <Card className="playful-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5 text-voicely-green" />
            שיעורים לאורך זמן
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lessonsChartData.length > 0 ? (
            <div className="h-[300px]" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lessonsChartData}>
                  <defs>
                    <linearGradient id="colorLessons" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      direction: 'rtl',
                    }}
                    formatter={(value: number) => [`${value} שיעורים`, 'כמות']}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={COLORS[0]}
                    strokeWidth={2}
                    fill="url(#colorLessons)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="אין נתוני שיעורים" />
          )}
        </CardContent>
      </Card>

      {/* Topic Trends */}
      <Card className="playful-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Hash className="w-5 h-5 text-voicely-mint" />
            מגמות נושאים (Top 5)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topicTrendData.length > 0 && data?.topicTrends?.length ? (
            <div className="h-[350px]" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={topicTrendData}>
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      direction: 'rtl',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ direction: 'rtl' }}
                    formatter={(value) => <span className="text-sm">{value}</span>}
                  />
                  {data.topicTrends.slice(0, 5).map((topic, index) => (
                    <Line
                      key={topic.topic}
                      type="monotone"
                      dataKey={topic.topic}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="אין נתוני מגמות נושאים" />
          )}
        </CardContent>
      </Card>

      {/* Skill Trends */}
      <Card className="playful-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-voicely-yellow" />
            מגמות מיומנויות (Top 5)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {skillTrendData.length > 0 && data?.skillTrends?.length ? (
            <div className="h-[350px]" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={skillTrendData}>
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      direction: 'rtl',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ direction: 'rtl' }}
                    formatter={(value) => <span className="text-sm">{value}</span>}
                  />
                  {data.skillTrends.slice(0, 5).map((skill, index) => (
                    <Line
                      key={skill.skill}
                      type="monotone"
                      dataKey={skill.skill}
                      stroke={COLORS[(index + 3) % COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="אין נתוני מגמות מיומנויות" />
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Topics Summary */}
        <Card className="playful-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">סיכום נושאים מובילים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.topicTrends?.slice(0, 5).map((topic, index) => (
                <div key={topic.topic} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm">{topic.topic}</span>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {topic.totalCount} אזכורים
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Skills Summary */}
        <Card className="playful-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">סיכום מיומנויות מובילות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.skillTrends?.slice(0, 5).map((skill, index) => (
                <div key={skill.skill} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: COLORS[(index + 3) % COLORS.length] }}
                    />
                    <span className="text-sm">{skill.skill}</span>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {skill.totalCount} תרגולים
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Helper functions
const formatPeriod = (period: string, granularity: Granularity): string => {
  const date = new Date(period);
  if (granularity === 'week') {
    return date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
  }
  return date.toLocaleDateString('he-IL', { month: 'short', year: '2-digit' });
};

interface TrendItem {
  topic?: string;
  skill?: string;
  timeline?: { period: string; count: number }[];
  totalCount?: number;
}

const createCombinedTrendData = (
  trends: TrendItem[],
  granularity: Granularity
): Record<string, unknown>[] => {
  if (!trends.length) return [];

  // Collect all unique periods
  const periodsSet = new Set<string>();
  trends.forEach((trend) => {
    trend.timeline?.forEach((item) => {
      periodsSet.add(item.period);
    });
  });

  // Sort periods chronologically
  const periods = Array.from(periodsSet).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  // Create combined data
  return periods.map((period) => {
    const dataPoint: Record<string, unknown> = {
      period: formatPeriod(period, granularity),
    };

    trends.forEach((trend) => {
      const key = trend.topic || trend.skill || 'unknown';
      const timelineItem = trend.timeline?.find((t) => t.period === period);
      dataPoint[key] = timelineItem?.count || 0;
    });

    return dataPoint;
  });
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
    {message}
  </div>
);

export default TrendsDashboard;
