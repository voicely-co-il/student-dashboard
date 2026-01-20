import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';

type BadgeRarity = Database['public']['Enums']['badge_rarity'];

export interface Achievement {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  rarity: BadgeRarity;
  points: number | null;
  requirements: Record<string, unknown>;
  earned: boolean;
  earnedAt: string | null;
  progress?: number; // 0-100 for unearned badges
}

export function useAchievements() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['achievements', user?.id],
    queryFn: async (): Promise<Achievement[]> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Get all achievements
      const { data: allAchievements, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true)
        .order('badge_rarity', { ascending: false });

      if (achievementsError) throw achievementsError;

      // Get user's earned achievements
      const { data: userAchievements, error: userError } = await supabase
        .from('user_achievements')
        .select('achievement_id, earned_at, progress_data')
        .eq('user_id', user.id);

      if (userError) throw userError;

      // Map of earned achievements
      const earnedMap = new Map(
        userAchievements?.map((ua) => [
          ua.achievement_id,
          {
            earnedAt: ua.earned_at,
            progress: (ua.progress_data as { progress?: number })?.progress ?? 0,
          },
        ])
      );

      // Combine all achievements with user data
      return (allAchievements ?? []).map((achievement) => {
        const earned = earnedMap.get(achievement.id);
        return {
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          rarity: achievement.badge_rarity ?? 'common',
          points: achievement.points,
          requirements: achievement.requirements as Record<string, unknown>,
          earned: !!earned?.earnedAt,
          earnedAt: earned?.earnedAt ?? null,
          progress: earned?.progress ?? 0,
        };
      });
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Get recent achievements (earned in last 7 days)
export function useRecentAchievements() {
  const { data: achievements, ...rest } = useAchievements();

  const recentAchievements = achievements?.filter((a) => {
    if (!a.earnedAt) return false;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(a.earnedAt) > sevenDaysAgo;
  });

  return {
    data: recentAchievements,
    mostRecent: recentAchievements?.[0],
    ...rest,
  };
}

// Count achievements by rarity
export function countByRarity(achievements: Achievement[]) {
  return achievements.reduce(
    (acc, a) => {
      if (a.earned) {
        acc[a.rarity] = (acc[a.rarity] || 0) + 1;
      }
      return acc;
    },
    {} as Record<BadgeRarity, number>
  );
}
