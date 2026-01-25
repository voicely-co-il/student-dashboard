import { Trophy, Clock, Users, ChevronLeft, Music } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { WeeklyChallenge } from '@/types/groups';

// =====================================================
// ACTIVE CHALLENGE CARD
// Shows current active challenge with CTA
// =====================================================

interface ActiveChallengeCardProps {
  challenge: WeeklyChallenge;
  participantsCount: number;
  totalStudents: number;
  myRank?: number;
  hasParticipated: boolean;
  onJoin: () => void;
  onViewDetails: () => void;
  className?: string;
}

export default function ActiveChallengeCard({
  challenge,
  participantsCount,
  totalStudents,
  myRank,
  hasParticipated,
  onJoin,
  onViewDetails,
  className,
}: ActiveChallengeCardProps) {
  const timeRemaining = getTimeRemaining(new Date(challenge.ends_at));
  const isEnding = timeRemaining.hours < 24;
  const participationRate = totalStudents > 0
    ? Math.round((participantsCount / totalStudents) * 100)
    : 0;

  return (
    <Card className={cn(
      'overflow-hidden',
      isEnding && 'ring-2 ring-orange-400 ring-offset-2',
      className
    )}>
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 p-4 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-5 w-5" />
              <span className="text-sm font-medium opacity-90">אתגר השבוע</span>
            </div>
            <h3 className="text-lg font-bold">
              {challenge.title_he}
            </h3>
          </div>

          {isEnding && (
            <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-medium animate-pulse">
              מסתיים בקרוב!
            </span>
          )}
        </div>

        {/* Song Info */}
        <div className="flex items-center gap-2 mt-2 text-sm opacity-90">
          <Music className="h-4 w-4" />
          <span>{challenge.song_title}</span>
          {challenge.song_artist && (
            <span className="opacity-75">• {challenge.song_artist}</span>
          )}
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Stats Row */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            {/* Time Remaining */}
            <div className="flex items-center gap-1.5 text-gray-600">
              <Clock className={cn('h-4 w-4', isEnding && 'text-orange-500')} />
              <span className={cn(isEnding && 'text-orange-600 font-medium')}>
                {formatTimeRemaining(timeRemaining)}
              </span>
            </div>

            {/* Participants */}
            <div className="flex items-center gap-1.5 text-gray-600">
              <Users className="h-4 w-4" />
              <span>{participantsCount}/{totalStudents}</span>
            </div>
          </div>

          {/* My Rank */}
          {hasParticipated && myRank && (
            <div className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold',
              myRank === 1 && 'bg-yellow-100 text-yellow-700',
              myRank === 2 && 'bg-gray-100 text-gray-700',
              myRank === 3 && 'bg-orange-100 text-orange-700',
              myRank > 3 && 'bg-purple-100 text-purple-700'
            )}>
              {getRankEmoji(myRank)} מקום {myRank}
            </div>
          )}
        </div>

        {/* Participation Progress */}
        <div>
          <div className="flex items-center justify-between mb-1.5 text-xs text-gray-500">
            <span>השתתפות</span>
            <span>{participationRate}%</span>
          </div>
          <Progress value={participationRate} className="h-2" />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!hasParticipated ? (
            <Button
              className="flex-1 gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              onClick={onJoin}
            >
              <Trophy className="h-4 w-4" />
              אני רוצה להשתתף!
            </Button>
          ) : (
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={onJoin}
            >
              <Trophy className="h-4 w-4" />
              ניסיון נוסף
            </Button>
          )}

          <Button
            variant="ghost"
            className="gap-1 text-purple-600"
            onClick={onViewDetails}
          >
            פרטים
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================
// NO CHALLENGE CARD
// Shows when there's no active challenge
// =====================================================

export function NoChallengeCard({ className }: { className?: string }) {
  return (
    <Card className={cn('', className)}>
      <CardContent className="p-6 text-center">
        <span className="text-4xl">🎯</span>
        <h3 className="font-semibold text-gray-900 mt-2">
          אין אתגר פעיל כרגע
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          האתגר הבא יתחיל בקרוב!
        </p>
      </CardContent>
    </Card>
  );
}

// =====================================================
// HELPERS
// =====================================================

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  total: number;
}

function getTimeRemaining(endDate: Date): TimeRemaining {
  const now = new Date();
  const total = endDate.getTime() - now.getTime();

  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, total: 0 };
  }

  return {
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((total % (1000 * 60 * 60)) / (1000 * 60)),
    total,
  };
}

function formatTimeRemaining(time: TimeRemaining): string {
  if (time.total <= 0) return 'הסתיים';

  if (time.days > 0) {
    return `עוד ${time.days} ימים`;
  }

  if (time.hours > 0) {
    return `עוד ${time.hours} שעות`;
  }

  return `עוד ${time.minutes} דקות`;
}

function getRankEmoji(rank: number): string {
  switch (rank) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return '🏅';
  }
}
