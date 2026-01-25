import { ChevronRight, Bell, Settings, Flame, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// =====================================================
// HEADER COMPONENT
// Top navigation bar for student dashboard
// =====================================================

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  studentName?: string;
  avatarEmoji?: string;
  streak?: number;
  xp?: number;
}

export default function Header({
  title,
  showBackButton = false,
  onBack,
  studentName,
  avatarEmoji = '🎤',
  streak = 0,
  xp = 0,
}: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
      <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          {showBackButton ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-9 w-9"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-2xl">{avatarEmoji}</span>
              {studentName && (
                <span className="font-medium text-gray-900">
                  {studentName}
                </span>
              )}
            </div>
          )}

          {title && (
            <h1 className="font-semibold text-gray-900">{title}</h1>
          )}
        </div>

        {/* Right Section - Stats & Actions */}
        <div className="flex items-center gap-2">
          {/* Streak */}
          {streak > 0 && (
            <div className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium',
              streak >= 7 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'
            )}>
              <Flame className={cn(
                'h-4 w-4',
                streak >= 7 && 'animate-pulse text-orange-500'
              )} />
              <span>{streak}</span>
            </div>
          )}

          {/* XP */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 text-purple-600 text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            <span>{formatXP(xp)}</span>
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="h-9 w-9 relative">
            <Bell className="h-5 w-5 text-gray-600" />
            {/* Notification dot */}
            {/* <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" /> */}
          </Button>

          {/* Settings */}
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Settings className="h-5 w-5 text-gray-600" />
          </Button>
        </div>
      </div>
    </header>
  );
}

// Format XP with K suffix for large numbers
function formatXP(xp: number): string {
  if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1)}K`;
  }
  return xp.toString();
}
