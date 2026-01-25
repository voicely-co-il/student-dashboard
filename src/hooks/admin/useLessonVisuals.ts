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
