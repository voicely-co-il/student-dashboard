import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Trophy,
  BarChart3,
  AlertTriangle,
  ChevronLeft,
  Bell,
  Settings,
  Plus,
  TrendingUp,
  TrendingDown,
  Clock,
  MessageCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useGroupStudents, useChallenges } from '@/hooks/groups';
import { GroupStudent, WeeklyChallenge } from '@/types/groups';

// =====================================================
// TEACHER DASHBOARD
// Overview of group performance and management
// =====================================================

export default function TeacherDashboard() {
  const navigate = useNavigate();
  // TODO: Get group ID from teacher context/auth
  const groupId = 'mock-group-id';

  const { data: students = [], isLoading: loadingStudents } = useGroupStudents(groupId);
  const { data: challenges = [], isLoading: loadingChallenges } = useChallenges();

  // Calculate stats
  const activeStudents = students.filter(s => s.is_active);
  const atRiskStudents = students.filter(s => s.current_streak === 0);
  const avgStreak = students.length > 0
    ? Math.round(students.reduce((sum, s) => sum + s.current_streak, 0) / students.length)
    : 0;

  const activeChallenge = challenges.find(c => c.status === 'active');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">דשבורד מורה</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">שלום ענבל! 👋</h2>
          <p className="text-gray-600 mt-1">הנה הסיכום של הקבוצה שלך</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="תלמידות פעילות"
            value={activeStudents.length}
            total={students.length}
            color="blue"
          />
          <StatCard
            icon={TrendingUp}
            label="ממוצע רצף"
            value={`${avgStreak} ימים`}
            trend={+2}
            color="green"
          />
          <StatCard
            icon={AlertTriangle}
            label="צריכות עזרה"
            value={atRiskStudents.length}
            color="orange"
            alert={atRiskStudents.length > 0}
          />
          <StatCard
            icon={Trophy}
            label="אתגר פעיל"
            value={activeChallenge ? '1' : '0'}
            color="purple"
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Students List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">
                התלמידות שלך
              </CardTitle>
              <Button variant="ghost" size="sm" className="gap-1">
                הכל
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {students.length === 0 ? (
                <p className="text-gray-500 text-center py-4">אין תלמידות בקבוצה</p>
              ) : (
                students.slice(0, 5).map((student) => (
                  <StudentRow
                    key={student.id}
                    student={student}
                    onClick={() => navigate(`/groups/teacher/students/${student.id}`)}
                  />
                ))
              )}
            </CardContent>
          </Card>

          {/* Challenges */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">
                אתגרים
              </CardTitle>
              <Button
                size="sm"
                className="gap-1"
                onClick={() => navigate('/groups/teacher/challenges/new')}
              >
                <Plus className="h-4 w-4" />
                חדש
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeChallenge ? (
                <ChallengeRow
                  challenge={activeChallenge}
                  onClick={() => navigate(`/groups/teacher/challenges/${activeChallenge.id}`)}
                />
              ) : (
                <div className="text-center py-6">
                  <Trophy className="h-12 w-12 mx-auto text-gray-300" />
                  <p className="text-gray-500 mt-2">אין אתגר פעיל</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-1"
                    onClick={() => navigate('/groups/teacher/challenges/new')}
                  >
                    <Plus className="h-4 w-4" />
                    צור אתגר חדש
                  </Button>
                </div>
              )}

              {/* Recent challenges */}
              {challenges
                .filter(c => c.status === 'ended')
                .slice(0, 2)
                .map(challenge => (
                  <ChallengeRow
                    key={challenge.id}
                    challenge={challenge}
                    onClick={() => navigate(`/groups/teacher/challenges/${challenge.id}`)}
                  />
                ))
              }
            </CardContent>
          </Card>
        </div>

        {/* Weekly Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              סטטיסטיקות שבועיות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricBox
                label="ממוצע Pitch"
                value={73}
                change={+5}
                suffix="%"
              />
              <MetricBox
                label="תרגילים שהושלמו"
                value={47}
                change={-8}
                total={84}
              />
              <MetricBox
                label="זמן תרגול ממוצע"
                value={18}
                change={+3}
                suffix=" דק'/יום"
              />
              <MetricBox
                label="מעורבות"
                value={75}
                change={-5}
                suffix="%"
              />
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        {atRiskStudents.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-orange-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                תלמידות שזקוקות לעזרה
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {atRiskStudents.map(student => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{student.avatar_emoji}</span>
                    <div>
                      <p className="font-medium text-gray-900">{student.student_name}</p>
                      <p className="text-sm text-gray-500">
                        לא תרגלה כבר {getDaysInactive(student)} ימים
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1">
                    <MessageCircle className="h-4 w-4" />
                    שלח הודעה
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

// =====================================================
// STAT CARD
// =====================================================

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  total?: number;
  trend?: number;
  color: 'blue' | 'green' | 'orange' | 'purple';
  alert?: boolean;
}

function StatCard({ icon: Icon, label, value, total, trend, color, alert }: StatCardProps) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <Card className={cn(alert && 'ring-2 ring-orange-400')}>
      <CardContent className="p-4">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', colors[color])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex items-end gap-1">
          <span className="text-2xl font-bold text-gray-900">{value}</span>
          {total && <span className="text-gray-400 mb-0.5">/{total}</span>}
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-sm text-gray-500">{label}</span>
          {trend !== undefined && (
            <span className={cn(
              'text-xs font-medium flex items-center gap-0.5',
              trend > 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(trend)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================
// STUDENT ROW
// =====================================================

interface StudentRowProps {
  student: GroupStudent;
  onClick: () => void;
}

function StudentRow({ student, onClick }: StudentRowProps) {
  const isAtRisk = student.current_streak === 0;
  const practiceRate = Math.random() * 100; // TODO: Calculate from real data

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-lg transition-all text-right',
        isAtRisk ? 'bg-orange-50 hover:bg-orange-100' : 'bg-gray-50 hover:bg-gray-100'
      )}
    >
      <span className="text-xl">{student.avatar_emoji}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 truncate">
            {student.student_name}
          </span>
          {isAtRisk && (
            <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Progress value={practiceRate} className="h-1.5 flex-1" />
          <span className="text-xs text-gray-500">{Math.round(practiceRate)}%</span>
        </div>
      </div>

      {student.current_streak > 0 && (
        <div className="flex items-center gap-1 text-orange-500">
          <span className="text-sm">🔥</span>
          <span className="text-sm font-medium">{student.current_streak}</span>
        </div>
      )}

      <ChevronLeft className="h-5 w-5 text-gray-400" />
    </button>
  );
}

// =====================================================
// CHALLENGE ROW
// =====================================================

interface ChallengeRowProps {
  challenge: WeeklyChallenge;
  onClick: () => void;
}

function ChallengeRow({ challenge, onClick }: ChallengeRowProps) {
  const isActive = challenge.status === 'active';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-lg transition-all text-right',
        isActive ? 'bg-purple-50 hover:bg-purple-100' : 'bg-gray-50 hover:bg-gray-100'
      )}
    >
      <div className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center',
        isActive ? 'bg-purple-100' : 'bg-gray-100'
      )}>
        <Trophy className={cn('h-5 w-5', isActive ? 'text-purple-600' : 'text-gray-400')} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 truncate">
            {challenge.title_he}
          </span>
          {isActive && (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
              פעיל
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 truncate">{challenge.song_title}</p>
      </div>

      <ChevronLeft className="h-5 w-5 text-gray-400" />
    </button>
  );
}

// =====================================================
// METRIC BOX
// =====================================================

interface MetricBoxProps {
  label: string;
  value: number;
  change?: number;
  total?: number;
  suffix?: string;
}

function MetricBox({ label, value, change, total, suffix = '' }: MetricBoxProps) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <div className="flex items-end gap-1">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {total && <span className="text-gray-400 mb-0.5">/{total}</span>}
        {suffix && <span className="text-gray-500 mb-0.5">{suffix}</span>}
      </div>
      {change !== undefined && (
        <div className={cn(
          'flex items-center gap-1 mt-1 text-xs',
          change > 0 ? 'text-green-600' : 'text-red-600'
        )}>
          {change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          <span>{change > 0 ? '+' : ''}{change} מהשבוע שעבר</span>
        </div>
      )}
    </div>
  );
}

// =====================================================
// HELPERS
// =====================================================

function getDaysInactive(student: GroupStudent): number {
  if (!student.last_practice_at) return 999;
  const lastPractice = new Date(student.last_practice_at);
  const now = new Date();
  const diffMs = now.getTime() - lastPractice.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
