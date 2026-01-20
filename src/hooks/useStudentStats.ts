import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface StudentStats {
  streakDays: number;
  longestStreak: number;
  practiceMinutesWeek: number;
  practiceMinutesTotal: number;
  totalRecordings: number;
  lessonsThisWeek: number;
  lessonsThisMonth: number;
  averageScore: number;
  lastPracticeDate: string | null;
  strongAreas: string[];
  improvementAreas: string[];
}

export function useStudentStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['studentStats', user?.id],
    queryFn: async (): Promise<StudentStats> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // If no stats exist yet, return defaults
        if (error.code === 'PGRST116') {
          return {
            streakDays: 0,
            longestStreak: 0,
            practiceMinutesWeek: 0,
            practiceMinutesTotal: 0,
            totalRecordings: 0,
            lessonsThisWeek: 0,
            lessonsThisMonth: 0,
            averageScore: 0,
            lastPracticeDate: null,
            strongAreas: [],
            improvementAreas: [],
          };
        }
        throw error;
      }

      return {
        streakDays: data.streak_days ?? 0,
        longestStreak: data.longest_streak ?? 0,
        practiceMinutesWeek: data.practice_minutes_week ?? 0,
        practiceMinutesTotal: data.practice_minutes_total ?? 0,
        totalRecordings: data.total_recordings ?? 0,
        lessonsThisWeek: data.lessons_this_week ?? 0,
        lessonsThisMonth: data.lessons_this_month ?? 0,
        averageScore: data.average_score ?? 0,
        lastPracticeDate: data.last_practice_date,
        strongAreas: data.strong_areas ?? [],
        improvementAreas: data.improvement_areas ?? [],
      };
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// XP calculation based on user activity
export function calculateXP(stats: StudentStats): {
  totalXP: number;
  level: number;
  levelName: string;
  xpToNextLevel: number;
} {
  // XP breakdown:
  // - 10 XP per practice session (estimated from minutes / 10)
  // - 50 XP per lesson
  // - 20 XP per recording
  // - 15 XP per AI feedback (estimated from recordings)
  // - Streak bonus: streak_days * 5

  const practiceXP = Math.floor(stats.practiceMinutesTotal / 10) * 10;
  const lessonXP = stats.lessonsThisMonth * 50;
  const recordingXP = stats.totalRecordings * 20;
  const streakBonus = stats.streakDays * 5;

  const totalXP = practiceXP + lessonXP + recordingXP + streakBonus;

  // Level thresholds
  const levels = [
    { level: 1, name: 'מתחיל', minXP: 0 },
    { level: 2, name: 'חובב', minXP: 100 },
    { level: 3, name: 'מתקדם', minXP: 300 },
    { level: 4, name: 'מיומן', minXP: 600 },
    { level: 5, name: 'מומחה', minXP: 1000 },
    { level: 6, name: 'אמן', minXP: 1500 },
    { level: 7, name: 'וירטואוז', minXP: 2500 },
  ];

  let currentLevel = levels[0];
  let nextLevel = levels[1];

  for (let i = levels.length - 1; i >= 0; i--) {
    if (totalXP >= levels[i].minXP) {
      currentLevel = levels[i];
      nextLevel = levels[i + 1] || levels[i];
      break;
    }
  }

  const xpToNextLevel = nextLevel.minXP - totalXP;

  return {
    totalXP,
    level: currentLevel.level,
    levelName: currentLevel.name,
    xpToNextLevel: Math.max(0, xpToNextLevel),
  };
}
