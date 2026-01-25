import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  DailyPracticePlan,
  PracticeExercise,
  DailyPlanWithExercises,
  ExerciseWithProgress,
  ExerciseRecording,
  PlannedExercise,
} from '@/types/groups';
import { useGroupStudent } from './useGroupStudent';

// =====================================================
// HOOK: useDailyPlan
// Get today's practice plan with exercises
// =====================================================

export function useDailyPlan() {
  const { student } = useGroupStudent();
  const queryClient = useQueryClient();

  const today = new Date().toISOString().split('T')[0];

  const {
    data: planData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['daily-plan', student?.id, today],
    queryFn: async () => {
      if (!student?.id) return null;

      // Get or create today's plan
      let { data: plan, error: planError } = await supabase
        .from('daily_practice_plans')
        .select('*')
        .eq('student_id', student.id)
        .eq('plan_date', today)
        .single();

      if (planError && planError.code === 'PGRST116') {
        // No plan for today - generate one
        plan = await generateDailyPlan(student.id, student.age_group, today);
      } else if (planError) {
        throw planError;
      }

      if (!plan) return null;

      // Get exercise details
      const exerciseIds = (plan.exercises as PlannedExercise[]).map(e => e.exercise_id);

      const { data: exercises, error: exError } = await supabase
        .from('practice_exercises')
        .select('*')
        .in('id', exerciseIds);

      if (exError) throw exError;

      // Get today's recordings for completion status
      const { data: recordings } = await supabase
        .from('exercise_recordings')
        .select('*')
        .eq('student_id', student.id)
        .eq('daily_plan_id', plan.id);

      // Build exercises with progress
      const exerciseMap = new Map(exercises?.map(e => [e.id, e]));
      const recordingsMap = new Map<string, ExerciseRecording>();

      recordings?.forEach(r => {
        const existing = recordingsMap.get(r.exercise_id);
        if (!existing || (r.overall_score || 0) > (existing.overall_score || 0)) {
          recordingsMap.set(r.exercise_id, r as ExerciseRecording);
        }
      });

      const exerciseDetails: ExerciseWithProgress[] = (plan.exercises as PlannedExercise[])
        .sort((a, b) => a.order - b.order)
        .map(pe => {
          const exercise = exerciseMap.get(pe.exercise_id) as PracticeExercise;
          const recording = recordingsMap.get(pe.exercise_id);
          return {
            ...exercise,
            isCompleted: (plan.completed_exercises as string[]).includes(pe.exercise_id),
            bestScore: recording?.overall_score,
            lastAttempt: recording,
          };
        })
        .filter(e => e.id); // Remove any missing exercises

      return {
        ...plan,
        exerciseDetails,
      } as DailyPlanWithExercises;
    },
    enabled: !!student?.id,
    staleTime: 60 * 1000, // 1 minute
  });

  // Start practice session
  const startPracticeMutation = useMutation({
    mutationFn: async () => {
      if (!planData?.id) throw new Error('No plan found');

      const { data, error } = await supabase
        .from('daily_practice_plans')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', planData.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-plan', student?.id, today] });
    },
  });

  // Complete an exercise
  const completeExerciseMutation = useMutation({
    mutationFn: async ({
      exerciseId,
      recording,
    }: {
      exerciseId: string;
      recording: ExerciseRecording;
    }) => {
      if (!planData?.id || !student?.id) throw new Error('No plan or student found');

      const newCompleted = [...(planData.completed_exercises || [])];
      if (!newCompleted.includes(exerciseId)) {
        newCompleted.push(exerciseId);
      }

      const isAllCompleted = newCompleted.length >= planData.exercises_count;

      const { data, error } = await supabase
        .from('daily_practice_plans')
        .update({
          completed_exercises: newCompleted,
          completed_count: newCompleted.length,
          actual_duration_minutes: (planData.actual_duration_minutes || 0) +
            Math.ceil(recording.duration_seconds / 60),
          xp_earned: (planData.xp_earned || 0) + recording.xp_earned,
          status: isAllCompleted ? 'completed' : 'in_progress',
          completed_at: isAllCompleted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', planData.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-plan', student?.id, today] });
      queryClient.invalidateQueries({ queryKey: ['group-student', student?.user_id] });
    },
  });

  // Calculate progress
  const progress = planData
    ? {
        completed: planData.completed_count,
        total: planData.exercises_count,
        percentage: planData.exercises_count > 0
          ? Math.round((planData.completed_count / planData.exercises_count) * 100)
          : 0,
      }
    : { completed: 0, total: 0, percentage: 0 };

  // Get next uncompleted exercise
  const nextExercise = planData?.exerciseDetails.find(e => !e.isCompleted);

  return {
    plan: planData,
    dailyPlanId: planData?.id,
    exercises: planData?.exerciseDetails || [],
    isLoading,
    error,
    refetch,
    progress,
    nextExercise,
    startPractice: startPracticeMutation.mutateAsync,
    completeExercise: completeExerciseMutation.mutateAsync,
    isStarting: startPracticeMutation.isPending,
    isCompleting: completeExerciseMutation.isPending,
    updateProgress: (exerciseId: string, recording: ExerciseRecording) =>
      completeExerciseMutation.mutateAsync({ exerciseId, recording }),
  };
}

