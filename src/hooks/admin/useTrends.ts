import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TimelinePoint {
  period: string;
  count: number;
}

export interface TopicTrend {
  topic: string;
  timeline: TimelinePoint[];
  totalCount: number;
}

export interface SkillTrend {
  skill: string;
  timeline: TimelinePoint[];
  totalCount: number;
}

export interface TrendsData {
  topicTrends: TopicTrend[];
  skillTrends: SkillTrend[];
  lessonsOverTime: TimelinePoint[];
  granularity: 'week' | 'month';
}

// Generate mock timeline data for the past 12 months
const generateMockTimeline = (baseCount: number, variance: number = 0.3): TimelinePoint[] => {
  const months: TimelinePoint[] = [];
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const count = Math.round(baseCount * (1 + (Math.random() - 0.5) * variance));
    months.push({
      period: date.toISOString(),
      count: Math.max(0, count),
    });
  }
  return months;
};

// Mock data for development
const MOCK_TRENDS_DATA: TrendsData = {
  topicTrends: [
    { topic: 'נשימה סרעפתית', timeline: generateMockTimeline(25), totalCount: 312 },
    { topic: 'הרחבת טווח', timeline: generateMockTimeline(22), totalCount: 287 },
    { topic: 'רזוננס', timeline: generateMockTimeline(20), totalCount: 245 },
    { topic: 'תמיכה', timeline: generateMockTimeline(16), totalCount: 198 },
    { topic: 'ויברטו', timeline: generateMockTimeline(14), totalCount: 176 },
  ],
  skillTrends: [
    { skill: 'Lip Trills', timeline: generateMockTimeline(24), totalCount: 298 },
    { skill: 'סקאלות', timeline: generateMockTimeline(22), totalCount: 276 },
    { skill: 'תרגילי נשימה', timeline: generateMockTimeline(20), totalCount: 254 },
    { skill: 'אינטרוולים', timeline: generateMockTimeline(15), totalCount: 187 },
    { skill: 'הקרנה', timeline: generateMockTimeline(13), totalCount: 165 },
  ],
  lessonsOverTime: generateMockTimeline(70, 0.2),
  granularity: 'month',
};

// Flag to use mock data (set to false now that user is admin in DB)
const USE_MOCK_DATA = false;

interface UseTrendsOptions {
  startDate?: Date;
  endDate?: Date;
  granularity?: 'week' | 'month';
}

export const useTrends = (options: UseTrendsOptions = {}) => {
  const { startDate, endDate, granularity = 'month' } = options;

  return useQuery<TrendsData, Error>({
    queryKey: [
      'analytics',
      'trends',
      startDate?.toISOString(),
      endDate?.toISOString(),
      granularity,
    ],
    queryFn: async () => {
      // Use mock data until migration is run
      if (USE_MOCK_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate loading
        return { ...MOCK_TRENDS_DATA, granularity };
      }

      const { data, error } = await supabase.rpc('get_analytics_trends', {
        p_start_date: startDate?.toISOString() ?? null,
        p_end_date: endDate?.toISOString() ?? null,
        p_granularity: granularity,
      });

      if (error) {
        console.error('Error fetching trends:', error);
        throw new Error(error.message);
      }

      // The RPC returns JSONB, so data is already parsed
      return data as TrendsData;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });
};
