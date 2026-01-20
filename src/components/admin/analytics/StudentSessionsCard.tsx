import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Calendar,
  Trophy,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { useStudentSessions, StudentSession } from '@/hooks/admin/useStudentSessions';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

const COLORS = {
  green: 'hsl(158, 72%, 52%)',
  mint: 'hsl(158, 60%, 70%)',
  yellow: 'hsl(45, 90%, 55%)',
  orange: 'hsl(24, 95%, 58%)',
  purple: 'hsl(271, 70%, 58%)',
  blue: 'hsl(217, 91%, 60%)',
};

// Status color mapping
const STATUS_COLORS: Record<string, string> = {
  'לומד 1:1': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'לומד 1:1 לסירוגין': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'לומד בקבוצה חמישי': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'לומד בקבוצה -ראשון': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'תלמידים ותיקים🎵': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  'סיימו ללמוד': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'בהפסקה': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

// MVP Sample Card for a specific student
function StudentMVPCard({ student }: { student: StudentSession }) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'לא ידוע';
    try {
      return format(new Date(dateStr), 'd בMMMM yyyy', { locale: he });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-voicely-green/10 via-voicely-mint/5 to-voicely-yellow/10 border-voicely-green/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-voicely-yellow" />
            כרטיס MVP לדוגמא
          </CardTitle>
          <Badge variant="outline" className="bg-voicely-yellow/20 text-voicely-yellow border-voicely-yellow/50">
            התלמיד עם הכי הרבה מפגשים
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Student Header */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-background/50 backdrop-blur">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-voicely-green to-voicely-mint flex items-center justify-center text-white text-2xl font-bold">
            {student.studentName.charAt(0)}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-foreground">{student.studentName}</h3>
            {student.crmStatus && (
              <Badge className={STATUS_COLORS[student.crmStatus] || 'bg-gray-100 text-gray-800'}>
                {student.crmStatus}
              </Badge>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Session Count */}
          <div className="p-4 rounded-xl bg-voicely-green/10 border border-voicely-green/30">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-voicely-green" />
              <span className="text-sm text-muted-foreground">מפגשים עם ענבל</span>
            </div>
            <p className="text-3xl font-bold text-voicely-green">{student.sessionCount}</p>
          </div>

          {/* Learning Duration */}
          <div className="p-4 rounded-xl bg-voicely-mint/10 border border-voicely-mint/30">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-voicely-mint" />
              <span className="text-sm text-muted-foreground">תקופת לימודים</span>
            </div>
            <p className="text-xl font-bold text-voicely-mint">
              {student.crmStartDate
                ? `מ-${formatDate(student.crmStartDate)}`
                : student.firstSession
                  ? `מ-${formatDate(student.firstSession)}`
                  : 'לא ידוע'
              }
            </p>
          </div>

          {/* First Session */}
          <div className="p-4 rounded-xl bg-voicely-yellow/10 border border-voicely-yellow/30">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-voicely-yellow" />
              <span className="text-sm text-muted-foreground">שיעור ראשון מתומלל</span>
            </div>
            <p className="text-lg font-semibold text-foreground">
              {formatDate(student.firstSession)}
            </p>
          </div>

          {/* Last Session */}
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">שיעור אחרון מתומלל</span>
            </div>
            <p className="text-lg font-semibold text-foreground">
              {formatDate(student.lastSession)}
            </p>
          </div>
        </div>

        {/* Placeholder for future features */}
        <div className="p-4 rounded-xl bg-muted/50 border border-dashed border-muted-foreground/30">
          <p className="text-sm text-muted-foreground text-center">
            כאן יופיעו בעתיד: גרף התקדמות, הישגים, מיומנויות מתורגלות, ותובנות AI
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Main component
export default function StudentSessionsCard() {
  const { data, isLoading, error } = useStudentSessions();
  const [showAll, setShowAll] = useState(false);

  if (isLoading) {
    return (
      <Card className="playful-shadow">
        <CardContent className="py-10">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-voicely-green" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="playful-shadow">
        <CardContent className="py-10">
          <p className="text-center text-muted-foreground">שגיאה בטעינת נתוני מפגשים</p>
        </CardContent>
      </Card>
    );
  }

  const displayStudents = showAll ? data.students : data.students.slice(0, 10);
  const topStudent = data.students[0];

  return (
    <div className="space-y-6">
      {/* MVP Card for top student */}
      {topStudent && <StudentMVPCard student={topStudent} />}

      {/* Sessions List */}
      <Card className="playful-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-voicely-green" />
              מפגשים לפי תלמיד
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{data.totalStudents} תלמידים</span>
              <span>|</span>
              <span>{data.totalSessions} מפגשים</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {displayStudents.map((student, index) => (
              <div
                key={student.studentName}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Rank Badge */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : index === 1
                        ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                        : index === 2
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {index + 1}
                  </div>

                  {/* Student Info */}
                  <div>
                    <p className="font-medium text-foreground">{student.studentName}</p>
                    {student.crmStatus && (
                      <Badge
                        variant="outline"
                        className={`text-xs ${STATUS_COLORS[student.crmStatus] || ''}`}
                      >
                        {student.crmStatus}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Session Count */}
                <div className="flex items-center gap-4">
                  {student.lastSession && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      אחרון: {format(new Date(student.lastSession), 'dd/MM/yy')}
                    </span>
                  )}
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-voicely-green/10 text-voicely-green font-semibold">
                    <span>{student.sessionCount}</span>
                    <span className="text-xs">מפגשים</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {data.students.length > 10 && (
            <Button
              variant="ghost"
              onClick={() => setShowAll(!showAll)}
              className="w-full mt-4"
            >
              {showAll ? (
                <>
                  <ChevronUp className="w-4 h-4 ml-2" />
                  הצג פחות
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 ml-2" />
                  הצג את כל {data.students.length} התלמידים
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
