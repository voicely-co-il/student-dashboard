import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TestimonialCandidate {
  studentName: string;
  reason: string;
  highlights: string[];
  suggestedPlatform: 'video' | 'google' | 'facebook' | 'website';
  confidenceScore: number;
  lessonCount: number;
  recentLessons: { date: string; summary: string }[];
}

export interface GeneratedRequest {
  message: string;
  subject?: string;
  platform: string;
  tone: string;
  personalDetails: string[];
}

export interface TestimonialRequestParams {
  studentName: string;
  platform: 'whatsapp' | 'email' | 'video' | 'google' | 'facebook';
  tone: 'warm' | 'professional' | 'playful' | 'grateful';
  includeSpecificMoments?: boolean;
}

export const useTestimonialCandidates = (limit = 10, minLessons = 3) => {
  return useQuery<{ candidates: TestimonialCandidate[] }, Error>({
    queryKey: ['testimonial-candidates', limit, minLessons],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/find-testimonial-candidates`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ limit, minLessons }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to find testimonial candidates');
      }

      return response.json();
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    retry: 1,
  });
};

export const useGenerateTestimonialRequest = () => {
  return useMutation<
    { request: GeneratedRequest; studentName: string; lessonsCount: number },
    Error,
    TestimonialRequestParams
  >({
    mutationFn: async (params) => {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-testimonial-request`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate testimonial request');
      }

      return response.json();
    },
  });
};
