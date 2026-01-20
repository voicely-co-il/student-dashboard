import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BookOpen,
  Users,
  Clock,
  FileText,
  Hash,
  Smile,
  TrendingUp,
  Loader2,
  UserCheck,
  UsersRound,
  Award,
  PauseCircle,
  GraduationCap,
  UserPlus
} from 'lucide-react';
import { useAnalyticsOverview } from '@/hooks/admin/useAnalyticsOverview';
import { useNotionCRM } from '@/hooks/admin/useNotionCRM';
import StudentSessionsCard from './StudentSessionsCard';
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
  const { data: crmData, isLoading: crmLoading } = useNotionCRM();

  if (isLoading && crmLoading) {
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

  // CRM stats for students breakdown
  const activeTotal = crmData?.activeStudents?.total || 0;
  const oneOnOneTotal = crmData?.activeStudents?.breakdown?.oneOnOne?.total || 0;
  const groupsTotal = crmData?.activeStudents?.breakdown?.groups?.total || 0;
  const veteransTotal = crmData?.activeStudents?.breakdown?.veterans?.total || 0;

  const stats = [
    {
      title: 'סה"כ שיעורים מתומללים',
      value: data?.totalTranscripts?.toLocaleString('he-IL') || '0',
      icon: BookOpen,
      color: COLORS.green,
    },
    {
      title: 'תלמידים פעילים',
      value: crmLoading ? '...' : activeTotal.toLocaleString('he-IL'),
      icon: Users,
      color: COLORS.mint,
      subtitle: crmData ? `${oneOnOneTotal} פרטני | ${groupsTotal} קבוצות` : undefined,
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
                  {stat.subtitle && (
                    <p className="text-xs text-muted-foreground mt-0.5">{stat.subtitle}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Student Breakdown from Notion CRM */}
      {crmData && (
        <Card className="playful-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-voicely-green" />
              פירוט תלמידים (מ-Notion CRM)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Active Students Section */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">תלמידים פעילים ({crmData.activeStudents.total})</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* 1:1 New Students */}
                <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <UserCheck className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">1:1 חדשים</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {crmData.activeStudents.breakdown.oneOnOne.newStudents}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    פחות מ-3 חודשים
                  </p>
                </div>

                {/* 1:1 Veterans */}
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-200">1:1 ותיקים</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                    {crmData.activeStudents.breakdown.oneOnOne.veterans}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    3+ חודשים
                  </p>
                </div>

                {/* Groups New */}
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <UsersRound className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">קבוצות חדשים</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {crmData.activeStudents.breakdown.groups.newStudents}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    חמישי + ראשון
                  </p>
                </div>

                {/* Groups Veterans */}
                <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800 dark:text-orange-200">קבוצות ותיקים</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                    {crmData.activeStudents.breakdown.groups.veterans}
                  </p>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    3+ חודשים
                  </p>
                </div>
              </div>

              {/* Details row */}
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>סה"כ 1:1: {crmData.activeStudents.breakdown.oneOnOne.total}</span>
                <span>|</span>
                <span>קבוצת חמישי: {crmData.activeStudents.breakdown.groups.thursday}</span>
                <span>|</span>
                <span>קבוצת ראשון: {crmData.activeStudents.breakdown.groups.sunday}</span>
                {crmData.activeStudents.breakdown.veteransMarked > 0 && (
                  <>
                    <span>|</span>
                    <span>מסומנים ותיקים: {crmData.activeStudents.breakdown.veteransMarked}</span>
                  </>
                )}
              </div>
            </div>

            {/* Other Categories */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Paused */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <PauseCircle className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">בהפסקה</span>
                </div>
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                  {crmData.pausedStudents}
                </p>
              </div>

              {/* Completed */}
              <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800 dark:text-purple-200">סיימו ללמוד</span>
                </div>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {crmData.completedStudents}
                </p>
              </div>

              {/* Leads */}
              <div className="p-4 rounded-xl bg-cyan-50 dark:bg-cyan-950 border border-cyan-200 dark:border-cyan-800">
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus className="w-4 h-4 text-cyan-600" />
                  <span className="text-sm font-medium text-cyan-800 dark:text-cyan-200">לידים/מתעניינים</span>
                </div>
                <p className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">
                  {crmData.leads}
                </p>
                <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-1">
                  בתהליך מכירה
                </p>
              </div>

              {/* Not Relevant */}
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-red-800 dark:text-red-200">לא רלוונטי</span>
                </div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {crmData.notRelevant}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Student Sessions - מפגשים לפי תלמיד */}
      <StudentSessionsCard />

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
