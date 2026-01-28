import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Recommendation {
  type: "warning" | "suggestion" | "opportunity";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  potentialSaving: number;
  action: string;
}

export interface Expense {
  name: string;
  monthlyCost: number;
}

export interface ExpenseAnalysis {
  summary: {
    monthlyIncome: number;
    monthlyExpenses: number;
    grossProfit: number;
    expenseRatio: number;
  };
  recommendations: Recommendation[];
  totalPotentialSaving: number;
  top5Expenses: Expense[];
  allExpenses: Expense[];
  expenseCount: number;
}

export function useExpenseAnalysis() {
  return useQuery({
    queryKey: ["expense-analysis"],
    queryFn: async (): Promise<ExpenseAnalysis> => {
      const { data, error } = await supabase.functions.invoke("analyze-expenses");

      if (error) {
        throw new Error(error.message);
      }

      return data as ExpenseAnalysis;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
  });
}
