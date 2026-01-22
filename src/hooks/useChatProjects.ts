import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ChatProject {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  system_prompt: string | null;
  is_pinned: boolean;
  session_count: number;
  last_activity: string | null;
  created_at: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  system_prompt?: string;
}

export function useChatProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ChatProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all projects
  const fetchProjects = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase.rpc(
        "get_chat_projects",
        {
          p_user_id: user.id,
          p_include_archived: false,
        }
      );

      if (fetchError) throw fetchError;

      setProjects((data as ChatProject[]) || []);
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Create a new project
  const createProject = useCallback(
    async (input: CreateProjectInput): Promise<string | null> => {
      if (!user?.id) return null;

      try {
        const { data, error: createError } = await supabase
          .from("chat_projects")
          .insert({
            user_id: user.id,
            name: input.name,
            description: input.description || null,
            icon: input.icon || "folder",
            color: input.color || "slate",
            system_prompt: input.system_prompt || null,
          })
          .select("id")
          .single();

        if (createError) throw createError;

        // Refresh projects list
        await fetchProjects();

        return data.id;
      } catch (err) {
        console.error("Error creating project:", err);
        return null;
      }
    },
    [user?.id, fetchProjects]
  );

  // Update a project
  const updateProject = useCallback(
    async (
      projectId: string,
      updates: Partial<CreateProjectInput & { is_pinned?: boolean }>
    ): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        const { error: updateError } = await supabase
          .from("chat_projects")
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq("id", projectId)
          .eq("user_id", user.id);

        if (updateError) throw updateError;

        // Update local state
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? { ...p, ...updates } : p))
        );

        return true;
      } catch (err) {
        console.error("Error updating project:", err);
        return false;
      }
    },
    [user?.id]
  );

  // Delete a project (archive)
  const deleteProject = useCallback(
    async (projectId: string): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        const { error: deleteError } = await supabase
          .from("chat_projects")
          .update({ is_archived: true, updated_at: new Date().toISOString() })
          .eq("id", projectId)
          .eq("user_id", user.id);

        if (deleteError) throw deleteError;

        // Remove from local state
        setProjects((prev) => prev.filter((p) => p.id !== projectId));

        return true;
      } catch (err) {
        console.error("Error deleting project:", err);
        return false;
      }
    },
    [user?.id]
  );

  // Toggle pin status
  const togglePin = useCallback(
    async (projectId: string): Promise<boolean> => {
      const project = projects.find((p) => p.id === projectId);
      if (!project) return false;

      return updateProject(projectId, { is_pinned: !project.is_pinned });
    },
    [projects, updateProject]
  );

  // Get project by ID
  const getProject = useCallback(
    (projectId: string): ChatProject | undefined => {
      return projects.find((p) => p.id === projectId);
    },
    [projects]
  );

  // Initial fetch
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    isLoading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    togglePin,
    getProject,
  };
}
