import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useStudentProgress } from '@/hooks/useStudentInsights';
import { useAuth } from '@/hooks/useAuth';
import {
  TrendingUp,
  Target,
  Music,
  Wind,
  Mic,
  Sparkles,
} from 'lucide-react';

interface SkillsProgressCardProps {
  studentName?: string;
  compact?: boolean;
}

// Map topics to icons
const topicIcons: Record<string, React.ReactNode> = {
  'נשימה': <Wind className="w-4 h-4 text-blue-500" />,
  'נשימה סרעפתית': <Wind className="w-4 h-4 text-blue-500" />,
  'רזוננס': <Mic className="w-4 h-4 text-purple-500" />,
  'טווח': <TrendingUp className="w-4 h-4 text-green-500" />,
  'הרחבת טווח': <TrendingUp className="w-4 h-4 text-green-500" />,
  'ויברטו': <Music className="w-4 h-4 text-pink-500" />,
  'דיקציה': <Target className="w-4 h-4 text-amber-500" />,
};

const getIcon = (topic: string) => {
  for (const [key, icon] of Object.entries(topicIcons)) {
    if (topic.includes(key)) return icon;
  }
  return <Sparkles className="w-4 h-4 text-voicely-green" />;
};

const SkillsProgressCard = ({ studentName, compact = false }: SkillsProgressCardProps) => {
  const { profile } = useAuth();
  const name = studentName || profile?.name || null;
  const { data: progress, isLoading } = useStudentProgress(name);

  if (isLoading) {
    return (
      <Card className="playful-shadow">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-3 w-24 mb-1" />
                <Skeleton className="h-2 w-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!progress || progress.totalLessons === 0) {
    return (
      <Card className="playful-shadow">
        <CardContent className="py-8 text-center">
          <Sparkles className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">עוד אין מספיק שיעורים לניתוח</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate max count for progress bars
  const maxCount = Math.max(...progress.topTopics.map(t => t.count), 1);

  return (
    <Card className="playful-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Target className="w-4 h-4 text-voicely-green" />
            נושאים שעבדנו עליהם
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {progress.totalLessons} שיעורים
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {progress.topTopics.slice(0, compact ? 4 : 6).map((topic, idx) => {
          const percentage = Math.round((topic.count / maxCount) * 100);
          return (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                {getIcon(topic.topic)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate">{topic.topic}</span>
                  <span className="text-xs text-muted-foreground">{topic.count}x</span>
                </div>
                <Progress value={percentage} className="h-1.5" />
              </div>
            </div>
          );
        })}

        {/* Mood Summary */}
        {progress.moodTrend.length > 0 && (
          <div className="pt-3 mt-3 border-t">
            <p className="text-xs text-muted-foreground mb-2">מצב רוח בשיעורים:</p>
            <div className="flex flex-wrap gap-1.5">
              {progress.moodTrend.slice(0, 4).map((mood, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {mood.mood} ({mood.count})
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SkillsProgressCard;
