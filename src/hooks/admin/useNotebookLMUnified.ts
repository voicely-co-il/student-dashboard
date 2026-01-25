/**
 * Unified NotebookLM Hook
 *
 * Provides React hooks for content generation with automatic backend selection:
 * - Local MCP server (free, requires running notebooklm-mcp)
 * - Gemini Cloud API (pay-per-use, no setup needed)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getNotebookLMClient,
  BackendMode,
  BackendStatus,
  NotebookLMSettings,
  ContentGenerationRequest,
  ContentGenerationResult,
} from "@/lib/notebooklm";

// Re-export types from the main hook for compatibility
export type {
  NotebookLMContent,
  TranscriptItem,
  Notebook,
  GenerateFromContentParams,
} from "./useNotebookLM";

/**
 * Hook to check and monitor backend status
 */
export function useNotebookLMBackendStatus() {
  const [status, setStatus] = useState<BackendStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const checkStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      const client = getNotebookLMClient();
      const backendStatus = await client.getBackendStatus();
      setStatus(backendStatus);
    } catch (e) {
      console.error("Failed to check backend status:", e);
      setStatus({
        mode: "auto",
        localAvailable: false,
        cloudAvailable: false,
        activeBackend: null,
      });
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    // Re-check every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  return {
    status,
    isChecking,
    refresh: checkStatus,
  };
}

/**
 * Hook to manage NotebookLM settings
 */
export function useNotebookLMSettings() {
  const [settings, setSettings] = useState<NotebookLMSettings>(() => {
    return getNotebookLMClient().getSettings();
  });

  const updateSettings = useCallback((newSettings: Partial<NotebookLMSettings>) => {
    const client = getNotebookLMClient();
    client.saveSettings(newSettings);
    setSettings(client.getSettings());
  }, []);

  const setMode = useCallback(
    (mode: BackendMode) => {
      updateSettings({ mode });
      toast.success(
        mode === "local"
          ? "מצב: שרת מקומי"
          : mode === "cloud"
          ? "מצב: Gemini Cloud"
          : "מצב: אוטומטי"
      );
    },
    [updateSettings]
  );

  return {
    settings,
    updateSettings,
    setMode,
  };
}

/**
 * Hook for direct content generation (without queue)
 * Use this for immediate processing when backend is available
 */
export function useDirectGeneration() {
  const queryClient = useQueryClient();
  const [results, setResults] = useState<ContentGenerationResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = useMutation({
    mutationFn: async (request: ContentGenerationRequest) => {
      setIsGenerating(true);
      setResults([]);

      const client = getNotebookLMClient();
      const generationResults = await client.generateContent(
        request,
        (result) => {
          setResults((prev) => {
            const existing = prev.findIndex((r) => r.type === result.type);
            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = result;
              return updated;
            }
            return [...prev, result];
          });
        }
      );

      return generationResults;
    },
    onSuccess: (data) => {
      setIsGenerating(false);
      const completed = data.filter((r) => r.status === "completed").length;
      const failed = data.filter((r) => r.status === "failed").length;

      if (failed > 0) {
        toast.warning(`הושלמו ${completed} פריטים, ${failed} נכשלו`);
      } else {
        toast.success(`הושלמו ${completed} פריטים!`);
      }

      queryClient.invalidateQueries({ queryKey: ["notebooklm-content"] });
    },
    onError: (error) => {
      setIsGenerating(false);
      console.error("Generation error:", error);
      toast.error(error instanceof Error ? error.message : "שגיאה ביצירת תוכן");
    },
  });

  return {
    generate: generate.mutate,
    isGenerating,
    results,
    error: generate.error,
    reset: () => setResults([]),
  };
}

/**
 * Hook to generate content and save to database queue
 * Compatible with existing useGenerateFromContent
 */
