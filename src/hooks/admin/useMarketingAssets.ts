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

export interface GenerateCreativeImageParams {
  prompt: string;
  style?: "vivid" | "natural";
  size?: "1024x1024" | "1792x1024" | "1024x1792";
  quality?: "standard" | "hd";
  title?: string;
  tags?: string[];
}

export interface GenerateVideoParams {
  prompt: string;
  mode: "text-to-video" | "image-to-video";
  image_url?: string;
  duration?: "5" | "10";
  aspect_ratio?: "16:9" | "9:16" | "1:1";
  service?: "kling" | "seedance";
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

// Generate creative image (DALL-E 3)
export function useGenerateCreativeImage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: GenerateCreativeImageParams) => {
      const { data, error } = await supabase.functions.invoke(
        "generate-creative-image",
        {
          body: params,
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "יצירת תמונה",
        description: data.status === "completed"
          ? "התמונה נוצרה בהצלחה!"
          : "יצירת התמונה נכשלה",
        variant: data.status === "completed" ? "default" : "destructive",
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

// Generate video (Kling / Seedance)
export function useGenerateVideo() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: GenerateVideoParams) => {
      const { data, error } = await supabase.functions.invoke(
        "generate-video",
        {
          body: params,
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "יצירת וידאו החלה",
        description: "הוידאו בתהליך יצירה, יעודכן בספרייה כשיהיה מוכן",
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "marketing-assets"] });
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה ביצירת וידאו",
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

// Marketing Scenario (template)
export interface MarketingScenario {
  id: string;
  name: string;
  name_he: string;
  emoji: string | null;
  prompt_template: string;
  category: string;
  sort_order: number;
  is_active: boolean;
}

// Marketing Model (trained character)
export interface MarketingModel {
  id: string;
  name: string;
  name_he: string;
  token: string;
  tune_id: string;
  thumbnail_url: string | null;
  is_active: boolean;
}

// Fetch marketing scenarios (templates)
export function useMarketingScenarios() {
  return useQuery({
    queryKey: ["admin", "marketing-scenarios"],
    queryFn: async (): Promise<MarketingScenario[]> => {
      const { data, error } = await supabase
        .from("marketing_scenarios")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data as unknown as MarketingScenario[]) || [];
    },
  });
}

// Fetch marketing models (characters)
export function useMarketingModels() {
  return useQuery({
    queryKey: ["admin", "marketing-models"],
    queryFn: async (): Promise<MarketingModel[]> => {
      const { data, error } = await supabase
        .from("marketing_models")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;
      return (data as unknown as MarketingModel[]) || [];
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
