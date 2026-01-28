import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  ArrowLeft,
} from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';
import { he } from 'date-fns/locale';

export interface TimelineFeature {
  id: string;
  name: string;
  stage: 'research' | 'development' | 'beta' | 'live';
  startedAt: Date;
  targetDate?: Date;
  milestones?: {
    name: string;
    date: Date;
    completed: boolean;
  }[];
  isHot?: boolean;
}

interface FeatureTimelineProps {
  features: TimelineFeature[];
}

const stageColors = {
  research: 'bg-blue-500',
  development: 'bg-amber-500',
  beta: 'bg-purple-500',
  live: 'bg-green-500',
};

const stageLabels = {
  research: 'מחקר',
  development: 'בפיתוח',
  beta: 'בטא',
  live: 'פעיל',
};

export function FeatureTimeline({ features }: FeatureTimelineProps) {
  const today = new Date();

  // Sort features by startedAt
  const sortedFeatures = [...features].sort(
    (a, b) => a.startedAt.getTime() - b.startedAt.getTime()
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="w-4 h-4" />
          ציר זמן פיתוח
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute right-4 top-0 bottom-0 w-0.5 bg-muted" />

          {/* Timeline items */}
          <div className="space-y-6">
            {sortedFeatures.map((feature, index) => {
              const daysInProgress = differenceInDays(today, feature.startedAt);
              const isCompleted = feature.stage === 'live';
              const daysToTarget = feature.targetDate
                ? differenceInDays(feature.targetDate, today)
                : null;

              return (
                <div key={feature.id} className="relative pr-10">
                  {/* Timeline dot */}
                  <div
                    className={`absolute right-2.5 w-3 h-3 rounded-full border-2 border-background ${
                      isCompleted ? 'bg-green-500' : stageColors[feature.stage]
                    }`}
                  />

                  {/* Content */}
                  <div className={`p-3 rounded-lg border ${
                    feature.isHot ? 'border-amber-500/50 bg-amber-500/5' : 'bg-muted/30'
                  }`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          {feature.isHot && <span>🔥</span>}
                          <h4 className="font-medium text-sm">{feature.name}</h4>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Badge variant="secondary" className={`${stageColors[feature.stage]} text-white text-[10px]`}>
                            {stageLabels[feature.stage]}
                          </Badge>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {daysInProgress} ימים
                          </span>
                        </div>
                      </div>

                      {daysToTarget !== null && (
                        <div className="text-left text-xs">
                          <span className="text-muted-foreground">יעד:</span>
                          <div className={`font-medium ${daysToTarget < 7 ? 'text-red-500' : 'text-muted-foreground'}`}>
                            {daysToTarget > 0 ? `${daysToTarget} ימים` : 'היום!'}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Milestones */}
                    {feature.milestones && feature.milestones.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-muted space-y-1">
                        {feature.milestones.map((milestone, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            {milestone.completed ? (
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                            ) : (
                              <Circle className="w-3 h-3 text-muted-foreground" />
                            )}
                            <span className={milestone.completed ? 'line-through text-muted-foreground' : ''}>
                              {milestone.name}
                            </span>
                            <span className="text-muted-foreground mr-auto">
                              {format(milestone.date, 'd/M', { locale: he })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Date range */}
                    <div className="mt-2 text-[10px] text-muted-foreground">
                      התחיל: {format(feature.startedAt, 'd MMMM yyyy', { locale: he })}
                      {feature.targetDate && (
                        <> • יעד: {format(feature.targetDate, 'd MMMM yyyy', { locale: he })}</>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
