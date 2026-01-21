/**
 * Hook for fetching student insights from transcript analysis
 * Used in student and teacher dashboards
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TranscriptInsight {
  id: string;
  transcript_id: string;
  key_topics: string[];
  skills_practiced: string[];
  student_mood: string;
  progress_notes: string;
  teacher_recommendations: string;
  action_items: string[];
  raw_ai_response: Record<string, unknown> | null;
  created_at: string;
}

export interface StudentProgress {
  totalLessons: number;
  recentLessons: number; // Last 30 days
  topTopics: Array<{ topic: string; count: number }>;
  topSkills: Array<{ skill: string; count: number }>;
  moodTrend: Array<{ mood: string; count: number }>;
  recentRecommendations: string[];
  actionItems: string[];
  averageLessonsPerWeek: number;
}

// Fetch insights for a specific student
export function useStudentInsights(studentName: string | null) {
  return useQuery({
    queryKey: ["student-insights", studentName],
    queryFn: async (): Promise<TranscriptInsight[]> => {
      if (!studentName) return [];

      const { data, error } = await supabase
        .from("transcript_insights")
        .select(`
          *,
          transcripts!inner(student_name, lesson_date, title)
        `)
        .eq("transcripts.student_name", studentName)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data as unknown as TranscriptInsight[]) || [];
    },
    enabled: !!studentName,
  });
}

// Fetch aggregated progress data for a student
export function useStudentProgress(studentName: string | null) {
  return useQuery({
    queryKey: ["student-progress", studentName],
    queryFn: async (): Promise<StudentProgress | null> => {
      if (!studentName) return null;

      // Get all insights for this student
      const { data: insights, error } = await supabase
        .from("transcript_insights")
        .select(`
          key_topics,
          skills_practiced,
          student_mood,
          teacher_recommendations,
          action_items,
          created_at,
          transcripts!inner(student_name, lesson_date)
        `)
        .eq("transcripts.student_name", studentName);

      if (error) throw error;
      if (!insights || insights.length === 0) return null;

      // Count topics
      const topicCounts: Record<string, number> = {};
      const skillCounts: Record<string, number> = {};
      const moodCounts: Record<string, number> = {};
      const recommendations: string[] = [];
      const actions: string[] = [];

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      let recentCount = 0;

      insights.forEach((insight) => {
        // Count recent lessons
        if (new Date(insight.created_at) > thirtyDaysAgo) {
          recentCount++;
        }

        // Aggregate topics
        (insight.key_topics || []).forEach((topic: string) => {
          if (topic && topic !== "לא צוין") {
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
          }
        });

        // Aggregate skills
        (insight.skills_practiced || []).forEach((skill: string) => {
          if (skill && skill !== "לא צוין") {
            skillCounts[skill] = (skillCounts[skill] || 0) + 1;
          }
        });

        // Aggregate moods
        if (insight.student_mood && insight.student_mood !== "לא צוין") {
          moodCounts[insight.student_mood] = (moodCounts[insight.student_mood] || 0) + 1;
        }

        // Collect recommendations (last 5)
        if (insight.teacher_recommendations && insight.teacher_recommendations !== "לא צוין") {
          recommendations.push(insight.teacher_recommendations);
        }

        // Collect action items (last 10)
        (insight.action_items || []).forEach((action: string) => {
          if (action && actions.length < 10) {
            actions.push(action);
          }
        });
      });

      // Sort and format
      const sortedTopics = Object.entries(topicCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([topic, count]) => ({ topic, count }));

      const sortedSkills = Object.entries(skillCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([skill, count]) => ({ skill, count }));

      const sortedMoods = Object.entries(moodCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([mood, count]) => ({ mood, count }));

      // Calculate average lessons per week
      const firstLesson = new Date(insights[insights.length - 1]?.created_at || new Date());
      const weeksSinceStart = Math.max(1, Math.ceil((Date.now() - firstLesson.getTime()) / (7 * 24 * 60 * 60 * 1000)));
      const avgPerWeek = insights.length / weeksSinceStart;

      return {
        totalLessons: insights.length,
        recentLessons: recentCount,
        topTopics: sortedTopics,
        topSkills: sortedSkills,
        moodTrend: sortedMoods,
        recentRecommendations: recommendations.slice(0, 5),
        actionItems: actions,
        averageLessonsPerWeek: Math.round(avgPerWeek * 10) / 10,
      };
    },
    enabled: !!studentName,
  });
}

// Fetch all students with their lesson counts
export function useAllStudentsProgress() {
  return useQuery({
    queryKey: ["all-students-progress"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transcripts")
        .select("student_name")
        .not("student_name", "is", null);

      if (error) throw error;

      // Count lessons per student
      const studentCounts: Record<string, number> = {};
      (data || []).forEach((t) => {
        if (t.student_name) {
          studentCounts[t.student_name] = (studentCounts[t.student_name] || 0) + 1;
        }
      });

      // Sort by lesson count
      return Object.entries(studentCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, lessons]) => ({ name, lessons }));
    },
  });
}

// Fetch recent insights across all students (for teacher dashboard)
export function useRecentInsights(limit = 20) {
  return useQuery({
    queryKey: ["recent-insights", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transcript_insights")
        .select(`
          id,
          key_topics,
          skills_practiced,
          student_mood,
          progress_notes,
          created_at,
          transcripts!inner(student_name, title, lesson_date)
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch skill distribution across all students
export function useSkillsDistribution() {
  return useQuery({
    queryKey: ["skills-distribution"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transcript_insights")
        .select("skills_practiced");

      if (error) throw error;

      const skillCounts: Record<string, number> = {};
      (data || []).forEach((insight) => {
        (insight.skills_practiced || []).forEach((skill: string) => {
          if (skill && skill !== "לא צוין") {
            skillCounts[skill] = (skillCounts[skill] || 0) + 1;
          }
        });
      });

      return Object.entries(skillCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([skill, count]) => ({ skill, count }));
    },
  });
}

// Fetch topics distribution
export function useTopicsDistribution() {
  return useQuery({
    queryKey: ["topics-distribution"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transcript_insights")
        .select("key_topics");

      if (error) throw error;

      const topicCounts: Record<string, number> = {};
      (data || []).forEach((insight) => {
        (insight.key_topics || []).forEach((topic: string) => {
          if (topic && topic !== "לא צוין") {
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
          }
        });
      });

      return Object.entries(topicCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([topic, count]) => ({ topic, count }));
    },
  });
}
