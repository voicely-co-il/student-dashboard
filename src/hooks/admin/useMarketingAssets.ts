import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export interface MarketingAsset {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  asset_type: "image" | "video" | "audio" | "voice";
  service: string;
  prompt: string | null;
  negative_prompt: string | null;
  settings: Record<string, unknown>;
  status: "pending" | "processing" | "completed" | "failed";
  url: string | null;
  thumbnail_url: string | null;
  title: string | null;
  description: string | null;
  tags: string[] | null;
  used_in_campaigns: string[] | null;
  estimated_cost_usd: number;
}

export interface GenerateImageParams {
  prompt: string;
  negative_prompt?: string;
  aspect_ratio?: "1:1" | "9:16" | "16:9" | "4:3" | "3:4";
  num_outputs?: number;
  character?: "inbal" | "ilya" | "custom";
  title?: string;
  tags?: string[];
}

// Fetch all marketing assets
export function useMarketingAssets() {
  return useQuery({
    queryKey: ["admin", "marketing-assets"],
    queryFn: async (): Promise<MarketingAsset[]> => {
      const { data, error } = await supabase
        .from("marketing_assets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data as unknown as MarketingAsset[]) || [];
    },
  });
}

// Generate new image
export function useGenerateImage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: GenerateImageParams) => {
      const { data, error } = await supabase.functions.invoke(
        "generate-marketing-image",
        {
          body: params,
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "יצירת תמונה החלה",
        description: data.status === "completed"
          ? "התמונה נוצרה בהצלחה!"
          : "התמונה בתהליך יצירה...",
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "marketing-assets"] });
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה ביצירת תמונה",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Delete asset
export function useDeleteAsset() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (assetId: string) => {
      const { error } = await supabase
        .from("marketing_assets")
        .delete()
        .eq("id", assetId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "נמחק בהצלחה",
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "marketing-assets"] });
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה במחיקה",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Get total cost this month
export function useMarketingCostThisMonth() {
  return useQuery({
    queryKey: ["admin", "marketing-cost"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("marketing_assets")
        .select("estimated_cost_usd")
        .gte("created_at", startOfMonth.toISOString());

      if (error) throw error;

      const total = (data || []).reduce(
        (sum, asset) => sum + (Number(asset.estimated_cost_usd) || 0),
        0
      );

      return {
        totalUsd: total,
        totalIls: total * 3.6, // Approximate USD to ILS
        assetCount: data?.length || 0,
      };
    },
  });
}
