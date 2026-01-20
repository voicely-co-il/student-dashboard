import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TopicStat {
  topic: string;
  count: number;
}

export interface SkillStat {
  skill: string;
  count: number;
}

export interface MoodStat {
  mood: string;
  count: number;
}

export interface AnalyticsOverviewData {
  totalTranscripts: number;
  totalStudents: number;
  totalLessons: number;
  avgDurationMinutes: number;
  totalWords: number;
  topTopics: TopicStat[];
  topSkills: SkillStat[];
  moodDistribution: MoodStat[];
  dateRange: {
    start: string | null;
    end: string | null;
  };
}

// Mock data for development until migration is run
const MOCK_OVERVIEW_DATA: AnalyticsOverviewData = {
  totalTranscripts: 828,
  totalStudents: 127,
  totalLessons: 892,
  avgDurationMinutes: 45,
  totalWords: 2450000,
  topTopics: [
    { topic: 'נשימה סרעפתית', count: 312 },
    { topic: 'הרחבת טווח', count: 287 },
    { topic: 'רזוננס', count: 245 },
    { topic: 'תמיכה', count: 198 },
    { topic: 'ויברטו', count: 176 },
    { topic: 'דיקציה', count: 154 },
    { topic: 'פאסאג\'ו', count: 132 },
    { topic: 'ביטוי רגשי', count: 118 },
  ],
  topSkills: [
    { skill: 'Lip Trills', count: 298 },
    { skill: 'סקאלות', count: 276 },
    { skill: 'תרגילי נשימה', count: 254 },
    { skill: 'אינטרוולים', count: 187 },
    { skill: 'הקרנה', count: 165 },
    { skill: 'דינמיקה', count: 143 },
    { skill: 'מעברים', count: 121 },
    { skill: 'Vocal Fry', count: 98 },
  ],
  moodDistribution: [
    { mood: 'מלא מוטיבציה', count: 312 },
    { mood: 'רגוע', count: 245 },
    { mood: 'מתוסכל', count: 87 },
    { mood: 'מתרגש', count: 124 },
    { mood: 'עייף', count: 60 },
  ],
  dateRange: {
    start: null,
    end: null,
  },
};

// Flag to use mock data (set to false now that user is admin in DB)
const USE_MOCK_DATA = false;

interface UseAnalyticsOverviewOptions {
  startDate?: Date;
  endDate?: Date;
}

export const useAnalyticsOverview = (options: UseAnalyticsOverviewOptions = {}) => {
  const { startDate, endDate } = options;

  return useQuery<AnalyticsOverviewData, Error>({
    queryKey: ['analytics', 'overview', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      // Use mock data until migration is run
      if (USE_MOCK_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate loading
        return MOCK_OVERVIEW_DATA;
      }

      const { data, error } = await supabase.rpc('get_analytics_overview', {
        p_start_date: startDate?.toISOString() ?? null,
        p_end_date: endDate?.toISOString() ?? null,
      });

      if (error) {
        console.error('Error fetching analytics overview:', error);
        throw new Error(error.message);
      }

      // The RPC returns JSONB, so data is already parsed
      return data as AnalyticsOverviewData;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });
};
