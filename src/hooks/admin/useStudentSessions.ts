import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StudentSession {
  studentName: string;
  sessionCount: number;
  firstSession: string | null;
  lastSession: string | null;
  crmStatus?: string;
  crmStartDate?: string;
  notionId?: string;
}

export interface StudentSessionsResponse {
  students: StudentSession[];
  totalStudents: number;
  totalSessions: number;
}

export function useStudentSessions() {
  return useQuery({
    queryKey: ['student-sessions'],
    queryFn: async (): Promise<StudentSessionsResponse> => {
      const { data: sessionData } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/student-sessions`,
        {
          headers: {
            Authorization: `Bearer ${sessionData?.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch student sessions');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
