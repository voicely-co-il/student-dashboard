import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FileText, Calendar, TrendingUp, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StudentCardData {
  name: string;
  originalName?: string; // Original name from transcript (for navigation)
  transcriptCount: number;
  firstLesson: string | null;
  lastLesson: string | null;
  // Optional: will be added later
  avgScore?: number;
  streak?: number;
}

interface StudentCardProps {
  student: StudentCardData;
  onClick?: () => void;
  isSelected?: boolean;
}

const StudentCard = ({ student, onClick, isSelected }: StudentCardProps) => {
  // Get initials for avatar
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return name.slice(0, 2);
  };

  // Format date for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('he-IL', {
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  // Calculate days since last lesson
  const getDaysSinceLastLesson = () => {
    if (!student.lastLesson) return null;
    const lastDate = new Date(student.lastLesson);
    const today = new Date();
    const diffTime = today.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysSince = getDaysSinceLastLesson();

  // Determine activity status
  const getActivityStatus = () => {
    if (daysSince === null) return 'unknown';
    if (daysSince <= 7) return 'active';
    if (daysSince <= 30) return 'recent';
    return 'inactive';
  };

  const activityStatus = getActivityStatus();

  return (
    <Card
      className={cn(
        'playful-shadow cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]',
        isSelected && 'ring-2 ring-voicely-green'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <Avatar className="h-12 w-12 bg-gradient-to-br from-voicely-green to-voicely-coral">
            <AvatarFallback className="text-white font-bold">
              {getInitials(student.name)}
            </AvatarFallback>
          </Avatar>

          {/* Main Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {student.name}
            </h3>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {student.transcriptCount} תמלולים
              </span>
              {student.lastLesson && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(student.lastLesson)}
                </span>
              )}
            </div>
          </div>

          {/* Activity Badge */}
          <div className="flex flex-col items-end gap-2">
            <Badge
              variant={activityStatus === 'active' ? 'default' : 'secondary'}
              className={cn(
                activityStatus === 'active' && 'bg-voicely-green',
                activityStatus === 'inactive' && 'bg-muted text-muted-foreground'
              )}
            >
              {activityStatus === 'active' && 'פעיל'}
              {activityStatus === 'recent' && `לפני ${daysSince} ימים`}
              {activityStatus === 'inactive' && 'לא פעיל'}
              {activityStatus === 'unknown' && 'חדש'}
            </Badge>
            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        {/* Optional Stats Row */}
        {(student.avgScore || student.streak) && (
          <div className="flex gap-4 mt-3 pt-3 border-t">
            {student.avgScore && (
              <div className="flex items-center gap-1 text-sm">
                <TrendingUp className="h-4 w-4 text-voicely-green" />
                <span>ציון: {student.avgScore}</span>
              </div>
            )}
            {student.streak && student.streak > 0 && (
              <div className="flex items-center gap-1 text-sm">
                <span>🔥</span>
                <span>רצף: {student.streak} ימים</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentCard;
