import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Calendar, Search, BarChart3, LogOut, Loader2, MessageCircle } from 'lucide-react';
import voicelyLogo from '@/assets/voicely-logo.png';
import { useCalendarBookings, formatLessonTime, formatLessonDate } from '@/hooks/admin/useCalendarBookings';
import { useNotionCRM } from '@/hooks/admin/useNotionCRM';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { profile, signOut, isAdmin } = useAuth();
  const { data: calendarData, isLoading: calendarLoading } = useCalendarBookings();
  const { data: crmData, isLoading: crmLoading } = useNotionCRM();

  // Format next lesson info
  const getNextLessonText = () => {
    if (calendarLoading) return '...';
    if (!calendarData?.nextLesson) return 'אין שיעורים קרובים';

    const date = formatLessonDate(calendarData.nextLesson.start);
    const time = formatLessonTime(calendarData.nextLesson.start);
    return `${date}, ${time}`;
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="p-4 pt-6 flex items-center justify-between border-b">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            שלום, {profile?.name ?? 'מורה'}! 👋
          </h1>
          <p className="text-muted-foreground text-sm">
            {isAdmin ? 'לוח בקרה - מנהל' : 'לוח בקרה - מורה'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="w-5 h-5" />
          </Button>
          <img
            src={voicelyLogo}
            alt="Voicely"
            className="h-12 w-auto object-contain"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="playful-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                סה״כ תלמידים
              </CardTitle>
              <Users className="w-4 h-4 text-voicely-green" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {crmLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  crmData?.activeStudents?.total || '--'
                )}
              </div>
              <p className="text-xs text-muted-foreground">פעילים השבוע</p>
            </CardContent>
          </Card>

          <Card className="playful-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                שיעורים היום
              </CardTitle>
              <Calendar className="w-4 h-4 text-voicely-orange" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {calendarLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  calendarData?.todayCount ?? '--'
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                השיעור הבא: {getNextLessonText()}
              </p>
            </CardContent>
          </Card>

          <Card className="playful-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                תמלולים
              </CardTitle>
              <Search className="w-4 h-4 text-voicely-coral" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">825</div>
              <p className="text-xs text-muted-foreground">מ-828 מעובדים</p>
            </CardContent>
          </Card>

          <Card className="playful-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                שיעורים השבוע
              </CardTitle>
              <BarChart3 className="w-4 h-4 text-voicely-yellow" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {calendarLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  calendarData?.weekCount ?? '--'
                )}
              </div>
              <p className="text-xs text-muted-foreground">עד סוף השבוע</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card
            className="playful-shadow hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate('/teacher/students')}
          >
            <CardContent className="p-6 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-voicely-green/10 flex items-center justify-center">
                <Users className="w-8 h-8 text-voicely-green" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">התלמידים שלי</h3>
                <p className="text-sm text-muted-foreground">
                  צפייה בכל התלמידים והתקדמותם
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="playful-shadow hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate('/teacher/search')}
          >
            <CardContent className="p-6 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-voicely-orange/10 flex items-center justify-center">
                <Search className="w-8 h-8 text-voicely-orange" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">חיפוש חכם AI</h3>
                <p className="text-sm text-muted-foreground">
                  חיפוש סמנטי בכל התמלולים
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="playful-shadow hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-voicely-coral/10 flex items-center justify-center">
                <Calendar className="w-8 h-8 text-voicely-coral" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">לוח שיעורים</h3>
                <p className="text-sm text-muted-foreground">
                  ניהול וקביעת שיעורים
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="playful-shadow hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-voicely-green/5 to-voicely-orange/5"
            onClick={() => window.open('https://voicely-chat.vercel.app', '_blank')}
          >
            <CardContent className="p-6 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-voicely-yellow/20 flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-voicely-yellow" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">צ׳אט AI</h3>
                <p className="text-sm text-muted-foreground">
                  שיחה חכמה עם העוזר האישי
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Placeholder for future content */}
        <Card className="playful-shadow">
          <CardHeader>
            <CardTitle>פעילות אחרונה</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>בקרוב - רשימת הפעילויות האחרונות</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TeacherDashboard;
