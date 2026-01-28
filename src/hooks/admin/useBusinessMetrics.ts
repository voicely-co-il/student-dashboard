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

      // Get settings for pricing
      const { data: settingsData } = await supabase
        .from("cashflow_settings")
        .select("setting_key, setting_value");

      const settings: Record<string, string> = {};
      settingsData?.forEach((s: { setting_key: string; setting_value: string }) => {
        settings[s.setting_key] = s.setting_value;
      });

      const price1on1 = parseFloat(settings.price_1on1_new || "200");
      const priceVeteran = parseFloat(settings.price_1on1_veteran || "180");
      const avgLessonPrice = (price1on1 + priceVeteran) / 2; // Simple average

      // Get cashflow expenses (last 4 weeks)
      const { data: entries } = await supabase
        .from("cashflow_entries")
        .select("amount, category_id, period_start")
        .eq("period_type", "weekly")
        .order("period_start", { ascending: false })
        .limit(50);

      // Get expense categories
      const { data: categories } = await supabase
        .from("cashflow_categories")
        .select("id, type");

      const expenseIds = categories?.filter(c => c.type === "expense" || c.type === "other_expense").map(c => c.id) || [];

      // Calculate weekly expenses from cashflow
      const weeklyExpensesMap = new Map<string, number>();
      entries?.forEach(entry => {
        if (expenseIds.includes(entry.category_id)) {
          const week = entry.period_start;
          weeklyExpensesMap.set(week, (weeklyExpensesMap.get(week) || 0) + Number(entry.amount));
        }
      });

      // Count lessons per week from transcripts
      const lessonsByWeek = new Map<string, number>();
      const uniqueStudents = new Set<string>();

      transcripts?.forEach(t => {
        const date = new Date(t.lesson_date || t.created_at);
        const day = date.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        date.setDate(date.getDate() + diff);
        const weekKey = date.toISOString().split("T")[0];

        lessonsByWeek.set(weekKey, (lessonsByWeek.get(weekKey) || 0) + 1);
        if (t.student_name) uniqueStudents.add(t.student_name);
      });

      // Calculate averages
      const totalLessons = transcripts?.length || 0;
      const weeksWithLessons = lessonsByWeek.size || 1;
      const lessonsPerWeek = totalLessons / weeksWithLessons;

      // Calculate income from lessons (lessons * price)
      const weeklyIncome = lessonsPerWeek * avgLessonPrice;

      // Calculate average weekly expenses
      const expenseValues = Array.from(weeklyExpensesMap.values());
      const avgWeeklyExpenses = expenseValues.length > 0
        ? expenseValues.reduce((a, b) => a + b, 0) / expenseValues.length
        : 0;

      // Trends (comparing this week to last)
      const sortedWeeks = Array.from(lessonsByWeek.entries()).sort((a, b) => b[0].localeCompare(a[0]));
      const thisWeekLessons = sortedWeeks[0]?.[1] || 0;
      const lastWeekLessons = sortedWeeks[1]?.[1] || 1;
      const lessonsTrend = ((thisWeekLessons - lastWeekLessons) / lastWeekLessons) * 100;

      const thisWeekIncome = thisWeekLessons * avgLessonPrice;
      const lastWeekIncome = lastWeekLessons * avgLessonPrice;
      const weeklyTrend = lastWeekIncome > 0
        ? ((thisWeekIncome - lastWeekIncome) / lastWeekIncome) * 100
        : 0;

      return {
        weeklyIncome,
        weeklyExpenses: avgWeeklyExpenses,
        lessonsPerWeek: Math.round(lessonsPerWeek),
        avgPricePerLesson: Math.round(avgLessonPrice),
        studentCount: uniqueStudents.size,
        weeklyTrend: Math.round(weeklyTrend),
        lessonsTrend: Math.round(lessonsTrend),
      };
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
}
