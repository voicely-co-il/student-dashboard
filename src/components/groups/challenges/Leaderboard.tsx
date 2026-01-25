import { Play, MessageCircle, Heart, Crown, Medal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LeaderboardEntry, LeaderboardMode } from '@/types/groups';

// =====================================================
// LEADERBOARD
// Challenge rankings with entries
// =====================================================

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  mode: LeaderboardMode;
  currentUserId?: string;
  onPlayEntry?: (entryId: string) => void;
  onCommentEntry?: (entryId: string) => void;
  onLikeEntry?: (entryId: string) => void;
  className?: string;
}

export default function Leaderboard({
  entries,
  mode,
  currentUserId,
  onPlayEntry,
  onCommentEntry,
  onLikeEntry,
  className,
}: LeaderboardProps) {
  if (entries.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <span className="text-4xl">🏆</span>
        <p className="text-gray-600 mt-2">עדיין אין משתתפים</p>
        <p className="text-sm text-gray-400">היה הראשון להשתתף!</p>
      </div>
    );
  }

  // For private mode, only show current user
  const visibleEntries = mode === 'private'
    ? entries.filter(e => e.isCurrentUser)
    : entries;

  return (
    <div className={cn('space-y-2', className)}>
      {visibleEntries.map((entry) => (
        <LeaderboardRow
          key={entry.entry.id}
          entry={entry}
          mode={mode}
          onPlay={() => onPlayEntry?.(entry.entry.id)}
          onComment={() => onCommentEntry?.(entry.entry.id)}
          onLike={() => onLikeEntry?.(entry.entry.id)}
        />
      ))}

      {/* Private mode message */}
      {mode === 'private' && (
        <p className="text-center text-sm text-gray-500 pt-4">
          התוצאות פרטיות - רק את/ה רואה את הציון שלך
        </p>
      )}

      {/* Semi-private mode message */}
      {mode === 'semi' && entries.length > 3 && (
        <p className="text-center text-sm text-gray-500 pt-2">
          מוצגים 3 הראשונים + המיקום שלך
        </p>
      )}
    </div>
  );
}

// =====================================================
// LEADERBOARD ROW
// =====================================================

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  mode: LeaderboardMode;
  onPlay: () => void;
  onComment: () => void;
  onLike: () => void;
}

function LeaderboardRow({
  entry,
  mode,
  onPlay,
  onComment,
  onLike,
}: LeaderboardRowProps) {
  const { rank, student, entry: challengeEntry, isCurrentUser } = entry;
  const isTopThree = rank <= 3;

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl transition-all',
      isCurrentUser && 'bg-purple-50 border border-purple-100',
      !isCurrentUser && 'bg-gray-50 hover:bg-gray-100'
    )}>
      {/* Rank */}
      <div className={cn(
        'flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0',
        rank === 1 && 'bg-yellow-100',
        rank === 2 && 'bg-gray-100',
        rank === 3 && 'bg-orange-100',
        rank > 3 && 'bg-white border border-gray-200'
      )}>
        {isTopThree ? (
          <span className="text-xl">{getRankEmoji(rank)}</span>
        ) : (
          <span className="font-bold text-gray-600">{rank}</span>
        )}
      </div>

      {/* Student Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">{student.avatar_emoji}</span>
          <span className={cn(
            'font-medium truncate',
            isCurrentUser ? 'text-purple-700' : 'text-gray-900'
          )}>
            {student.student_name}
            {isCurrentUser && <span className="text-purple-500"> (את/ה)</span>}
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          {challengeEntry.likes_count > 0 && (
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3 text-red-400" />
              {challengeEntry.likes_count}
            </span>
          )}
          {challengeEntry.comments_count > 0 && (
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              {challengeEntry.comments_count}
            </span>
          )}
        </div>
      </div>

      {/* Score */}
      <div className="text-left">
        <span className={cn(
          'text-xl font-bold',
          isTopThree ? 'text-purple-600' : 'text-gray-700'
        )}>
          {challengeEntry.final_score || '-'}%
        </span>
      </div>

      {/* Actions */}
      {mode === 'full' && challengeEntry.is_shared && (
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={(e) => { e.stopPropagation(); onPlay(); }}
          >
            <Play className="h-4 w-4" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={(e) => { e.stopPropagation(); onComment(); }}
          >
            <MessageCircle className="h-4 w-4" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={(e) => { e.stopPropagation(); onLike(); }}
          >
            <Heart className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// =====================================================
// COMPACT LEADERBOARD (for dashboard)
// =====================================================

interface CompactLeaderboardProps {
  entries: LeaderboardEntry[];
  maxEntries?: number;
  className?: string;
}

export function CompactLeaderboard({
  entries,
  maxEntries = 3,
  className,
}: CompactLeaderboardProps) {
  const topEntries = entries.slice(0, maxEntries);

  return (
    <div className={cn('space-y-2', className)}>
      {topEntries.map((entry) => (
        <div
          key={entry.entry.id}
          className={cn(
            'flex items-center gap-2 p-2 rounded-lg',
            entry.isCurrentUser ? 'bg-purple-50' : 'bg-gray-50'
          )}
        >
          <span className="text-lg">{getRankEmoji(entry.rank)}</span>
          <span className="text-base">{entry.student.avatar_emoji}</span>
          <span className={cn(
            'flex-1 font-medium truncate text-sm',
            entry.isCurrentUser && 'text-purple-700'
          )}>
            {entry.student.student_name}
          </span>
          <span className="font-bold text-gray-700">
            {entry.entry.final_score}%
          </span>
        </div>
      ))}
    </div>
  );
}

// =====================================================
// HELPERS
// =====================================================

function getRankEmoji(rank: number): string {
  switch (rank) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return '🏅';
  }
}
