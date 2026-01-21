import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Calendar, Clock, Users, User, Loader2, MapPin } from 'lucide-react';
import { useCalendarBookings, formatLessonTime } from '@/hooks/admin/useCalendarBookings';

const TeacherSchedule = () => {
  const navigate = useNavigate();
  const { data: calendarData, isLoading, error } = useCalendarBookings();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const dayName = date.toLocaleDateString('he-IL', { weekday: 'long' });
    const dateStr2 = date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });

    if (isToday) return `היום, ${dateStr2}`;
    if (isTomorrow) return `מחר, ${dateStr2}`;
    return `${dayName}, ${dateStr2}`;
  };

  const getCalendarBadgeColor = (calendarName: string) => {
    if (calendarName?.includes('קבוצות')) return 'bg-purple-500';
    if (calendarName?.includes('ניסיון')) return 'bg-green-500';
    if (calendarName?.includes('לסירוגין')) return 'bg-blue-500';
    return 'bg-voicely-orange';
  };

  // Group events by date
  const groupEventsByDate = (events: any[]) => {
    const grouped: Record<string, any[]> = {};
    events?.forEach((event) => {
      const dateKey = new Date(event.start).toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    return grouped;
  };

  const groupedEvents = groupEventsByDate(calendarData?.events || []);

  return (
    <div className="min-h-screen bg-background p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/teacher')}>
          <ArrowRight className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">לוח שיעורים</h1>
          <p className="text-muted-foreground text-sm">
            השיעורים הקרובים שלך השבוע
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-voicely-green">
              {calendarData?.todayCount ?? '--'}
            </div>
            <p className="text-xs text-muted-foreground">היום</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-voicely-orange">
              {calendarData?.weekCount ?? '--'}
            </div>
            <p className="text-xs text-muted-foreground">השבוע</p>
          </CardContent>
        </Card>
        <Card className="col-span-2">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">השיעור הבא</p>
            {calendarData?.nextLesson ? (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-voicely-coral" />
                <span className="font-medium">
                  {formatDate(calendarData.nextLesson.start)}, {formatLessonTime(calendarData.nextLesson.start)}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground">אין שיעורים קרובים</span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Events List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-voicely-green mb-4" />
          <p className="text-muted-foreground">טוען שיעורים...</p>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-destructive">שגיאה בטעינת השיעורים</p>
            <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
          </CardContent>
        </Card>
      ) : Object.keys(groupedEvents).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">אין שיעורים השבוע</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedEvents).map(([dateKey, events]) => (
            <div key={dateKey}>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-voicely-green" />
                {formatDate(events[0].start)}
                <Badge variant="outline" className="mr-2">
                  {events.length} שיעורים
                </Badge>
              </h2>
              <div className="space-y-3">
                {events.map((event: any) => (
                  <Card key={event.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{event.title}</h3>
                            <Badge className={`${getCalendarBadgeColor(event.calendarName)} text-white text-xs`}>
                              {event.calendarName}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatLessonTime(event.start)} - {formatLessonTime(event.end)}
                            </span>
                            {event.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {event.location}
                              </span>
                            )}
                          </div>
                          {event.attendees && event.attendees.length > 0 && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                              {event.calendarName?.includes('קבוצות') ? (
                                <Users className="w-3 h-3" />
                              ) : (
                                <User className="w-3 h-3" />
                              )}
                              <span>
                                {event.attendees.map((a: any) => a.name || a.email.split('@')[0]).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherSchedule;
