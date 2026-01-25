import { TrendingUp, TrendingDown, Minus, Music, Mic2, Wind, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// =====================================================
// WEEKLY PROGRESS CARD
// Shows performance metrics with trends
// =====================================================

interface Metric {
  label: string;
  labelHe: string;
  value: number;
  previousValue?: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface WeeklyProgressCardProps {
  pitchAccuracy?: number;
  rhythmAccuracy?: number;
  breathControl?: number;
  energyLevel?: number;
  previousPitch?: number;
  previousRhythm?: number;
  previousBreath?: number;
  previousEnergy?: number;
  exercisesCompleted?: number;
  exercisesTotal?: number;
  className?: string;
}

export default function WeeklyProgressCard({
  pitchAccuracy = 0,
  rhythmAccuracy = 0,
  breathControl = 0,
  energyLevel = 0,
  previousPitch,
  previousRhythm,
  previousBreath,
  previousEnergy,
  exercisesCompleted = 0,
  exercisesTotal = 21,
  className,
}: WeeklyProgressCardProps) {
  const metrics: Metric[] = [
    {
      label: 'Pitch Accuracy',
      labelHe: 'דיוק צליל',
      value: pitchAccuracy,
      previousValue: previousPitch,
      icon: Mic2,
      color: 'text-purple-500',
    },
    {
      label: 'Rhythm Match',
      labelHe: 'קצב',
      value: rhythmAccuracy,
      previousValue: previousRhythm,
      icon: Music,
      color: 'text-blue-500',
    },
    {
      label: 'Breath Control',
      labelHe: 'נשימה',
      value: breathControl,
      previousValue: previousBreath,
      icon: Wind,
      color: 'text-green-500',
    },
    {
      label: 'Energy Level',
      labelHe: 'אנרגיה',
      value: energyLevel,
      previousValue: previousEnergy,
      icon: Zap,
      color: 'text-orange-500',
    },
  ];

  const completionRate = exercisesTotal > 0
    ? Math.round((exercisesCompleted / exercisesTotal) * 100)
    : 0;

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <span className="text-lg">📊</span>
          ההתקדמות שלך השבוע
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((metric) => (
            <MetricItem key={metric.label} {...metric} />
          ))}
        </div>

        {/* Exercises Progress */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">תרגילים השבוע</span>
            <span className="text-sm font-medium">
              {exercisesCompleted}/{exercisesTotal}
            </span>
          </div>
          <Progress value={completionRate} className="h-2" />
          <p className="text-xs text-gray-500 mt-1">
            {completionRate}% הושלם
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================
// METRIC ITEM
// =====================================================

function MetricItem({ labelHe, value, previousValue, icon: Icon, color }: Metric) {
  const trend = previousValue !== undefined ? value - previousValue : 0;
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-gray-400';

  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn('h-4 w-4', color)} />
        <span className="text-xs text-gray-600">{labelHe}</span>
      </div>

      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-gray-900">
          {value}%
        </span>

        {previousValue !== undefined && (
          <div className={cn('flex items-center gap-0.5 text-xs', trendColor)}>
            <TrendIcon className="h-3 w-3" />
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>

      {/* Mini progress bar */}
      <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', getProgressColor(value))}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// =====================================================
// HELPERS
// =====================================================

function getProgressColor(value: number): string {
  if (value >= 80) return 'bg-green-500';
  if (value >= 60) return 'bg-yellow-500';
  if (value >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}
