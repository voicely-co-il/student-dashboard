import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  ArrowRight,
  User,
  Flame,
  Star,
  Trophy,
  Music,
  Clock,
  Calendar,
  TrendingUp,
  TrendingDown,
  Play,
  MessageCircle,
  BarChart3,
  Target,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// DEMO DATA
// =====================================================

const DEMO_STUDENTS: Record<string, {
  id: string;
  name: string;
  avatar: string;
  joinDate: string;
  totalXP: number;
  currentStreak: number;
  longestStreak: number;
  lessonsAttended: number;
  challengesCompleted: number;
  challengesWon: number;
  avgPitchAccuracy: number;
  avgEnergyLevel: number;
  avgBreathControl: number;
  practiceMinutesTotal: number;
  practiceMinutesThisWeek: number;
  recentActivity: { date: string; type: string; description: string }[];
  strengths: string[];
  areasToImprove: string[];
  recentRecordings: { id: string; title: string; date: string; score: number }[];
}> = {
  '1': {
    id: '1',
    name: 'שיראל',
    avatar: '💫',
    joinDate: '2025-09-01',
    totalXP: 1250,
    currentStreak: 7,
    longestStreak: 14,
    lessonsAttended: 12,
    challengesCompleted: 5,
    challengesWon: 2,
    avgPitchAccuracy: 88,
    avgEnergyLevel: 85,
    avgBreathControl: 78,
    practiceMinutesTotal: 420,
    practiceMinutesThisWeek: 65,
    recentActivity: [
      { date: '2026-01-26', type: 'practice', description: 'תרגול נשימה - 15 דקות' },
      { date: '2026-01-25', type: 'challenge', description: 'השתתפה באתגר יהלומים' },
      { date: '2026-01-24', type: 'lesson', description: 'שיעור קבוצתי' },
    ],
    strengths: ['דיוק צליל מעולה', 'מוטיבציה גבוהה', 'השתתפות פעילה'],
    areasToImprove: ['שליטה בנשימה', 'ביטחון בביצוע סולו'],
    recentRecordings: [
      { id: 'r1', title: 'יהלומים - אתגר', date: '2026-01-25', score: 92 },
      { id: 'r2', title: 'Let It Go', date: '2026-01-20', score: 85 },
      { id: 'r3', title: 'אהבתיה', date: '2026-01-15', score: 78 },
    ],
  },
  '2': {
    id: '2',
    name: 'אורין',
    avatar: '🎤',
    joinDate: '2025-10-15',
    totalXP: 980,
    currentStreak: 5,
    longestStreak: 10,
    lessonsAttended: 10,
    challengesCompleted: 4,
    challengesWon: 1,
    avgPitchAccuracy: 82,
    avgEnergyLevel: 90,
    avgBreathControl: 75,
    practiceMinutesTotal: 350,
    practiceMinutesThisWeek: 45,
    recentActivity: [
      { date: '2026-01-25', type: 'practice', description: 'תרגול אנרגיה - 20 דקות' },
      { date: '2026-01-24', type: 'challenge', description: 'ניצחה באתגר Let It Go!' },
    ],
    strengths: ['אנרגיה גבוהה', 'ביטוי רגשי חזק'],
    areasToImprove: ['דיוק צליל', 'יציבות קולית'],
    recentRecordings: [
      { id: 'r1', title: 'Let It Go - אתגר', date: '2026-01-24', score: 88 },
      { id: 'r2', title: 'יהלומים', date: '2026-01-18', score: 76 },
    ],
  },
};

// =====================================================
// TEACHER STUDENT PROFILE PAGE
// =====================================================

export default function TeacherStudentProfilePage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  const student = DEMO_STUDENTS[studentId || '1'] || DEMO_STUDENTS['1'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/groups/teacher')}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-gray-900">פרופיל תלמיד</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Student Header Card */}
        <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-4xl">
                {student.avatar}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{student.name}</h2>
                <p className="text-white/80 text-sm">
                  הצטרף/ה: {new Date(student.joinDate).toLocaleDateString('he-IL')}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <Flame className="h-4 w-4 text-orange-300" />
                    <span className="text-sm">{student.currentStreak} ימים רצף</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-300" />
                    <span className="text-sm">{student.totalXP} XP</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Calendar className="h-5 w-5 text-blue-500" />}
            label="שיעורים"
            value={student.lessonsAttended.toString()}
          />
          <StatCard
            icon={<Trophy className="h-5 w-5 text-yellow-500" />}
            label="אתגרים הושלמו"
            value={student.challengesCompleted.toString()}
            subValue={`${student.challengesWon} ניצחונות`}
          />
          <StatCard
            icon={<Clock className="h-5 w-5 text-green-500" />}
            label="דקות תרגול"
            value={student.practiceMinutesTotal.toString()}
            subValue={`${student.practiceMinutesThisWeek} השבוע`}
          />
          <StatCard
            icon={<Flame className="h-5 w-5 text-orange-500" />}
            label="רצף שיא"
            value={`${student.longestStreak} ימים`}
          />
        </div>

        {/* Performance Metrics */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              מדדי ביצוע
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PerformanceBar label="דיוק צליל" value={student.avgPitchAccuracy} target={75} />
            <PerformanceBar label="רמת אנרגיה" value={student.avgEnergyLevel} target={70} />
            <PerformanceBar label="שליטה בנשימה" value={student.avgBreathControl} target={70} />
          </CardContent>
        </Card>

        {/* Strengths & Areas to Improve */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-green-50 border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg text-green-800">
                <Award className="h-5 w-5" />
                חוזקות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {student.strengths.map((strength, index) => (
                  <li key={index} className="flex items-center gap-2 text-green-700">
                    <TrendingUp className="h-4 w-4" />
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 border-amber-200">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg text-amber-800">
                <Target className="h-5 w-5" />
                לשיפור
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {student.areasToImprove.map((area, index) => (
                  <li key={index} className="flex items-center gap-2 text-amber-700">
                    <TrendingDown className="h-4 w-4" />
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Recent Recordings */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Music className="h-5 w-5 text-purple-500" />
              הקלטות אחרונות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {student.recentRecordings.map((recording) => (
                <div
                  key={recording.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Play className="h-5 w-5 text-purple-500" />
                  </Button>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{recording.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(recording.date).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className={cn(
                      'text-lg font-bold',
                      recording.score >= 80 ? 'text-green-600' : 'text-orange-600'
                    )}>
                      {recording.score}
                    </p>
                    <p className="text-xs text-gray-500">ציון</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-purple-500" />
              פעילות אחרונה
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {student.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    activity.type === 'practice' && 'bg-green-500',
                    activity.type === 'challenge' && 'bg-yellow-500',
                    activity.type === 'lesson' && 'bg-blue-500'
                  )} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.date).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="h-auto py-4 flex-col gap-2"
            onClick={() => alert('בקרוב: שליחת הודעה')}
          >
            <MessageCircle className="h-6 w-6 text-purple-500" />
            <span>שלח הודעה</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex-col gap-2"
            onClick={() => alert('בקרוב: הוספת הערה')}
          >
            <User className="h-6 w-6 text-purple-500" />
            <span>הוסף הערה</span>
          </Button>
        </div>
      </main>
    </div>
  );
}

// =====================================================
// HELPER COMPONENTS
// =====================================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
}

function StatCard({ icon, label, value, subValue }: StatCardProps) {
  return (
    <Card className="bg-white">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className="text-sm text-gray-500">{label}</span>
        </div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subValue && (
          <p className="text-xs text-gray-500 mt-0.5">{subValue}</p>
        )}
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
