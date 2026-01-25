import { Calendar, Clock, Video, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// =====================================================
// NEXT LESSON CARD
// Shows upcoming lesson with join button
// =====================================================

interface NextLessonCardProps {
  date: Date;
  teacherName: string;
  duration?: number; // minutes
  zoomLink?: string;
  location?: string;
  className?: string;
}

export default function NextLessonCard({
  date,
  teacherName,
  duration = 45,
  zoomLink,
  location,
  className,
}: NextLessonCardProps) {
  const isToday = isSameDay(date, new Date());
  const isSoon = isWithinHours(date, 2);
  const formattedDate = formatHebrewDate(date);
  const formattedTime = formatTime(date);

  return (
    <Card className={cn(
      'overflow-hidden',
      isSoon && 'ring-2 ring-purple-500 ring-offset-2',
      className
    )}>
      {/* Accent bar */}
      <div className={cn(
        'h-1',
        isSoon ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-purple-200'
      )} />

      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Info */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>{formattedDate}</span>
              {isToday && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  היום!
                </span>
              )}
            </div>

            <h3 className="text-lg font-semibold text-gray-900">
              שיעור עם {teacherName}
            </h3>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{formattedTime}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{duration} דקות</span>
              </div>
              {location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Action */}
          <div className="flex flex-col gap-2">
            {zoomLink && (
              <Button
                size="sm"
                className={cn(
                  'gap-2',
                  isSoon && 'animate-pulse bg-purple-600 hover:bg-purple-700'
                )}
                onClick={() => window.open(zoomLink, '_blank')}
                disabled={!isSoon && !isToday}
              >
                <Video className="h-4 w-4" />
                הצטרף לזום
              </Button>
            )}

            {!isSoon && (
              <Button variant="outline" size="sm">
                תזכורת
              </Button>
            )}
          </div>
        </div>

        {/* Countdown if lesson is today */}
        {isToday && !isSoon && (
          <div className="mt-3 pt-3 border-t text-center">
            <CountdownTimer targetDate={date} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =====================================================
// COUNTDOWN TIMER
// =====================================================

function CountdownTimer({ targetDate }: { targetDate: Date }) {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();

  if (diff <= 0) return null;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="text-sm text-gray-600">
      <span>עוד </span>
      <span className="font-semibold text-purple-600">
        {hours > 0 ? `${hours} שעות ו-` : ''}
        {minutes} דקות
      </span>
    </div>
  );
}

// =====================================================
// HELPERS
// =====================================================

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

function isWithinHours(date: Date, hours: number): boolean {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return diff > 0 && diff <= hours * 60 * 60 * 1000;
}

function formatHebrewDate(date: Date): string {
  const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const day = days[date.getDay()];
  const dateNum = date.getDate();
  const month = date.getMonth() + 1;

  return `יום ${day}, ${dateNum}/${month}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
