import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Flame, Shield } from 'lucide-react';

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  hasStreakFreeze?: boolean;
  streakFreezeAvailable?: boolean;
}

const StreakCard: React.FC<StreakCardProps> = ({
  currentStreak,
  longestStreak,
  hasStreakFreeze = false,
  streakFreezeAvailable = true,
}) => {
  // Milestone thresholds
  const milestones = [7, 30, 100, 365];
  const nextMilestone = milestones.find(m => m > currentStreak) || milestones[milestones.length - 1];
  const prevMilestone = milestones.filter(m => m <= currentStreak).pop() || 0;
  const progressToNext = ((currentStreak - prevMilestone) / (nextMilestone - prevMilestone)) * 100;

  // Fire intensity based on streak
  const getFireIntensity = () => {
    if (currentStreak >= 100) return 'text-orange-500 animate-pulse';
    if (currentStreak >= 30) return 'text-orange-400';
    if (currentStreak >= 7) return 'text-yellow-500';
    return 'text-yellow-400';
  };

  const getFireSize = () => {
    if (currentStreak >= 100) return 'w-16 h-16';
    if (currentStreak >= 30) return 'w-14 h-14';
    if (currentStreak >= 7) return 'w-12 h-12';
    return 'w-10 h-10';
  };

  return (
    <Card className="playful-shadow overflow-hidden bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 border-orange-200/50">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">רצף תרגול</h3>
          {streakFreezeAvailable && (
            <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
              <Shield className="w-3 h-3" />
              <span>הגנה זמינה</span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center py-4">
          {/* Fire Icon with Animation */}
          <div className="relative">
            <Flame
              className={`${getFireSize()} ${getFireIntensity()} transition-all duration-500 drop-shadow-lg`}
              style={{
                filter: currentStreak >= 7 ? 'drop-shadow(0 0 8px rgba(251, 146, 60, 0.5))' : undefined
              }}
            />
            {currentStreak >= 30 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full animate-ping opacity-75" />
            )}
          </div>

          {/* Streak Number */}
          <div className="mt-3 text-center">
            <span className="text-4xl font-bold text-orange-600 dark:text-orange-400">
              {currentStreak}
            </span>
            <span className="text-lg text-muted-foreground mr-1">ימים</span>
          </div>

          {/* Progress to next milestone */}
          <div className="w-full mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{prevMilestone} ימים</span>
              <span>{nextMilestone} ימים</span>
            </div>
            <div className="h-2 bg-orange-200/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(progressToNext, 100)}%` }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="flex justify-between w-full mt-4 text-sm">
            <div className="text-center">
              <div className="text-muted-foreground">רצף הכי ארוך</div>
              <div className="font-semibold text-foreground">{longestStreak} ימים</div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground">עד אבן דרך</div>
              <div className="font-semibold text-foreground">{nextMilestone - currentStreak} ימים</div>
            </div>
          </div>
        </div>

        {/* Milestone celebration */}
        {milestones.includes(currentStreak) && (
          <div className="mt-2 text-center text-sm font-medium text-orange-600 bg-orange-100 dark:bg-orange-900/30 rounded-lg py-2">
            🎉 מזל טוב! הגעת ל-{currentStreak} ימים רצופים!
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StreakCard;
