import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Award, Lock, Sparkles } from 'lucide-react';

type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: BadgeRarity;
  earned: boolean;
  earnedAt?: string;
  progress?: number; // 0-100 for locked badges
}

interface BadgesCardProps {
  badges: Badge[];
  totalBadges: number;
  recentBadge?: Badge;
}

const RARITY_COLORS: Record<BadgeRarity, { bg: string; border: string; text: string; glow: string }> = {
  common: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    border: 'border-gray-300 dark:border-gray-600',
    text: 'text-gray-600 dark:text-gray-400',
    glow: '',
  },
  rare: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    border: 'border-blue-400 dark:border-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
    glow: 'shadow-blue-200 dark:shadow-blue-900/50',
  },
  epic: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    border: 'border-purple-400 dark:border-purple-500',
    text: 'text-purple-600 dark:text-purple-400',
    glow: 'shadow-purple-200 dark:shadow-purple-900/50',
  },
  legendary: {
    bg: 'bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30',
    border: 'border-yellow-400 dark:border-yellow-500',
    text: 'text-yellow-600 dark:text-yellow-400',
    glow: 'shadow-yellow-200 dark:shadow-yellow-900/50 shadow-lg',
  },
};

const RARITY_LABELS: Record<BadgeRarity, string> = {
  common: 'רגיל',
  rare: 'נדיר',
  epic: 'אפי',
  legendary: 'אגדי',
};

const BadgesCard: React.FC<BadgesCardProps> = ({
  badges,
  totalBadges,
  recentBadge,
}) => {
  const earnedCount = badges.filter(b => b.earned).length;

  return (
    <Card className="playful-shadow overflow-hidden col-span-1 md:col-span-2">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-foreground">תגי הישג</h3>
          </div>
          <span className="text-sm text-muted-foreground">
            {earnedCount}/{totalBadges} תגים
          </span>
        </div>

        {/* Recent Badge Alert */}
        {recentBadge && (
          <div className={`mb-4 p-3 rounded-lg ${RARITY_COLORS[recentBadge.rarity].bg} border ${RARITY_COLORS[recentBadge.rarity].border} flex items-center gap-3`}>
            <Sparkles className={`w-5 h-5 ${RARITY_COLORS[recentBadge.rarity].text} animate-pulse`} />
            <div>
              <div className="text-sm font-medium text-foreground">תג חדש נפתח!</div>
              <div className="text-xs text-muted-foreground">{recentBadge.name}</div>
            </div>
          </div>
        )}

        {/* Badges Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
          {badges.slice(0, 12).map((badge) => (
            <BadgeItem key={badge.id} badge={badge} />
          ))}
        </div>

        {/* View all link */}
        {totalBadges > 12 && (
          <button className="w-full mt-4 text-sm text-voicely-blue hover:underline">
            הצג את כל {totalBadges} התגים →
          </button>
        )}
      </CardContent>
    </Card>
  );
};

interface BadgeItemProps {
  badge: Badge;
}

const BadgeItem: React.FC<BadgeItemProps> = ({ badge }) => {
  const colors = RARITY_COLORS[badge.rarity];

  return (
    <div className="group relative">
      <div
        className={`
          w-full aspect-square rounded-xl border-2 flex items-center justify-center
          transition-all duration-300 cursor-pointer
          ${badge.earned
            ? `${colors.bg} ${colors.border} ${colors.glow} hover:scale-110`
            : 'bg-muted/30 border-muted-foreground/20 opacity-50'
          }
        `}
      >
        {badge.earned ? (
          <span className="text-2xl">{badge.icon}</span>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
            <span className="text-2xl opacity-30 blur-[2px]">{badge.icon}</span>
            <Lock className="absolute w-4 h-4 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Progress bar for locked badges */}
      {!badge.earned && badge.progress !== undefined && badge.progress > 0 && (
        <div className="absolute -bottom-1 left-1 right-1 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-voicely-blue rounded-full"
            style={{ width: `${badge.progress}%` }}
          />
        </div>
      )}

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover border border-border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-32 text-center">
        <div className="text-xs font-medium text-foreground">{badge.name}</div>
        <div className={`text-[10px] ${colors.text}`}>{RARITY_LABELS[badge.rarity]}</div>
        {!badge.earned && badge.progress !== undefined && (
          <div className="text-[10px] text-muted-foreground mt-1">{badge.progress}% הושלם</div>
        )}
      </div>
    </div>
  );
};

export default BadgesCard;
