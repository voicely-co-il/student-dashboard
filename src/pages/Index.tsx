import Header from '@/components/dashboard/Header';
import BottomNav from '@/components/dashboard/BottomNav';
import VoiceScoreCard from '@/components/dashboard/VoiceScoreCard';
import MetricCard from '@/components/dashboard/MetricCard';
import ActionPlanCard from '@/components/dashboard/ActionPlanCard';
import AdvisorsNoteCard from '@/components/dashboard/AdvisorsNoteCard';
import VoiceComfortCard from '@/components/dashboard/VoiceComfortCard';
import StreakCard from '@/components/dashboard/StreakCard';
import XPLevelCard from '@/components/dashboard/XPLevelCard';
import DailyGoalCard from '@/components/dashboard/DailyGoalCard';
import BadgesCard from '@/components/dashboard/BadgesCard';
import { Wind, Music } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Hooks
import { useStudentStats, calculateXP } from '@/hooks/useStudentStats';
import { useAchievements, useRecentAchievements } from '@/hooks/useAchievements';
import { useDailyGoals, calculateDailyXP } from '@/hooks/useDailyGoals';

const Index = () => {
  const { data: stats, isLoading: statsLoading } = useStudentStats();
  const { data: achievements, isLoading: achievementsLoading } = useAchievements();
  const { mostRecent: recentBadge } = useRecentAchievements();
  const { data: dailyGoals, isLoading: goalsLoading } = useDailyGoals();

  // Calculate XP from stats
  const xpData = stats ? calculateXP(stats) : null;

  // Transform achievements to badge format
  const badges = achievements?.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description ?? '',
    icon: a.icon ?? '🏆',
    rarity: a.rarity as 'common' | 'rare' | 'epic' | 'legendary',
    earned: a.earned,
    earnedAt: a.earnedAt ?? undefined,
    progress: a.progress,
  })) ?? [];

  const recentBadgeFormatted = recentBadge ? {
    id: recentBadge.id,
    name: recentBadge.name,
    description: recentBadge.description ?? '',
    icon: recentBadge.icon ?? '🏆',
    rarity: recentBadge.rarity as 'common' | 'rare' | 'epic' | 'legendary',
    earned: true,
  } : undefined;

  const isLoading = statsLoading || achievementsLoading || goalsLoading;

  return (
    <div className="min-h-screen bg-background pb-24" dir="rtl">
      <Header />

      <main className="p-4 space-y-4">
        {/* Row 1: Hero Cards - Streak + Daily Goal + XP */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {isLoading ? (
            <>
              <Skeleton className="h-[280px] rounded-xl" />
              <Skeleton className="h-[280px] rounded-xl" />
              <Skeleton className="h-[280px] rounded-xl" />
            </>
          ) : (
            <>
              <StreakCard
                currentStreak={stats?.streakDays ?? 0}
                longestStreak={stats?.longestStreak ?? 0}
                hasStreakFreeze={false}
                streakFreezeAvailable={true}
              />
              <DailyGoalCard
                goalMinutes={dailyGoals?.goalMinutes ?? 30}
                completedMinutes={dailyGoals?.completedMinutes ?? 0}
                tasksCompleted={dailyGoals?.tasksCompleted ?? 0}
                totalTasks={dailyGoals?.totalTasks ?? 4}
              />
              <XPLevelCard
                currentXP={xpData?.totalXP ?? 0}
                level={xpData?.level ?? 1}
                levelName={xpData?.levelName ?? 'מתחיל'}
                xpToNextLevel={xpData?.xpToNextLevel ?? 100}
              />
            </>
          )}
        </div>

        {/* Row 2: Voice Score + Advisor Note */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isLoading ? (
            <>
              <Skeleton className="h-[200px] rounded-xl" />
              <Skeleton className="h-[200px] rounded-xl" />
            </>
          ) : (
            <>
              <VoiceScoreCard score={stats?.averageScore ?? 0} />
              <AdvisorsNoteCard />
            </>
          )}
        </div>

        {/* Row 3: Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            <>
              <Skeleton className="h-[180px] rounded-xl" />
              <Skeleton className="h-[180px] rounded-xl" />
              <Skeleton className="h-[180px] rounded-xl" />
              <Skeleton className="h-[180px] rounded-xl" />
            </>
          ) : (
            <>
              <MetricCard
                title="דקות תרגול השבוע"
                value={`${stats?.practiceMinutesWeek ?? 0} דק'`}
                description={`סה"כ ${stats?.practiceMinutesTotal ?? 0} דק'`}
                percentage={Math.min((stats?.practiceMinutesWeek ?? 0) / 120 * 100, 100)}
                color="hsl(var(--voicely-green))"
                icon={Wind}
              />
              <MetricCard
                title="שיעורים השבוע"
                value={`${stats?.lessonsThisWeek ?? 0}`}
                description={`החודש: ${stats?.lessonsThisMonth ?? 0}`}
                percentage={Math.min((stats?.lessonsThisWeek ?? 0) / 3 * 100, 100)}
                color="hsl(var(--voicely-orange))"
                icon={Music}
              />
              <VoiceComfortCard level={Math.min(Math.floor((stats?.averageScore ?? 0) / 25), 4)} />
              <ActionPlanCard />
            </>
          )}
        </div>

        {/* Row 4: Badges */}
        {isLoading ? (
          <Skeleton className="h-[200px] rounded-xl" />
        ) : (
          <BadgesCard
            badges={badges}
            totalBadges={badges.length || 24}
            recentBadge={recentBadgeFormatted}
          />
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Index;
