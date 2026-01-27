import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BusinessMetrics {
  weeklyIncome: number;
  weeklyExpenses: number;
  lessonsPerWeek: number;
  avgPricePerLesson: number;
  studentCount: number;
  weeklyTrend: number; // percentage change from last week
  lessonsTrend: number;
}

export function useBusinessMetrics() {
  return useQuery({
    queryKey: ["business-metrics"],
    queryFn: async (): Promise<BusinessMetrics> => {
      // Get recent transcripts (last 4 weeks)
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      const { data: transcripts } = await supabase
        .from("transcripts")
        .select("id, student_name, lesson_date, created_at")
        .gte("lesson_date", fourWeeksAgo.toISOString())
        .order("lesson_date", { ascending: false });

      // Get cashflow entries (last 4 weeks)
      const { data: entries } = await supabase
        .from("cashflow_entries")
        .select("amount, category_id, period_start")
        .eq("period_type", "weekly")
        .order("period_start", { ascending: false })
        .limit(8); // 4 weeks * 2 (income + expense)

      // Get income categories
      const { data: categories } = await supabase
        .from("cashflow_categories")
        .select("id, type");

      const incomeIds = categories?.filter(c => c.type === "income").map(c => c.id) || [];
      const expenseIds = categories?.filter(c => c.type === "expense" || c.type === "other_expense").map(c => c.id) || [];

      // Calculate weekly income/expenses
      const weeklyData = new Map<string, { income: number; expenses: number }>();

      entries?.forEach(entry => {
        const week = entry.period_start;
        if (!weeklyData.has(week)) {
          weeklyData.set(week, { income: 0, expenses: 0 });
        }
        const data = weeklyData.get(week)!;
        if (incomeIds.includes(entry.category_id)) {
          data.income += Number(entry.amount);
        } else if (expenseIds.includes(entry.category_id)) {
          data.expenses += Number(entry.amount);
        }
      });

      const weeks = Array.from(weeklyData.entries()).sort((a, b) => b[0].localeCompare(a[0]));
      const currentWeek = weeks[0];
      const lastWeek = weeks[1];

      // Count lessons per week
      const lessonsByWeek = new Map<string, Set<string>>();
      transcripts?.forEach(t => {
        const date = new Date(t.lesson_date || t.created_at);
        const day = date.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        date.setDate(date.getDate() + diff);
        const weekKey = date.toISOString().split("T")[0];

        if (!lessonsByWeek.has(weekKey)) {
          lessonsByWeek.set(weekKey, new Set());
        }
        if (t.student_name) {
          lessonsByWeek.get(weekKey)!.add(t.student_name);
        }
      });

      // Calculate averages
      const totalLessons = transcripts?.length || 0;
      const weeksCount = lessonsByWeek.size || 1;
      const lessonsPerWeek = totalLessons / weeksCount;

      // Unique students
      const uniqueStudents = new Set<string>();
      transcripts?.forEach(t => {
        if (t.student_name) uniqueStudents.add(t.student_name);
      });

      // Average income
      const totalIncome = weeks.reduce((sum, [_, data]) => sum + data.income, 0);
      const totalExpenses = weeks.reduce((sum, [_, data]) => sum + data.expenses, 0);
      const avgWeeklyIncome = totalIncome / (weeks.length || 1);
      const avgWeeklyExpenses = totalExpenses / (weeks.length || 1);

      // Calculate trends
      const weeklyTrend = currentWeek && lastWeek
        ? ((currentWeek[1].income - lastWeek[1].income) / lastWeek[1].income) * 100
        : 0;

      const currentWeekLessons = lessonsByWeek.get(currentWeek?.[0] || "")?.size || 0;
      const lastWeekKey = Array.from(lessonsByWeek.keys()).sort().reverse()[1] || "";
      const lastWeekLessons = lessonsByWeek.get(lastWeekKey)?.size || 1;
      const lessonsTrend = ((currentWeekLessons - lastWeekLessons) / lastWeekLessons) * 100;

      // Average price per lesson
      const avgPricePerLesson = totalLessons > 0 ? totalIncome / totalLessons : 195;

      return {
        weeklyIncome: avgWeeklyIncome,
        weeklyExpenses: avgWeeklyExpenses,
        lessonsPerWeek: Math.round(lessonsPerWeek),
        avgPricePerLesson: Math.round(avgPricePerLesson),
        studentCount: uniqueStudents.size,
        weeklyTrend: Math.round(weeklyTrend),
        lessonsTrend: Math.round(lessonsTrend),
      };
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
}
