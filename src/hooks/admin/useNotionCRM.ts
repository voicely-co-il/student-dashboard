import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StudentBreakdown {
  oneOnOne: {
    newStudents: number;   // Less than 3 months
    veterans: number;      // 3+ months
    alternating: number;
    total: number;
  };
  groups: {
    thursday: number;
    sunday: number;
    newStudents: number;   // Less than 3 months
    veterans: number;      // 3+ months
    total: number;
  };
  veteransMarked: number;  // Explicitly marked with "תלמידים ותיקים" status
}

export interface NotionCRMStats {
  totalEntries: number;
  activeStudents: {
    total: number;
    breakdown: StudentBreakdown;
  };
  pausedStudents: number;
  completedStudents: number;
  leads: number;
  notRelevant: number;
  statusBreakdown: { status: string; count: number; category: string }[];
}

export const useNotionCRM = () => {
  return useQuery<NotionCRMStats, Error>({
    queryKey: ['notion-crm-stats'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notion-crm-stats`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch CRM stats');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });
};
