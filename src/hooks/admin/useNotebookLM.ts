import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Transcript type for the picker
export interface TranscriptItem {
  id: string;
  title: string | null;
  student_name: string | null;
  lesson_date: string | null;
  word_count: number | null;
  language: string | null;
}

// Types
export interface NotebookLMContent {
  id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  notebook_id: string;
  notebook_name: string | null;
  content_type: "podcast" | "slides" | "infographic" | "question";
  settings: Record<string, unknown>;
  prompt: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  task_id: string | null;
  progress_percent: number;
  content_url: string | null;
  thumbnail_url: string | null;
  transcript: string | null;
  answer: string | null;
  duration_seconds: number | null;
  title: string | null;
  description: string | null;
  error_message: string | null;
  source_content: string | null;
}

export interface Notebook {
  id: string;
  name: string;
  description?: string;
  source_count?: number;
}

export interface GenerateFromContentParams {
  title: string;
  content: string;
  outputs: ("podcast" | "slides" | "infographic")[];
  question?: string;
}

// Fetch all NotebookLM content
export function useNotebookLMContent(contentType?: string) {
  return useQuery({
    queryKey: ["notebooklm-content", contentType],
    queryFn: async () => {
      let query = supabase
        .from("notebooklm_content")
        .select("*")
        .order("created_at", { ascending: false });

      if (contentType) {
        query = query.eq("content_type", contentType);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching NotebookLM content:", error);
        throw error;
      }

      return data as NotebookLMContent[];
    },
  });
}

// Fetch single content item (for polling)
export function useNotebookLMContentItem(id: string | null) {
  return useQuery({
    queryKey: ["notebooklm-content", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("notebooklm_content")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching content item:", error);
        throw error;
      }

      return data as NotebookLMContent;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data as NotebookLMContent | null;
      // Poll every 5 seconds while processing
      if (data?.status === "processing" || data?.status === "pending") {
        return 5000;
      }
      return false;
    },
  });
}

// Generate content from raw text/transcript
export function useGenerateFromContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: GenerateFromContentParams) => {
      const { data, error } = await supabase.functions.invoke(
        "notebooklm-content",
        {
          body: {
            action: "generate_from_content",
            ...params,
          },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["notebooklm-content"] });
      queryClient.invalidateQueries({ queryKey: ["notebooklm-pending-count"] });
      const count = data?.created_count || 0;
      toast.success(`נוספו ${count} פריטים לתור העיבוד!`);
    },
    onError: (error) => {
      console.error("Error generating content:", error);
      toast.error("שגיאה ביצירת התוכן");
    },
  });
}

// Delete content
export function useDeleteNotebookLMContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First, get the content to check if there's a file to delete
      const { data: content } = await supabase
        .from("notebooklm_content")
        .select("content_url")
        .eq("id", id)
        .single();

      // If there's a content URL in our storage, delete the file
      if (content?.content_url && content.content_url.includes("supabase.co/storage")) {
        const urlParts = content.content_url.split("/notebooklm-content/");
        if (urlParts[1]) {
          await supabase.storage
            .from("notebooklm-content")
            .remove([urlParts[1]]);
        }
      }

      // Delete the database record
      const { error } = await supabase
        .from("notebooklm_content")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooklm-content"] });
      queryClient.invalidateQueries({ queryKey: ["notebooklm-pending-count"] });
      toast.success("התוכן נמחק");
    },
    onError: (error) => {
      console.error("Error deleting content:", error);
      toast.error("שגיאה במחיקת התוכן");
    },
  });
}

// Get pending count
export function usePendingCount() {
  return useQuery({
    queryKey: ["notebooklm-pending-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notebooklm_content")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 10000, // Check every 10 seconds
  });
}

// Fetch transcripts for the picker
export function useTranscripts(search?: string) {
  return useQuery({
    queryKey: ["transcripts-list", search],
    queryFn: async () => {
      let query = supabase
        .from("transcripts")
        .select("id, title, student_name, lesson_date, word_count, language")
        .order("lesson_date", { ascending: false })
        .limit(100);

      if (search) {
        query = query.or(
          `title.ilike.%${search}%,student_name.ilike.%${search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as TranscriptItem[];
    },
  });
}

// Get unique student names for filtering
export function useTranscriptStudents() {
  return useQuery({
    queryKey: ["transcript-students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transcripts")
        .select("student_name")
        .not("student_name", "is", null)
        .order("student_name");

      if (error) throw error;

      // Deduplicate
      const unique = [...new Set((data || []).map((d) => d.student_name).filter(Boolean))] as string[];
      return unique;
    },
  });
}

// Generate content from transcripts via the API route
export function useGenerateFromTranscripts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      transcript_ids: string[];
      outputs: ("podcast" | "slides" | "infographic")[];
      title?: string;
    }) => {
      const response = await fetch("/api/notebooklm/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "from_transcripts",
          transcript_ids: params.transcript_ids,
          outputs: params.outputs,
          title: params.title,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to generate content");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["notebooklm-content"] });
      queryClient.invalidateQueries({ queryKey: ["notebooklm-pending-count"] });
      toast.success(
        `נוצרו ${data.created_ids?.length || 0} פריטים מ-${data.transcript_count || 0} תמלולים`
      );
    },
    onError: (error) => {
      console.error("Error generating from transcripts:", error);
      toast.error(error instanceof Error ? error.message : "שגיאה ביצירת תוכן מתמלולים");
    },
  });
}

// Process the queue via the API route
export function useProcessQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notebooklm/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "process_queue" }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to process queue");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["notebooklm-content"] });
      queryClient.invalidateQueries({ queryKey: ["notebooklm-pending-count"] });
      if (data.processed === 0) {
        toast.info("אין פריטים בתור לעיבוד");
      } else {
        toast.success(`עובדו ${data.processed} פריטים`);
      }
    },
    onError: (error) => {
      console.error("Error processing queue:", error);
      toast.error(error instanceof Error ? error.message : "שגיאה בעיבוד התור");
    },
  });
}