// =====================================================
// Helper: Generate daily plan
// =====================================================

async function generateDailyPlan(
  studentId: string,
  ageGroup: string,
  date: string
): Promise<DailyPracticePlan> {
  // Get available exercises for this age group
  const { data: exercises, error: exError } = await supabase
    .from('practice_exercises')
    .select('*')
    .contains('age_groups', [ageGroup])
    .eq('is_active', true);

  if (exError) throw exError;

  // Select exercises: 1 warmup, 1 technique, 1 song (or breathing/rhythm)
  const warmups = exercises?.filter(e => e.category === 'warmup') || [];
  const techniques = exercises?.filter(e => e.category === 'technique') || [];
  const songs = exercises?.filter(e => e.category === 'song') || [];
  const breathing = exercises?.filter(e => e.category === 'breathing') || [];

  // Random selection
  const selectedExercises: PlannedExercise[] = [];
  let order = 1;

  // Add 1 warmup
  if (warmups.length > 0) {
    const warmup = warmups[Math.floor(Math.random() * warmups.length)];
    selectedExercises.push({ exercise_id: warmup.id, order: order++, type: 'warmup' });
  }

  // Add 1-2 technique/breathing
  const techPool = [...techniques, ...breathing];
  if (techPool.length > 0) {
    const tech1 = techPool[Math.floor(Math.random() * techPool.length)];
    selectedExercises.push({ exercise_id: tech1.id, order: order++, type: tech1.category });
  }

  // Add 1 song if available
  if (songs.length > 0) {
    const song = songs[Math.floor(Math.random() * songs.length)];
    selectedExercises.push({ exercise_id: song.id, order: order++, type: 'song' });
  }

  // Calculate estimated duration
  const exerciseDetails = exercises?.filter(e =>
    selectedExercises.some(se => se.exercise_id === e.id)
  ) || [];
  const estimatedDuration = exerciseDetails.reduce(
    (sum, e) => sum + (e.duration_minutes || 5),
    0
  );

  // Create the plan
  const { data: plan, error: planError } = await supabase
    .from('daily_practice_plans')
    .insert({
      student_id: studentId,
      plan_date: date,
      exercises: selectedExercises,
      exercises_count: selectedExercises.length,
      estimated_duration_minutes: estimatedDuration,
      status: 'pending',
    })
    .select()
    .single();

  if (planError) throw planError;
  return plan as DailyPracticePlan;
}

// =====================================================
// HOOK: usePlanHistory
// Get past practice plans for analytics
// =====================================================

export function usePlanHistory(days: number = 7) {
  const { student } = useGroupStudent();

  return useQuery({
    queryKey: ['plan-history', student?.id, days],
    queryFn: async () => {
      if (!student?.id) return [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('daily_practice_plans')
        .select('*')
        .eq('student_id', student.id)
        .gte('plan_date', startDate.toISOString().split('T')[0])
        .order('plan_date', { ascending: false });

      if (error) throw error;
      return data as DailyPracticePlan[];
    },
    enabled: !!student?.id,
  });
}

// =====================================================
// HOOK: useExercises
// Get all available exercises
// =====================================================

export function useExercises(category?: string) {
  const { student } = useGroupStudent();

  return useQuery({
    queryKey: ['exercises', student?.age_group, category],
    queryFn: async () => {
      let query = supabase
        .from('practice_exercises')
        .select('*')
        .eq('is_active', true);

      if (student?.age_group) {
        query = query.contains('age_groups', [student.age_group]);
      }

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query.order('category').order('difficulty');

      if (error) throw error;
      return data as PracticeExercise[];
    },
    enabled: true,
  });
}

// =====================================================
// HOOK: useExerciseById
// Get a single exercise by ID
// =====================================================

export function useExerciseById(exerciseId: string | undefined) {
  return useQuery({
    queryKey: ['exercise', exerciseId],
    queryFn: async () => {
      if (!exerciseId) return null;

      const { data, error } = await supabase
        .from('practice_exercises')
        .select('*')
        .eq('id', exerciseId)
        .single();

      if (error) throw error;
      return data as PracticeExercise;
    },
    enabled: !!exerciseId,
  });
}

export default useDailyPlan;
