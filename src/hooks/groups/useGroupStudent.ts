import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GroupStudent } from '@/types/groups';
import { useAuth } from '@/hooks/useAuth';

// =====================================================
// HOOK: useGroupStudent
// Get and manage the current user's group student profile
// =====================================================

export function useGroupStudent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: student,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['group-student', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('group_students')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found - user needs to register
          return null;
        }
        throw error;
      }

      return data as GroupStudent;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<GroupStudent>) => {
      if (!student?.id) throw new Error('No student profile found');

      const { data, error } = await supabase
        .from('group_students')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', student.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['group-student', user?.id], data);
    },
  });

  const updateStreak = async () => {
    if (!student?.id) return;

    // This is handled by database trigger, but we can optimistically update
    await queryClient.invalidateQueries({ queryKey: ['group-student', user?.id] });
  };

  return {
    student,
    isLoading,
    error,
    refetch,
    updateStudent: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateStreak,
    isRegistered: !!student,
    needsOnboarding: student && !student.onboarding_completed,
  };
}

// =====================================================
// HOOK: useGroupStudentById
// Get a specific student by ID (for teachers)
// =====================================================

export function useGroupStudentById(studentId: string | undefined) {
  return useQuery({
    queryKey: ['group-student', studentId],
    queryFn: async () => {
      if (!studentId) return null;

      const { data, error } = await supabase
        .from('group_students')
        .select('*')
        .eq('id', studentId)
        .single();

      if (error) throw error;
      return data as GroupStudent;
    },
    enabled: !!studentId,
  });
}

// =====================================================
// HOOK: useGroupStudents
// Get all students in a group (for teachers)
// =====================================================

export function useGroupStudents(groupId: string | undefined) {
  return useQuery({
    queryKey: ['group-students', groupId],
    queryFn: async () => {
      if (!groupId) return [];

      const { data, error } = await supabase
        .from('group_students')
        .select('*')
        .eq('group_id', groupId)
        .eq('is_active', true)
        .order('student_name');

      if (error) throw error;
      return data as GroupStudent[];
    },
    enabled: !!groupId,
  });
}

// =====================================================
// HOOK: useRegisterGroupStudent
// Register a new group student
// =====================================================

export function useRegisterGroupStudent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      parent_name: string;
      parent_email: string;
      parent_phone?: string;
      student_name: string;
      age: number;
      avatar_emoji?: string;
      group_id?: string;
      consent_audio_recording: boolean;
      consent_data_processing: boolean;
      consent_peer_sharing: boolean;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data: student, error } = await supabase
        .from('group_students')
        .insert({
          user_id: user.id,
          parent_name: data.parent_name,
          parent_email: data.parent_email,
          parent_phone: data.parent_phone,
          student_name: data.student_name,
          age: data.age,
          avatar_emoji: data.avatar_emoji || '🎤',
          group_id: data.group_id,
          consent_audio_recording: data.consent_audio_recording,
          consent_data_processing: data.consent_data_processing,
          consent_peer_sharing: data.consent_peer_sharing,
          consent_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return student as GroupStudent;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['group-student', user?.id], data);
    },
  });
}

export default useGroupStudent;
