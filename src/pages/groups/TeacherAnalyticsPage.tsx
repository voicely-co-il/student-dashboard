import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3,
  Users,
  Trophy,
  TrendingUp,
  TrendingDown,
  Flame,
  Star,
  Music,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// DEMO DATA
// =====================================================

const DEMO_STATS = {
  totalStudents: 5,
  activeStudents: 4,
  avgStreak: 4.2,
  totalXP: 3420,
  challengesCompleted: 8,
  avgPitchAccuracy: 76,
  avgEnergyLevel: 72,
  avgBreathControl: 68,
  practiceMinutesThisWeek: 245,
  practiceMinutesLastWeek: 198,
};

const DEMO_WEEKLY_PROGRESS = [
  { day: 'א', students: 3, minutes: 35 },
  { day: 'ב', students: 4, minutes: 42 },
  { day: 'ג', students: 2, minutes: 28 },
  { day: 'ד', students: 5, minutes: 55 },
  { day: 'ה', students: 3, minutes: 38 },
  { day: 'ו', students: 2, minutes: 25 },
  { day: 'ש', students: 4, minutes: 22 },
];

const DEMO_STUDENTS = [
  { id: '1', name: 'שיראל', avatar: '💫', xp: 1250, streak: 7, lastActive: '2 שעות', trend: 'up', pitchAccuracy: 88 },
  { id: '2', name: 'אורין', avatar: '🎤', xp: 980, streak: 5, lastActive: '1 יום', trend: 'up', pitchAccuracy: 82 },
  { id: '3', name: 'עדי', avatar: '🌟', xp: 850, streak: 3, lastActive: '3 שעות', trend: 'stable', pitchAccuracy: 76 },
  { id: '4', name: 'לירז', avatar: '🦋', xp: 340, streak: 2, lastActive: '5 ימים', trend: 'down', pitchAccuracy: 65 },
  { id: '5', name: 'תהל', avatar: '🎵', xp: 0, streak: 0, lastActive: '14 ימים', trend: 'down', pitchAccuracy: 0 },
];

const DEMO_CHALLENGES = [
  { id: '1', title: 'אתגר יהלומים', participation: 80, avgScore: 78, winner: 'שיראל' },
  { id: '2', title: 'אתגר Let It Go', participation: 100, avgScore: 72, winner: 'אורין' },
  { id: '3', title: 'אתגר אהבתיה', participation: 60, avgScore: 68, winner: 'עדי' },
];

// =====================================================
// TEACHER ANALYTICS PAGE
// =====================================================

