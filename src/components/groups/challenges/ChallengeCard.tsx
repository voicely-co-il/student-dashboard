import { Trophy, Clock, Users, Music, ChevronLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WeeklyChallenge, ChallengeStatus } from '@/types/groups';

// =====================================================
// CHALLENGE CARD
// Display card for challenge list
// =====================================================

interface ChallengeCardProps {
  challenge: WeeklyChallenge;
  participantsCount?: number;
  myRank?: number;
  hasParticipated?: boolean;
  onClick: () => void;
  className?: string;
}

export default function ChallengeCard({
  challenge,
  participantsCount = 0,
  myRank,
  hasParticipated = false,
  onClick,
  className,
}: ChallengeCardProps) {
  const isActive = challenge.status === 'active';
  const isEnded = challenge.status === 'ended';
  const timeInfo = getTimeInfo(challenge);

  return (
    <Card
      className={cn(
        'overflow-hidden cursor-pointer transition-all hover:shadow-md',
        isActive && 'ring-1 ring-purple-200',
        className
      )}
      onClick={onClick}
    >
      {/* Status Bar */}
      <div className={cn(
        'h-1.5',
        isActive && 'bg-gradient-to-r from-purple-500 to-pink-500',
        isEnded && 'bg-gray-300',
        !isActive && !isEnded && 'bg-gray-200'
      )} />

      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <div className="flex items-center gap-2 mb-1">
              <Trophy className={cn(
                'h-4 w-4 flex-shrink-0',
                isActive ? 'text-purple-500' : 'text-gray-400'
              )} />
              <h3 className="font-semibold text-gray-900 truncate">
                {challenge.title_he}
              </h3>
            </div>

            {/* Song */}
            <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-2">
              <Music className="h-3.5 w-3.5" />
              <span className="truncate">{challenge.song_title}</span>
              {challenge.song_artist && (
                <span className="text-gray-400">• {challenge.song_artist}</span>
              )}
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{timeInfo}</span>
              </div>

              <div className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                <span>{participantsCount} משתתפים</span>
              </div>
            </div>
          </div>

          {/* Right Side */}
          <div className="flex flex-col items-end gap-2">
            {/* Status Badge */}
            <StatusBadge status={challenge.status} />

            {/* My Rank */}
            {hasParticipated && myRank && (
              <div className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                myRank <= 3
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-600'
              )}>
                {getRankEmoji(myRank)} #{myRank}
              </div>
            )}

            {/* Arrow */}
            <ChevronLeft className="h-5 w-5 text-gray-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================
// STATUS BADGE
// =====================================================

function StatusBadge({ status }: { status: ChallengeStatus }) {
  const config = {
    active: { label: 'פעיל', bg: 'bg-green-100', text: 'text-green-700' },
    ended: { label: 'הסתיים', bg: 'bg-gray-100', text: 'text-gray-600' },
    draft: { label: 'טיוטה', bg: 'bg-yellow-100', text: 'text-yellow-700' },
    archived: { label: 'בארכיון', bg: 'bg-gray-100', text: 'text-gray-500' },
  };

  const { label, bg, text } = config[status] || config.draft;

  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', bg, text)}>
      {label}
    </span>
  );
}

// =====================================================
// HELPERS
// =====================================================

function getTimeInfo(challenge: WeeklyChallenge): string {
  const now = new Date();
  const start = new Date(challenge.starts_at);
  const end = new Date(challenge.ends_at);

  if (challenge.status === 'ended') {
    return formatDate(end);
  }

  if (now < start) {
    const days = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return `מתחיל בעוד ${days} ימים`;
  }

  const remaining = end.getTime() - now.getTime();
  if (remaining <= 0) return 'הסתיים';

  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `עוד ${days} ימים`;
  if (hours > 0) return `עוד ${hours} שעות`;

  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  return `עוד ${minutes} דקות`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short',
  });
}

function getRankEmoji(rank: number): string {
  switch (rank) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return '🏅';
  }
}
