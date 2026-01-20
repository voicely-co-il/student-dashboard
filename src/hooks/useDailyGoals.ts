import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface DailyTask {
  id: string;
  label: string;
  completed: boolean;
  xp: number;
  type: 'practice' | 'lesson' | 'recording' | 'exercise';
}

export interface DailyGoals {
  goalMinutes: number;
  completedMinutes: number;
  tasks: DailyTask[];
  tasksCompleted: number;
  totalTasks: number;
}

export function useDailyGoals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dailyGoals', user?.id],
    queryFn: async (): Promise<DailyGoals> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const today = new Date().toISOString().split('T')[0];

      // Get today's practice sessions
      const { data: todayProgress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .gte('completed_at', today);

      // Get today's lessons
      const { data: todayLessons } = await supabase
        .from('lessons')
        .select('*')
        .eq('student_id', user.id)
        .eq('status', 'completed')
        .gte('scheduled_at', today);

      // Get today's recordings
      const { data: todayRecordings } = await supabase
        .from('user_recordings')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', today);

      // Calculate completed minutes (estimate from activities)
      const practiceMinutes = (todayProgress?.length ?? 0) * 5; // Assume 5 min per exercise
      const lessonMinutes = (todayLessons?.length ?? 0) * 45; // 45 min lessons
      const recordingMinutes = (todayRecordings?.length ?? 0) * 3; // ~3 min per recording

      const completedMinutes = practiceMinutes + lessonMinutes + recordingMinutes;

      // Build task list
      const tasks: DailyTask[] = [
        {
          id: 'breathing',
          label: 'תרגול נשימות',
          completed: (todayProgress?.length ?? 0) > 0,
          xp: 10,
          type: 'exercise',
        },
        {
          id: 'lesson',
          label: 'שיעור עם ענבל',
          completed: (todayLessons?.length ?? 0) > 0,
          xp: 50,
          type: 'lesson',
        },
        {
          id: 'recording',
          label: 'הקלטה יומית',
          completed: (todayRecordings?.length ?? 0) > 0,
          xp: 20,
          type: 'recording',
        },
        {
          id: 'diction',
          label: 'תרגיל דיקציה',
          completed: (todayProgress?.filter((p) =>
            (p.exercise_id as string)?.includes('diction')
          )?.length ?? 0) > 0,
          xp: 15,
          type: 'exercise',
        },
      ];

      const tasksCompleted = tasks.filter((t) => t.completed).length;

      return {
        goalMinutes: 30, // Default daily goal
        completedMinutes,
        tasks,
        tasksCompleted,
        totalTasks: tasks.length,
      };
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60, // 1 minute - refresh frequently for daily goals
  });
}

// Calculate XP earned today
export function calculateDailyXP(goals: DailyGoals): number {
  return goals.tasks
    .filter((t) => t.completed)
    .reduce((sum, t) => sum + t.xp, 0);
}