export default function TeacherAnalyticsPage() {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');

  const stats = DEMO_STATS;
  const weeklyProgress = DEMO_WEEKLY_PROGRESS;
  const students = DEMO_STUDENTS;
  const challenges = DEMO_CHALLENGES;

  const practiceChange = ((stats.practiceMinutesThisWeek - stats.practiceMinutesLastWeek) / stats.practiceMinutesLastWeek) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-500" />
            אנליטיקס קבוצה
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant={selectedPeriod === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('week')}
              className={selectedPeriod === 'week' ? 'bg-purple-500' : ''}
            >
              שבוע
            </Button>
            <Button
              variant={selectedPeriod === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('month')}
              className={selectedPeriod === 'month' ? 'bg-purple-500' : ''}
            >
              חודש
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            icon={<Users className="h-5 w-5 text-blue-500" />}
            label="תלמידים פעילים"
            value={`${stats.activeStudents}/${stats.totalStudents}`}
            trend={stats.activeStudents >= stats.totalStudents * 0.8 ? 'up' : 'down'}
          />
          <MetricCard
            icon={<Flame className="h-5 w-5 text-orange-500" />}
            label="רצף ממוצע"
            value={`${stats.avgStreak} ימים`}
          />
          <MetricCard
            icon={<Clock className="h-5 w-5 text-green-500" />}
            label="דקות תרגול השבוע"
            value={stats.practiceMinutesThisWeek.toString()}
            trend={practiceChange > 0 ? 'up' : 'down'}
            change={`${practiceChange > 0 ? '+' : ''}${practiceChange.toFixed(0)}%`}
          />
          <MetricCard
            icon={<Star className="h-5 w-5 text-yellow-500" />}
            label="XP קבוצתי"
            value={stats.totalXP.toLocaleString()}
          />
        </div>

        {/* Weekly Activity Chart */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-purple-500" />
              פעילות שבועית
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2 h-32">
              {weeklyProgress.map((day, index) => {
                const maxMinutes = Math.max(...weeklyProgress.map(d => d.minutes));
                const heightPercent = (day.minutes / maxMinutes) * 100;

                return (
                  <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-xs text-gray-500">{day.minutes}ד׳</div>
                    <div
                      className="w-full bg-gradient-to-t from-purple-500 to-pink-400 rounded-t-md transition-all"
                      style={{ height: `${heightPercent}%`, minHeight: '8px' }}
                    />
                    <div className="text-xs font-medium text-gray-600">{day.day}׳</div>
                    <div className="text-[10px] text-gray-400">{day.students} תלמידים</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              ביצועים ממוצעים
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PerformanceBar label="דיוק צליל" value={stats.avgPitchAccuracy} target={75} />
            <PerformanceBar label="רמת אנרגיה" value={stats.avgEnergyLevel} target={70} />
            <PerformanceBar label="שליטה בנשימה" value={stats.avgBreathControl} target={70} />
          </CardContent>
        </Card>

        {/* Students Overview */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-purple-500" />
                סטטוס תלמידים
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {students.map((student) => (
                <div
                  key={student.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors',
                    student.streak === 0 && 'bg-red-50'
                  )}
                  onClick={() => navigate(`/groups/teacher/students/${student.id}`)}
                >
                  {/* Avatar */}
                  <span className="text-2xl">{student.avatar}</span>

                  {/* Name & Status */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{student.name}</span>
                      <TrendIndicator trend={student.trend} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Flame className="h-3 w-3 text-orange-400" />
                        {student.streak} ימים
                      </span>
                      <span>פעיל: {student.lastActive}</span>
                    </div>
                  </div>

                  {/* Pitch Accuracy */}
                  <div className="text-left w-20">
                    <p className="text-sm font-medium text-gray-900">
                      {student.pitchAccuracy > 0 ? `${student.pitchAccuracy}%` : '-'}
                    </p>
                    <p className="text-xs text-gray-500">דיוק צליל</p>
                  </div>

                  {/* XP */}
                  <div className="text-left w-16">
                    <p className="text-sm font-bold text-purple-600">{student.xp}</p>
                    <p className="text-xs text-gray-500">XP</p>
                  </div>

                  <ChevronLeft className="h-5 w-5 text-gray-400" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Challenge Performance */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-yellow-500" />
              ביצועים באתגרים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {challenges.map((challenge) => (
                <div
                  key={challenge.id}
                  className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{challenge.title}</h4>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span>השתתפות: {challenge.participation}%</span>
                      <span>ציון ממוצע: {challenge.avgScore}</span>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-gray-600">מנצח/ת</p>
                    <p className="font-medium text-purple-600">{challenge.winner}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        {students.some(s => s.streak === 0) && (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4">
              <h3 className="font-semibold text-red-900 mb-2">תלמידים לא פעילים</h3>
              <div className="space-y-2">
                {students.filter(s => s.streak === 0 || s.lastActive.includes('14')).map(student => (
                  <div key={student.id} className="flex items-center justify-between">
                    <span className="text-red-800">
                      {student.avatar} {student.name} - לא פעיל {student.lastActive}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200"
                      onClick={() => alert(`שולח תזכורת ל-${student.name}`)}
                    >
                      שלח תזכורת
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="h-auto py-4 flex-col gap-2"
            onClick={() => navigate('/groups/teacher/challenges/new')}
          >
            <Trophy className="h-6 w-6 text-purple-500" />
            <span>יצירת אתגר חדש</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex-col gap-2"
            onClick={() => alert('בקרוב: ייצוא דוח')}
          >
            <BarChart3 className="h-6 w-6 text-purple-500" />
            <span>ייצוא דוח</span>
          </Button>
        </div>
      </main>
    </div>
  );
}

// =====================================================
// HELPER COMPONENTS
// =====================================================

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: 'up' | 'down';
  change?: string;
}

function MetricCard({ icon, label, value, trend, change }: MetricCardProps) {
  return (
    <Card className="bg-white">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          {icon}
          {trend && (
            <span className={cn(
              'text-xs font-medium',
              trend === 'up' ? 'text-green-600' : 'text-red-600'
            )}>
              {change}
            </span>
          )}
        </div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </CardContent>
    </Card>
  );
}

function PerformanceBar({ label, value, target }: { label: string; value: number; target: number }) {
  const isAboveTarget = value >= target;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600">{label}</span>
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-sm font-medium',
            isAboveTarget ? 'text-green-600' : 'text-orange-600'
          )}>
            {value}%
          </span>
          <span className="text-xs text-gray-400">(יעד: {target}%)</span>
        </div>
      </div>
      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isAboveTarget ? 'bg-green-500' : 'bg-orange-500'
          )}
          style={{ width: `${value}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-gray-400"
          style={{ left: `${target}%` }}
        />
      </div>
    </div>
  );
}

function TrendIndicator({ trend }: { trend: string }) {
  if (trend === 'up') {
    return <TrendingUp className="h-4 w-4 text-green-500" />;
  }
  if (trend === 'down') {
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  }
  return <div className="h-4 w-4" />;
}
