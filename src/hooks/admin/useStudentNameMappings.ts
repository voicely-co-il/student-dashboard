import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface StudentNameMapping {
  id: string;
  original_name: string;
  resolved_name: string | null;
  crm_match: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'auto_matched';
  transcript_count: number;
  last_seen_at: string | null;
  notes: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MappingHistory {
  id: string;
  mapping_id: string;
  previous_resolved_name: string | null;
  previous_status: string | null;
  changed_by: string | null;
  changed_at: string;
}

export interface MappingStats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  auto_matched: number;
}

// Fetch all mappings
export function useStudentNameMappings() {
  return useQuery({
    queryKey: ['student-name-mappings'],
    queryFn: async (): Promise<StudentNameMapping[]> => {
      const { data, error } = await supabase
        .from('student_name_mappings')
        .select('*')
        .order('transcript_count', { ascending: false });

      if (error) throw error;
      return (data || []) as StudentNameMapping[];
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Fetch mapping stats
export function useMappingStats() {
  const { data: mappings } = useStudentNameMappings();

  const stats: MappingStats = {
    total: mappings?.length || 0,
    approved: mappings?.filter(m => m.status === 'approved').length || 0,
    pending: mappings?.filter(m => m.status === 'pending').length || 0,
    rejected: mappings?.filter(m => m.status === 'rejected').length || 0,
    auto_matched: mappings?.filter(m => m.status === 'auto_matched').length || 0,
  };

  return stats;
}

// Fetch recent history for undo
export function useMappingHistory(limit: number = 10) {
  return useQuery({
    queryKey: ['student-name-mapping-history', limit],
    queryFn: async (): Promise<MappingHistory[]> => {
      const { data, error } = await supabase
        .from('student_name_mapping_history')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as MappingHistory[];
    },
    staleTime: 10 * 1000,
  });
}

// Update a mapping
export function useUpdateMapping() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      resolved_name,
      status,
      notes,
    }: {
      id: string;
      resolved_name?: string | null;
      status?: StudentNameMapping['status'];
      notes?: string | null;
    }) => {
      const updates: Record<string, unknown> = {
        updated_by: user?.id,
      };

      if (resolved_name !== undefined) updates.resolved_name = resolved_name;
      if (status !== undefined) updates.status = status;
      if (notes !== undefined) updates.notes = notes;

      const { error } = await supabase
        .from('student_name_mappings')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-name-mappings'] });
      queryClient.invalidateQueries({ queryKey: ['student-name-mapping-history'] });
    },
    onError: (error) => {
      console.error('Error updating mapping:', error);
      toast.error('שגיאה בעדכון השם');
    },
  });
}

// Approve a mapping (set resolved name and mark as approved)
export function useApproveMapping() {
  const updateMapping = useUpdateMapping();

  return useMutation({
    mutationFn: async ({ id, resolved_name }: { id: string; resolved_name: string }) => {
      await updateMapping.mutateAsync({
        id,
        resolved_name,
        status: 'approved',
      });
    },
    onSuccess: () => {
      toast.success('השם אושר בהצלחה');
    },
  });
}

// Reject a mapping (mark as not a real student)
export function useRejectMapping() {
  const updateMapping = useUpdateMapping();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      await updateMapping.mutateAsync({
        id,
        status: 'rejected',
        notes: notes || 'לא תלמיד אמיתי',
      });
    },
    onSuccess: () => {
      toast.success('השם סומן כלא רלוונטי');
    },
  });
}

// Undo last change
export function useUndoMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (historyId: string) => {
      // Get the history record
      const { data: history, error: historyError } = await supabase
        .from('student_name_mapping_history')
        .select('*')
        .eq('id', historyId)
        .single();

      if (historyError) throw historyError;

      // Restore previous values
      const { error: updateError } = await supabase
        .from('student_name_mappings')
        .update({
          resolved_name: history.previous_resolved_name,
          status: history.previous_status,
        })
        .eq('id', history.mapping_id);

      if (updateError) throw updateError;

      // Delete the history record
      await supabase
        .from('student_name_mapping_history')
        .delete()
        .eq('id', historyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-name-mappings'] });
      queryClient.invalidateQueries({ queryKey: ['student-name-mapping-history'] });
      toast.success('השינוי בוטל');
    },
    onError: (error) => {
      console.error('Error undoing:', error);
      toast.error('שגיאה בביטול השינוי');
    },
  });
}

// Bulk update mappings (for auto-matching)
export function useBulkUpdateMappings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      updates: Array<{
        id: string;
        resolved_name: string;
        status: StudentNameMapping['status'];
        crm_match?: string;
      }>
    ) => {
      for (const update of updates) {
        const { error } = await supabase
          .from('student_name_mappings')
          .update({
            resolved_name: update.resolved_name,
            status: update.status,
            crm_match: update.crm_match,
            updated_by: user?.id,
          })
          .eq('id', update.id);

        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student-name-mappings'] });
      toast.success(`${variables.length} שמות עודכנו`);
    },
    onError: (error) => {
      console.error('Error bulk updating:', error);
      toast.error('שגיאה בעדכון מרובה');
    },
  });
}

// Get resolved name map for use in other components
export function useResolvedNameMap() {
  const { data: mappings } = useStudentNameMappings();

  const nameMap = new Map<string, string>();

  mappings
    ?.filter(m => m.status === 'approved' || m.status === 'auto_matched')
    .forEach(m => {
      if (m.resolved_name) {
        nameMap.set(m.original_name, m.resolved_name);
      }
    });

  return nameMap;
}
