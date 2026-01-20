import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Target, Clock, CheckCircle2 } from 'lucide-react';

interface DailyGoalCardProps {
  goalMinutes: number;
  completedMinutes: number;
  tasksCompleted: number;
  totalTasks: number;
}

const DailyGoalCard: React.FC<DailyGoalCardProps> = ({
  goalMinutes,
  completedMinutes,
  tasksCompleted,
  totalTasks,
}) => {
  const progressPercent = Math.min((completedMinutes / goalMinutes) * 100, 100);
  const isGoalComplete = completedMinutes >= goalMinutes;
  const remainingMinutes = Math.max(goalMinutes - completedMinutes, 0);

  // Circle progress calculations
  const circleSize = 120;
  const strokeWidth = 10;
  const radius = (circleSize - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <Card className={`playful-shadow overflow-hidden ${isGoalComplete ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200/50' : ''}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className={`w-5 h-5 ${isGoalComplete ? 'text-green-500' : 'text-voicely-blue'}`} />
            <h3 className="font-semibold text-foreground">יעד יומי</h3>
          </div>
          {isGoalComplete && (
            <div className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
              <CheckCircle2 className="w-3 h-3" />
              <span>הושלם!</span>
            </div>
          )}
        </div>

        {/* Circular Progress */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <svg width={circleSize} height={circleSize} className="-rotate-90">
              {/* Background circle */}
              <circle
                cx={circleSize / 2}
                cy={circleSize / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-muted/20"
              />
              {/* Progress circle */}
              <circle
                cx={circleSize / 2}
                cy={circleSize / 2}
                r={radius}
                fill="none"
                stroke="url(#progressGradient)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-700"
              />
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={isGoalComplete ? '#22c55e' : '#3b82f6'} />
                  <stop offset="100%" stopColor={isGoalComplete ? '#10b981' : '#8b5cf6'} />
                </linearGradient>
              </defs>
            </svg>
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-foreground">{completedMinutes}</span>
              <span className="text-xs text-muted-foreground">מתוך {goalMinutes} דק'</span>
            </div>
          </div>
        </div>

        {/* Time remaining */}
        {!isGoalComplete && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
            <Clock className="w-4 h-4" />
            <span>עוד {remainingMinutes} דקות להשלמת היעד</span>
          </div>
        )}

        {/* Tasks checklist */}
        <div className="space-y-2 pt-3 border-t border-border">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>משימות היום</span>
            <span>{tasksCompleted}/{totalTasks}</span>
          </div>

          <div className="space-y-1.5">
            <TaskItem label="תרגול נשימות" completed={true} xp={10} />
            <TaskItem label="שיעור עם ענבל" completed={true} xp={50} />
            <TaskItem label="הקלטה יומית" completed={false} xp={20} />
            <TaskItem label="תרגיל דיקציה" completed={false} xp={15} />
          </div>
        </div>

        {/* Motivation message */}
        <div className="mt-4 text-center text-sm">
          {isGoalComplete ? (
            <span className="text-green-600 font-medium">🎉 עבודה מצוינת! השלמת את היעד היומי!</span>
          ) : progressPercent >= 50 ? (
            <span className="text-blue-600">💪 יופי! עוד קצת ואת שם!</span>
          ) : (
            <span className="text-muted-foreground">בואי נתחיל את היום עם תרגול קצר</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface TaskItemProps {
  label: string;
  completed: boolean;
  xp: number;
}

const TaskItem: React.FC<TaskItemProps> = ({ label, completed, xp }) => (
  <div className={`flex items-center justify-between p-2 rounded-lg ${completed ? 'bg-green-50 dark:bg-green-900/20' : 'bg-muted/30'}`}>
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${completed ? 'border-green-500 bg-green-500' : 'border-muted-foreground/30'}`}>
        {completed && <CheckCircle2 className="w-3 h-3 text-white" />}
      </div>
      <span className={`text-sm ${completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
        {label}
      </span>
    </div>
    <span className={`text-xs font-medium ${completed ? 'text-green-600' : 'text-muted-foreground'}`}>
      +{xp} XP
    </span>
  </div>
);

export default DailyGoalCard;
