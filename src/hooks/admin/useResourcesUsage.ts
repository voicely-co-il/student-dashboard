import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TableSize {
  table_name: string;
  total_size: string;
  total_bytes: number;
}

export interface ResourceUsage {
  supabase: {
    plan: string;
    trialEndsAt: string | null;
    database: {
      sizeUsed: number;
      sizeLimit: number;
      percentUsed: number;
    };
    storage: {
      sizeUsed: number;
      sizeLimit: number;
      percentUsed: number;
    };
    edgeFunctions: {
      invocations: number;
      limit: number;
      percentUsed: number;
    };
    auth: {
      monthlyActiveUsers: number;
      limit: number;
      percentUsed: number;
    };
    tableSizes?: TableSize[];
  };
  gemini: {
    plan: string;
    monthlyBudget: number;
    estimatedUsed: number;
    percentUsed: number;
    requestsToday: number;
  };
  vercel: {
    plan: string;
    bandwidth: {
      used: number;
      limit: number;
      percentUsed: number;
    };
    builds: {
      used: number;
      limit: number;
    };
  };
  openai: {
    monthlyBudget: number;
    estimatedUsed: number;
    percentUsed: number;
  };
}

export function useResourcesUsage() {
  return useQuery({
    queryKey: ["admin", "resources"],
    queryFn: async (): Promise<ResourceUsage> => {
      const { data, error } = await supabase.functions.invoke("admin-resources");

      if (error) {
        throw error;
      }

      return data;
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  });
}

// Helper to format bytes
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Helper to format currency
export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}
