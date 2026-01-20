import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BookOpen,
  Users,
  Clock,
  FileText,
  Hash,
  Smile,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { useAnalyticsOverview } from '@/hooks/admin/useAnalyticsOverview';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = {
  green: 'hsl(158, 72%, 52%)',
  mint: 'hsl(158, 60%, 70%)',
  yellow: 'hsl(45, 90%, 55%)',
  orange: 'hsl(24, 95%, 58%)',
  coral: 'hsl(12, 85%, 55%)',
  red: 'hsl(0, 74%, 60%)',
};

const MOOD_COLORS: Record<string, string> = {
  'positive': COLORS.green,
  'neutral': COLORS.yellow,
  'negative': COLORS.coral,
  'excited': COLORS.mint,
  'frustrated': COLORS.red,
  'default': COLORS.orange,
};

const AnalyticsOverview = () => {
  const { data, isLoading, error } = useAnalyticsOverview();

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

  const stats = [
    {
      title: 'סה"כ שיעורים מתומללים',
      value: data?.totalTranscripts?.toLocaleString('he-IL') || '0',
      icon: BookOpen,
      color: COLORS.green,
    },
    {
      title: 'תלמידים פעילים',
      value: data?.totalStudents?.toLocaleString('he-IL') || '0',
      icon: Users,
      color: COLORS.mint,
    },
    {
      title: 'ממוצע משך שיעור',
      value: `${data?.avgDurationMinutes || 0} דק'`,
      icon: Clock,
      color: COLORS.yellow,
    },
    {
      title: 'סה"כ מילים מנותחות',
      value: data?.totalWords?.toLocaleString('he-IL') || '0',
      icon: FileText,
      color: COLORS.orange,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="playful-shadow hover:scale-[1.02] transition-transform">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div
                  className="p-2.5 rounded-xl"
                  style={{ backgroundColor: `${stat.color}20` }}
                >
                  <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Topics Chart */}
        <Card className="playful-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Hash className="w-5 h-5 text-voicely-green" />
              נושאים פופולריים
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.topTopics && data.topTopics.length > 0 ? (
              <div className="h-[300px]" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.topTopics.slice(0, 8)}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 100, bottom: 5 }}
                  >
                    <XAxis type="number" />
                    <YAxis
                      type="category"
                      dataKey="topic"
                      tick={{ fontSize: 12 }}
                      width={90}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        direction: 'rtl',
                      }}
                      formatter={(value: number) => [`${value} אזכורים`, 'כמות']}
                    />
                    <Bar
                      dataKey="count"
                      fill={COLORS.green}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState message="אין נתוני נושאים" />
            )}
          </CardContent>
        </Card>

        {/* Top Skills Chart */}
        <Card className="playful-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-voicely-mint" />
              מיומנויות מתורגלות
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.topSkills && data.topSkills.length > 0 ? (
              <div className="h-[300px]" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.topSkills.slice(0, 8)}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 100, bottom: 5 }}
                  >
                    <XAxis type="number" />
                    <YAxis
                      type="category"
                      dataKey="skill"
                      tick={{ fontSize: 12 }}
                      width={90}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        direction: 'rtl',
                      }}
                      formatter={(value: number) => [`${value} תרגולים`, 'כמות']}
                    />
                    <Bar
                      dataKey="count"
                      fill={COLORS.mint}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState message="אין נתוני מיומנויות" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mood Distribution */}
      <Card className="playful-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Smile className="w-5 h-5 text-voicely-yellow" />
            התפלגות מצב רוח תלמידים
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.moodDistribution && data.moodDistribution.length > 0 ? (
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <div className="h-[250px] w-full lg:w-1/2" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.moodDistribution}
                      dataKey="count"
                      nameKey="mood"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={50}
                      paddingAngle={2}
                    >
                      {data.moodDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={MOOD_COLORS[entry.mood] || MOOD_COLORS.default}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        direction: 'rtl',
                      }}
                      formatter={(value: number) => [`${value} שיעורים`, 'כמות']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-4">
                {data.moodDistribution.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: MOOD_COLORS[item.mood] || MOOD_COLORS.default }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {item.mood} ({item.count})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState message="אין נתוני מצב רוח" />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
    {message}
  </div>
);

export default AnalyticsOverview;
