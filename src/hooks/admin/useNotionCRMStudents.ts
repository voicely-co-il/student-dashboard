import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CRMStudent {
  id: string;
  name: string;
  status: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
}

interface CRMStudentsResponse {
  students: CRMStudent[];
  total: number;
  active: number;
}

interface CRMMatchResponse {
  matches: CRMStudent[];
}

// Fetch all CRM students
export function useNotionCRMStudents() {
  return useQuery<CRMStudentsResponse, Error>({
    queryKey: ['notion-crm-students'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notion-crm-students`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch CRM students');
      }

      return response.json();
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    retry: 1,
  });
}

// Search for matching CRM students
export function useCRMStudentSearch(searchName: string | null) {
  return useQuery<CRMMatchResponse, Error>({
    queryKey: ['notion-crm-search', searchName],
    queryFn: async () => {
      if (!searchName) return { matches: [] };

      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notion-crm-students?search=${encodeURIComponent(searchName)}`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to search CRM students');
      }

      return response.json();
    },
    enabled: !!searchName && searchName.length >= 2,
    staleTime: 60 * 1000, // Cache for 1 minute
    retry: 1,
  });
}

// Get CRM student names as a simple list (for autocomplete)
export function useCRMStudentNames() {
  const { data, isLoading, error } = useNotionCRMStudents();

  return {
    names: data?.students.map(s => s.name) || [],
    activeNames: data?.students.filter(s => s.isActive).map(s => s.name) || [],
    isLoading,
    error,
  };
}
