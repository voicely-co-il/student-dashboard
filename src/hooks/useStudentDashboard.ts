import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Types for dashboard data
export interface StudentStats {
  id: string;
  student_id: string;
  current_xp: number;
  level: number;
  level_name: string;
  xp_to_next_level: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  streak_freeze_available: boolean;
  voice_score: number;
  breath_duration_seconds: number;
  breath_goal_seconds: number;
  pitch_accuracy_percent: number;
  voice_comfort_level: number;
}

export interface DailyGoal {
  id: string;
  student_id: string;
  date: string;
  goal_minutes: number;
  completed_minutes: number;
  total_tasks: number;
  tasks_completed: number;
  is_completed: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  name_he: string;
  description: string;
  description_he: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  criteria_type: string;
  criteria_value: number | null;
  xp_reward: number;
}

export interface StudentAchievement {
  id: string;
  student_id: string;
  achievement_id: string;
  earned_at: string | null;
  progress: number;
  is_earned: boolean;
  achievement?: Achievement;
}

export interface AdvisorNote {
  id: string;
  student_id: string;
  note: string;
  created_at: string;
}

export interface ActionPlanItem {
  id: string;
  student_id: string;
  title: string;
  description: string | null;
  type: string;
  is_completed: boolean;
  priority: number;
  due_date: string | null;
}

export interface DashboardData {
  stats: StudentStats | null;
  dailyGoal: DailyGoal | null;
  achievements: (StudentAchievement & { achievement: Achievement })[];
  advisorNote: AdvisorNote | null;
  actionPlan: ActionPlanItem[];
  profile: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

// Fetch student ID from user ID
async function getStudentId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return data.id;
}

// Fetch all dashboard data
async function fetchDashboardData(userId: string): Promise<DashboardData> {
  const studentId = await getStudentId(userId);

  if (!studentId) {
    return {
      stats: null,
      dailyGoal: null,
      achievements: [],
      advisorNote: null,
      actionPlan: [],
      profile: null,
    };
  }

  // Fetch all data in parallel
  const [
    statsResult,
    dailyGoalResult,
    achievementsResult,
    advisorNoteResult,
    actionPlanResult,
    profileResult,
  ] = await Promise.all([
    // Student stats
    supabase
      .from('student_stats')
      .select('*')
      .eq('student_id', studentId)
      .single(),

    // Today's daily goal
    supabase
      .from('daily_goals')
      .select('*')
      .eq('student_id', studentId)
      .eq('date', new Date().toISOString().split('T')[0])
      .single(),

    // Achievements with progress
    supabase
      .from('student_achievements')
      .select(`
        *,
        achievement:achievements(*)
      `)
      .eq('student_id', studentId)
      .order('earned_at', { ascending: false, nullsFirst: false }),

    // Latest advisor note
    supabase
      .from('advisor_notes')
      .select('*')
      .eq('student_id', studentId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),

    // Action plan items
    supabase
      .from('action_plan_items')
      .select('*')
      .eq('student_id', studentId)
      .eq('is_completed', false)
      .order('priority', { ascending: false })
      .limit(5),

    // Profile
    supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('user_id', userId)
      .single(),
  ]);

  return {
    stats: statsResult.data as StudentStats | null,
    dailyGoal: dailyGoalResult.data as DailyGoal | null,
    achievements: (achievementsResult.data || []) as (StudentAchievement & { achievement: Achievement })[],
    advisorNote: advisorNoteResult.data as AdvisorNote | null,
    actionPlan: (actionPlanResult.data || []) as ActionPlanItem[],
    profile: profileResult.data,
  };
}

// Main hook
export function useStudentDashboard() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['student-dashboard', user?.id],
    queryFn: () => fetchDashboardData(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
}

// Hook for updating daily goal progress
export function useUpdateDailyProgress() {
  const { user } = useAuth();

  const updateProgress = async (minutes: number, tasksCompleted?: number) => {
    if (!user?.id) return;

    const studentId = await getStudentId(user.id);
    if (!studentId) return;

    const today = new Date().toISOString().split('T')[0];

    // Upsert daily goal
    const { error } = await supabase
      .from('daily_goals')
      .upsert({
        student_id: studentId,
        date: today,
        completed_minutes: minutes,
        ...(tasksCompleted !== undefined && { tasks_completed: tasksCompleted }),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'student_id,date',
      });

    if (error) {
      console.error('Error updating daily progress:', error);
      throw error;
    }
  };

  return { updateProgress };
}

// Hook for marking action plan item as completed
export function useCompleteActionItem() {
  const completeItem = async (itemId: string) => {
    const { error } = await supabase
      .from('action_plan_items')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId);

    if (error) {
      console.error('Error completing action item:', error);
      throw error;
    }
  };

  return { completeItem };
}

// Default/fallback data for when no data exists
export const defaultDashboardData: DashboardData = {
  stats: {
    id: '',
    student_id: '',
    current_xp: 0,
    level: 1,
    level_name: 'מתחיל',
    xp_to_next_level: 100,
    current_streak: 0,
    longest_streak: 0,
    last_activity_date: null,
    streak_freeze_available: false,
    voice_score: 0,
    breath_duration_seconds: 0,
    breath_goal_seconds: 20,
    pitch_accuracy_percent: 0,
    voice_comfort_level: 1,
  },
  dailyGoal: {
    id: '',
    student_id: '',
    date: new Date().toISOString().split('T')[0],
    goal_minutes: 30,
    completed_minutes: 0,
    total_tasks: 0,
    tasks_completed: 0,
    is_completed: false,
  },
  achievements: [],
  advisorNote: null,
  actionPlan: [],
  profile: null,
};
