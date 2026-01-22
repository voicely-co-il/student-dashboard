import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Types
export interface CashflowCategory {
  id: string;
  name: string;
  type: "income" | "expense" | "other_expense";
  sort_order: number;
  is_default: boolean;
  created_at: string;
}

export interface CashflowEntry {
  id: string;
  category_id: string;
  period_type: "weekly" | "monthly";
  period_start: string;
  amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CashflowSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  updated_at: string;
}

// ─── Queries ────────────────────────────────────────────────

export function useCashflowCategories() {
  return useQuery({
    queryKey: ["admin", "cashflow-categories"],
    queryFn: async (): Promise<CashflowCategory[]> => {
      const { data, error } = await supabase
        .from("cashflow_categories")
        .select("*")
        .order("type")
        .order("sort_order");
      if (error) throw error;
      return (data as unknown as CashflowCategory[]) || [];
    },
  });
}

export function useCashflowEntries(periodType: "weekly" | "monthly", periodStarts: string[]) {
  return useQuery({
    queryKey: ["admin", "cashflow-entries", periodType, periodStarts],
    queryFn: async (): Promise<CashflowEntry[]> => {
      if (periodStarts.length === 0) return [];
      const { data, error } = await supabase
        .from("cashflow_entries")
        .select("*")
        .eq("period_type", periodType)
        .in("period_start", periodStarts);
      if (error) throw error;
      return (data as unknown as CashflowEntry[]) || [];
    },
    enabled: periodStarts.length > 0,
  });
}

export function useCashflowSettings() {
  return useQuery({
    queryKey: ["admin", "cashflow-settings"],
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase
        .from("cashflow_settings")
        .select("*");
      if (error) throw error;
      const settings: Record<string, string> = {};
      ((data as unknown as CashflowSetting[]) || []).forEach((s) => {
        settings[s.setting_key] = s.setting_value;
      });
      return settings;
    },
  });
}

// ─── Mutations ──────────────────────────────────────────────

export function useUpsertEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      category_id: string;
      period_type: "weekly" | "monthly";
      period_start: string;
      amount: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("cashflow_entries")
        .upsert(
          {
            category_id: params.category_id,
            period_type: params.period_type,
            period_start: params.period_start,
            amount: params.amount,
            notes: params.notes || null,
          },
          { onConflict: "category_id,period_type,period_start" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "cashflow-entries"] });
    },
    onError: (error: Error) => {
      toast({ title: "שגיאה בשמירה", description: error.message, variant: "destructive" });
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { name: string; type: "income" | "expense" | "other_expense" }) => {
      // Get max sort_order for this type
      const { data: existing } = await supabase
        .from("cashflow_categories")
        .select("sort_order")
        .eq("type", params.type)
        .order("sort_order", { ascending: false })
        .limit(1);
      const nextOrder = ((existing as unknown as CashflowCategory[])?.[0]?.sort_order || 0) + 1;

      const { data, error } = await supabase
        .from("cashflow_categories")
        .insert({ name: params.name, type: params.type, sort_order: nextOrder, is_default: false })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "קטגוריה נוספה בהצלחה" });
      queryClient.invalidateQueries({ queryKey: ["admin", "cashflow-categories"] });
    },
    onError: (error: Error) => {
      toast({ title: "שגיאה בהוספת קטגוריה", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { id: string; name?: string; sort_order?: number }) => {
      const updates: Record<string, unknown> = {};
      if (params.name !== undefined) updates.name = params.name;
      if (params.sort_order !== undefined) updates.sort_order = params.sort_order;

      const { data, error } = await supabase
        .from("cashflow_categories")
        .update(updates)
        .eq("id", params.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "cashflow-categories"] });
    },
    onError: (error: Error) => {
      toast({ title: "שגיאה בעדכון קטגוריה", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cashflow_categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "קטגוריה נמחקה" });
      queryClient.invalidateQueries({ queryKey: ["admin", "cashflow-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "cashflow-entries"] });
    },
    onError: (error: Error) => {
      toast({ title: "שגיאה במחיקת קטגוריה", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { key: string; value: string }) => {
      const { data, error } = await supabase
        .from("cashflow_settings")
        .upsert(
          { setting_key: params.key, setting_value: params.value },
          { onConflict: "setting_key" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "cashflow-settings"] });
    },
    onError: (error: Error) => {
      toast({ title: "שגיאה בשמירת הגדרה", description: error.message, variant: "destructive" });
    },
  });
}

// ─── Helpers ────────────────────────────────────────────────

/** Generate array of period start dates for weekly view */
export function getWeeklyPeriods(startDate: Date, count: number = 13): string[] {
  const periods: string[] = [];
  const d = new Date(startDate);
  // Align to Monday
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);

  for (let i = 0; i < count; i++) {
    periods.push(d.toISOString().split("T")[0]);
    d.setDate(d.getDate() + 7);
  }
  return periods;
}

/** Generate array of period start dates for monthly view */
export function getMonthlyPeriods(startDate: Date, count: number = 12): string[] {
  const periods: string[] = [];
  const d = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  for (let i = 0; i < count; i++) {
    periods.push(d.toISOString().split("T")[0]);
    d.setMonth(d.getMonth() + 1);
  }
  return periods;
}

/** Format date for display */
export function formatPeriodLabel(dateStr: string, periodType: "weekly" | "monthly"): string {
  const d = new Date(dateStr);
  if (periodType === "weekly") {
    return d.toLocaleDateString("he-IL", { day: "numeric", month: "short" });
  }
  return d.toLocaleDateString("he-IL", { month: "long", year: "numeric" });
}
