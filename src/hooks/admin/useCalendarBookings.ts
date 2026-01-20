import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
  status?: string;
  attendees?: {
    email: string;
    name?: string;
    responseStatus?: string;
  }[];
}

export interface CalendarBookingsResponse {
  events: CalendarEvent[];
  count: number;
  todayCount: number;
  todayEvents: CalendarEvent[];
  nextLesson: CalendarEvent | null;
  weekCount: number;
}

/**
 * Fetch calendar events from Google Calendar via Edge Function
 */
export const useCalendarBookings = () => {
  return useQuery<CalendarBookingsResponse, Error>({
    queryKey: ['google-calendar-events'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch calendar events');
      }

      const data = await response.json();

      return {
        events: data.events || [],
        count: data.count || 0,
        todayCount: data.todayCount || 0,
        todayEvents: data.todayEvents || [],
        nextLesson: data.nextLesson || null,
        weekCount: data.weekCount || 0,
      };
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    retry: 1,
  });
};

/**
 * Format time for display (e.g., "14:30")
 */
export const formatLessonTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

/**
 * Format date for display (e.g., "היום" or "מחר" or "יום ג'")
 */
export const formatLessonDate = (isoString: string): string => {
  const date = new Date(isoString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return 'היום';
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'מחר';
  }

  const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  return `יום ${days[date.getDay()]}'`;
};