export function useGenerateFromContentUnified() {
  const queryClient = useQueryClient();
  const { status } = useNotebookLMBackendStatus();

  return useMutation({
    mutationFn: async (params: {
      title: string;
      content: string;
      outputs: ("podcast" | "slides" | "infographic")[];
      question?: string;
    }) => {
      // Get admin user for created_by
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .limit(1)
        .single();

      const createdBy = adminRole?.user_id || "system";
      const batchId = crypto.randomUUID();
      const createdIds: string[] = [];

      // Determine if we should process immediately or queue
      const processImmediately = status?.activeBackend !== null;

      for (const outputType of params.outputs) {
        const contentTypeName =
          outputType === "podcast"
            ? "פודקסט"
            : outputType === "slides"
            ? "מצגת"
            : "אינפוגרפיקה";

        const { data: record } = await supabase
          .from("notebooklm_content")
          .insert({
            created_by: createdBy,
            notebook_id: batchId,
            notebook_name: params.title,
            content_type: outputType,
            title: `${params.title} - ${contentTypeName}`,
            source_content: params.content,
            settings: {},
            status: processImmediately ? "processing" : "pending",
          })
          .select("id")
          .single();

        if (record) createdIds.push(record.id);
      }

      // If question provided, add it too
      if (params.question) {
        const { data: record } = await supabase
          .from("notebooklm_content")
          .insert({
            created_by: createdBy,
            notebook_id: batchId,
            notebook_name: params.title,
            content_type: "question",
            title: params.question,
            source_content: params.content,
            prompt: params.question,
            settings: {},
            status: processImmediately ? "processing" : "pending",
          })
          .select("id")
          .single();

        if (record) createdIds.push(record.id);
      }

      // If backend available, process immediately
      if (processImmediately && createdIds.length > 0) {
        const client = getNotebookLMClient();
        const results = await client.generateContent({
          title: params.title,
          content: params.content,
          outputs: params.outputs,
          question: params.question,
        });

        // Update records with results
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const recordId = createdIds[i];

          if (recordId) {
            await supabase
              .from("notebooklm_content")
              .update({
                status: result.status,
                answer:
                  result.type === "question"
                    ? (result.data as { answer?: string })?.answer
                    : null,
                error_message: result.error,
              })
              .eq("id", recordId);
          }
        }
      }

      return {
        batch_id: batchId,
        created_ids: createdIds,
        processed_immediately: processImmediately,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["notebooklm-content"] });
      queryClient.invalidateQueries({ queryKey: ["notebooklm-pending-count"] });

      if (data.processed_immediately) {
        toast.success(`נוצרו ${data.created_ids.length} פריטים!`);
      } else {
        toast.success(
          `נוספו ${data.created_ids.length} פריטים לתור. הפעל שרת מקומי לעיבוד.`
        );
      }
    },
    onError: (error) => {
      console.error("Error generating content:", error);
      toast.error("שגיאה ביצירת התוכן");
    },
  });
}

/**
 * Hook to generate from transcripts with unified backend
 */
export function useGenerateFromTranscriptsUnified() {
  const queryClient = useQueryClient();
  const { status } = useNotebookLMBackendStatus();

  return useMutation({
    mutationFn: async (params: {
      transcript_ids: string[];
      outputs: ("podcast" | "slides" | "infographic")[];
      title?: string;
    }) => {
      // Fetch transcripts
      const { data: transcripts } = await supabase
        .from("transcripts")
        .select("id, title, full_text, student_name, lesson_date")
        .in("id", params.transcript_ids);

      if (!transcripts || transcripts.length === 0) {
        throw new Error("לא נמצאו תמלולים");
      }

      // Combine transcripts
      const combinedContent = transcripts
        .map(
          (t) => `--- ${t.title} (${t.student_name || "לא ידוע"}) ---\n${t.full_text}`
        )
        .join("\n\n");

      const contentTitle =
        params.title ||
        (transcripts.length === 1
          ? transcripts[0].title
          : `${transcripts.length} שיעורים - ${transcripts[0].student_name || "מעורב"}`);

      // Get admin user
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .limit(1)
        .single();

      const createdBy = adminRole?.user_id || "system";
      const batchId = crypto.randomUUID();
      const createdIds: string[] = [];
      const processImmediately = status?.activeBackend !== null;

      for (const outputType of params.outputs) {
        const contentTypeName =
          outputType === "podcast"
            ? "פודקסט"
            : outputType === "slides"
            ? "מצגת"
            : "אינפוגרפיקה";

        const { data: record } = await supabase
          .from("notebooklm_content")
          .insert({
            created_by: createdBy,
            notebook_id: batchId,
            notebook_name: contentTitle,
            content_type: outputType,
            title: `${contentTitle} - ${contentTypeName}`,
            source_content: combinedContent,
            settings: { transcript_ids: params.transcript_ids },
            status: processImmediately ? "processing" : "pending",
          })
          .select("id")
          .single();

        if (record) createdIds.push(record.id);
      }

      // Process immediately if backend available
      if (processImmediately && createdIds.length > 0) {
        const client = getNotebookLMClient();
        const results = await client.generateContent({
          title: contentTitle || "תוכן משיעורים",
          content: combinedContent,
          outputs: params.outputs,
        });

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const recordId = createdIds[i];

          if (recordId) {
            await supabase
              .from("notebooklm_content")
              .update({
                status: result.status,
                error_message: result.error,
              })
              .eq("id", recordId);
          }
        }
      }

      return {
        batch_id: batchId,
        created_ids: createdIds,
        transcript_count: transcripts.length,
        processed_immediately: processImmediately,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["notebooklm-content"] });
      queryClient.invalidateQueries({ queryKey: ["notebooklm-pending-count"] });

      if (data.processed_immediately) {
        toast.success(
          `נוצרו ${data.created_ids.length} פריטים מ-${data.transcript_count} תמלולים!`
        );
      } else {
        toast.success(
          `נוספו ${data.created_ids.length} פריטים לתור מ-${data.transcript_count} תמלולים`
        );
      }
    },
    onError: (error) => {
      console.error("Error generating from transcripts:", error);
      toast.error(
        error instanceof Error ? error.message : "שגיאה ביצירת תוכן מתמלולים"
      );
    },
  });
}

