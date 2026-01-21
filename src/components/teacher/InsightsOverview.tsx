/**
 * InsightsOverview - Teacher dashboard component showing aggregated insights
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  useRecentInsights,
  useSkillsDistribution,
  useTopicsDistribution,
  useAllStudentsProgress,
} from '@/hooks/useStudentInsights';
import {
  BarChart3,
  TrendingUp,
  Users,
  Sparkles,
  Target,
  Music,
  Wind,
  Mic,
  Clock,
  ChevronLeft,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Recent activity card
export function RecentActivityCard() {
  const { data: insights, isLoading } = useRecentInsights(10);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="playful-shadow">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="playful-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-voicely-orange" />
            פעילות אחרונה
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {insights?.length || 0} שיעורים
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {insights?.slice(0, 5).map((insight, idx) => {
          const transcript = (insight as any).transcripts;
          return (
            <div
              key={idx}
              className="p-3 rounded-lg bg-muted/50 hover:bg-muted/70 cursor-pointer transition-colors"
              onClick={() => navigate(`/teacher/student/${transcript?.student_name}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-voicely-green/10 flex items-center justify-center">
                    <span className="text-sm">
                      {transcript?.student_name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{transcript?.student_name || 'תלמיד'}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {insight.key_topics?.slice(0, 2).join(', ')}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    insight.student_mood === 'נלהב' || insight.student_mood === 'מלא מוטיבציה'
                      ? 'border-green-500 text-green-600'
                      : insight.student_mood === 'מתוסכל'
                      ? 'border-red-500 text-red-600'
                      : ''
                  }`}
                >
                  {insight.student_mood || '—'}
                </Badge>
              </div>
            </div>
          );
        })}

        <button className="w-full mt-2 flex items-center justify-center gap-2 text-voicely-orange font-medium text-sm hover:underline">
          <span>לכל הפעילויות</span>
          <ChevronLeft className="w-4 h-4" />
        </button>
      </CardContent>
    </Card>
  );
}

// Top skills distribution card
export function SkillsDistributionCard() {
  const { data: skills, isLoading } = useSkillsDistribution();

  if (isLoading) {
    return (
      <Card className="playful-shadow">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-6 h-6 rounded" />
              <Skeleton className="h-3 flex-1" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...(skills?.map((s) => s.count) || [1]));

  return (
    <Card className="playful-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Target className="w-4 h-4 text-voicely-coral" />
          מיומנויות נפוצות
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {skills?.slice(0, 8).map((skill, idx) => {
          const percentage = Math.round((skill.count / maxCount) * 100);
          return (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded bg-voicely-coral/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-voicely-coral">{idx + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm truncate">{skill.skill}</span>
                  <span className="text-xs text-muted-foreground">{skill.count}</span>
                </div>
                <Progress value={percentage} className="h-1" />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// Top topics distribution card
export function TopicsDistributionCard() {
  const { data: topics, isLoading } = useTopicsDistribution();

  if (isLoading) {
    return (
      <Card className="playful-shadow">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-6 h-6 rounded" />
              <Skeleton className="h-3 flex-1" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...(topics?.map((t) => t.count) || [1]));

  // Icon mapping
  const getIcon = (topic: string) => {
    if (topic.includes('נשימה')) return <Wind className="w-3.5 h-3.5 text-blue-500" />;
    if (topic.includes('רזוננס')) return <Mic className="w-3.5 h-3.5 text-purple-500" />;
    if (topic.includes('טווח')) return <TrendingUp className="w-3.5 h-3.5 text-green-500" />;
    if (topic.includes('ויברטו')) return <Music className="w-3.5 h-3.5 text-pink-500" />;
    return <Sparkles className="w-3.5 h-3.5 text-voicely-green" />;
  };

  return (
    <Card className="playful-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-voicely-green" />
          נושאים נפוצים
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {topics?.slice(0, 8).map((topic, idx) => {
          const percentage = Math.round((topic.count / maxCount) * 100);
          return (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded bg-muted/70 flex items-center justify-center flex-shrink-0">
                {getIcon(topic.topic)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm truncate">{topic.topic}</span>
                  <span className="text-xs text-muted-foreground">{topic.count}</span>
                </div>
                <Progress value={percentage} className="h-1" />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// Students overview card
export function StudentsOverviewCard() {
  const { data: students, isLoading } = useAllStudentsProgress();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="playful-shadow">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="playful-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-voicely-yellow" />
            התלמידים שלי
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {students?.length || 0} תלמידים
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {students?.slice(0, 9).map((student, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg bg-muted/50 hover:bg-muted/70 cursor-pointer transition-colors text-center"
              onClick={() => navigate(`/teacher/student/${student.name}`)}
            >
              <div className="w-10 h-10 mx-auto rounded-full bg-gradient-to-br from-voicely-green/20 to-voicely-orange/20 flex items-center justify-center mb-1">
                <span className="font-medium">{student.name.charAt(0)}</span>
              </div>
              <p className="text-sm font-medium truncate">{student.name}</p>
              <p className="text-xs text-muted-foreground">{student.lessons} שיעורים</p>
            </div>
          ))}
        </div>

        <button
          className="w-full mt-4 flex items-center justify-center gap-2 text-voicely-orange font-medium text-sm hover:underline"
          onClick={() => navigate('/teacher/students')}
        >
          <span>לכל התלמידים</span>
          <ChevronLeft className="w-4 h-4" />
        </button>
      </CardContent>
    </Card>
  );
}

export default {
  RecentActivityCard,
  SkillsDistributionCard,
  TopicsDistributionCard,
  StudentsOverviewCard,
};
