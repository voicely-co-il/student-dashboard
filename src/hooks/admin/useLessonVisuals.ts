import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LessonVisual {
  id: string;
  transcript_id: string | null;
  student_name: string | null;
  lesson_date: string | null;
  source_text: string;
  prompt: string;
  image_url: string | null;
  thumbnail_url: string | null;
  model: string;
  settings: Record<string, unknown>;
  status: "pending" | "generating" | "completed" | "failed";
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface GenerateVisualParams {
  transcript_id?: string;
  lesson_content?: string;
  student_name?: string;
  lesson_date?: string;
  style?: "cartoon" | "watercolor" | "realistic" | "minimalist";
  aspect_ratio?: "1:1" | "16:9" | "9:16";
}

// Fetch all lesson visuals
export function useLessonVisuals(filters?: {
  status?: string;
  student_name?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["lesson-visuals", filters],
    queryFn: async () => {
      let query = supabase
        .from("lesson_visuals")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.student_name) {
        query = query.ilike("student_name", `%${filters.student_name}%`);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as LessonVisual[];
    },
  });
}

// Fetch recent completed visuals
export function useRecentVisuals(limit = 10) {
  return useQuery({
    queryKey: ["lesson-visuals", "recent", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_visuals")
        .select("*")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as LessonVisual[];
    },
  });
}

// Fetch visuals for a specific student
export function useStudentVisuals(studentName: string) {
  return useQuery({
    queryKey: ["lesson-visuals", "student", studentName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_visuals")
        .select("*")
        .ilike("student_name", `%${studentName}%`)
        .eq("status", "completed")
        .order("lesson_date", { ascending: false });

      if (error) throw error;
      return data as LessonVisual[];
    },
    enabled: !!studentName,
  });
}

// Generate a new visual
export function useGenerateVisual() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: GenerateVisualParams) => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("generate-lesson-visual", {
        body: params,
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to generate visual");
      }

      return response.data;
    },
    onSuccess: (data) => {
      toast.success("התמונה נוצרה בהצלחה!", {
        description: `תמונה חדשה ל-${data.student_name || "תלמיד"}`,
      });
      queryClient.invalidateQueries({ queryKey: ["lesson-visuals"] });
    },
    onError: (error: Error) => {
      toast.error("שגיאה ביצירת התמונה", {
        description: error.message,
      });
    },
  });
}

// Delete a visual
export function useDeleteVisual() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (visualId: string) => {
      const { error } = await supabase
        .from("lesson_visuals")
        .delete()
        .eq("id", visualId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("התמונה נמחקה");
      queryClient.invalidateQueries({ queryKey: ["lesson-visuals"] });
    },
    onError: (error: Error) => {
      toast.error("שגיאה במחיקה", { description: error.message });
    },
  });
}

// ============================================
// Smart Suggestions - Creative Marketing Prompts
// ============================================

export interface VisualSuggestion {
  title_he: string;
  hook_he: string;
  angle: "TRANSFORMATION" | "VICTORY" | "EMOTION" | "TECHNIQUE" | "COMMUNITY";
  image_prompt: string;
  caption_he: string;
  hashtags: string[];
  score: number;
  why_viral: string;
}

export interface TranscriptSuggestion {
  transcript_id: string;
  student_name: string;
  lesson_date: string;
  content_preview: string;
  suggestions: VisualSuggestion[];
  lesson_type: string;
  key_achievement: string;
}

interface SuggestionsParams {
  days?: number;
  limit?: number;
  transcript_id?: string;
  surprise_me?: boolean;
}

// Fetch smart suggestions from recent lessons
export function useLessonSuggestions(params?: SuggestionsParams) {
  return useQuery({
    queryKey: ["lesson-visual-suggestions", params],
    queryFn: async () => {
      const response = await supabase.functions.invoke("suggest-lesson-visuals", {
        body: params || { days: 7, limit: 5 },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to fetch suggestions");
      }

      return response.data as {
        success: boolean;
        count: number;
        suggestions: TranscriptSuggestion[];
      };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
  });
}

// Generate a visual from a specific suggestion
export function useGenerateFromSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transcript_id,
      suggestion,
      student_name,
      lesson_date,
      style = "cartoon",
    }: {
      transcript_id: string;
      suggestion: VisualSuggestion;
      student_name: string;
      lesson_date: string;
      style?: "cartoon" | "watercolor" | "realistic" | "minimalist";
    }) => {
      const response = await supabase.functions.invoke("generate-lesson-visual", {
        body: {
          transcript_id,
          lesson_content: `[Creative Prompt]\nTitle: ${suggestion.title_he}\nHook: ${suggestion.hook_he}\nKey Achievement: ${suggestion.why_viral}\n\n[Pre-generated Prompt - Use directly]\n${suggestion.image_prompt}`,
          student_name,
          lesson_date,
          style,
          // Pass the pre-generated prompt directly
          direct_prompt: suggestion.image_prompt,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to generate visual");
      }

      return {
        ...response.data,
        caption_he: suggestion.caption_he,
        hashtags: suggestion.hashtags,
      };
    },
    onSuccess: (data) => {
      toast.success("🎨 התמונה נוצרה בהצלחה!", {
        description: `${data.student_name || "תלמיד"} - מוכנה לשיתוף!`,
      });
      queryClient.invalidateQueries({ queryKey: ["lesson-visuals"] });
      queryClient.invalidateQueries({ queryKey: ["lesson-visual-suggestions"] });
    },
    onError: (error: Error) => {
      toast.error("שגיאה ביצירת התמונה", {
        description: error.message,
      });
    },
  });
}

// "Surprise Me" - Random creative suggestion
export function useSurpriseMe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await supabase.functions.invoke("suggest-lesson-visuals", {
        body: { days: 14, limit: 1, surprise_me: true },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to get surprise");
      }

      const data = response.data as {
        suggestions: TranscriptSuggestion[];
      };

      if (!data.suggestions || data.suggestions.length === 0) {
        throw new Error("לא נמצאו שיעורים אחרונים להפתעה");
      }

      // Get the top suggestion from the random transcript
      const randomTranscript = data.suggestions[0];
      const topSuggestion = randomTranscript.suggestions[0];

      return {
        transcript: randomTranscript,
        suggestion: topSuggestion,
      };
    },
    onSuccess: () => {
      toast.success("🎲 נמצאה הפתעה!", {
        description: "בחרתי רגע מיוחד משיעור אחרון",
      });
    },
    onError: (error: Error) => {
      toast.error("לא הצלחתי למצוא הפתעה", {
        description: error.message,
      });
    },
  });
}