/**
 * Hook to process pending queue items
 */
export function useProcessQueueUnified() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const client = getNotebookLMClient();
      const status = await client.getBackendStatus();

      if (!status.activeBackend) {
        throw new Error(
          "אין backend זמין. הפעל שרת מקומי או הגדר Gemini API key"
        );
      }

      // Get pending items
      const { data: pendingItems } = await supabase
        .from("notebooklm_content")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (!pendingItems || pendingItems.length === 0) {
        return { processed: 0, results: [] };
      }

      // Group by notebook_id (batch)
      const batches = new Map<string, typeof pendingItems>();
      for (const item of pendingItems) {
        const batch = batches.get(item.notebook_id) || [];
        batch.push(item);
        batches.set(item.notebook_id, batch);
      }

      const results: Array<{ id: string; status: string; error?: string }> = [];

      // Process each batch
      for (const [, items] of batches) {
        const firstItem = items[0];
        const outputs = items
          .filter((i) => i.content_type !== "question")
          .map((i) => i.content_type as "podcast" | "slides" | "infographic");

        const question = items.find((i) => i.content_type === "question");

        try {
          // Mark as processing
          await supabase
            .from("notebooklm_content")
            .update({ status: "processing" })
            .in(
              "id",
              items.map((i) => i.id)
            );

          const generationResults = await client.generateContent({
            title: firstItem.notebook_name || firstItem.title || "תוכן",
            content: firstItem.source_content || "",
            outputs,
            question: question?.prompt || undefined,
          });

          // Update each item
          for (const item of items) {
            const result = generationResults.find(
              (r) => r.type === item.content_type
            );

            if (result) {
              await supabase
                .from("notebooklm_content")
                .update({
                  status: result.status,
                  answer:
                    item.content_type === "question"
                      ? (result.data as { answer?: string })?.answer
                      : null,
                  error_message: result.error,
                })
                .eq("id", item.id);

              results.push({
                id: item.id,
                status: result.status,
                error: result.error,
              });
            }
          }
        } catch (e) {
          // Mark batch as failed
          const errorMsg = e instanceof Error ? e.message : String(e);
          await supabase
            .from("notebooklm_content")
            .update({ status: "failed", error_message: errorMsg })
            .in(
              "id",
              items.map((i) => i.id)
            );

          for (const item of items) {
            results.push({ id: item.id, status: "failed", error: errorMsg });
          }
        }
      }

      return { processed: results.length, results };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["notebooklm-content"] });
      queryClient.invalidateQueries({ queryKey: ["notebooklm-pending-count"] });

      if (data.processed === 0) {
        toast.info("אין פריטים בתור לעיבוד");
      } else {
        const failed = data.results.filter((r) => r.status === "failed").length;
        if (failed > 0) {
          toast.warning(`עובדו ${data.processed} פריטים, ${failed} נכשלו`);
        } else {
          toast.success(`עובדו ${data.processed} פריטים בהצלחה!`);
        }
      }
    },
    onError: (error) => {
      console.error("Error processing queue:", error);
      toast.error(error instanceof Error ? error.message : "שגיאה בעיבוד התור");
    },
  });
}
