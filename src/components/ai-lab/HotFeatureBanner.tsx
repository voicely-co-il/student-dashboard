import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Flame,
  Clock,
  ArrowLeft,
  Zap,
  Users,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { he } from 'date-fns/locale';

export interface HotFeature {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  stage: 'research' | 'development' | 'beta' | 'live';
  progress: number; // 0-100
  startedAt: Date;
  targetDate?: Date;
  assignees?: string[];
  tags?: string[];
  onOpen?: () => void;
}

interface HotFeatureBannerProps {
  feature: HotFeature;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

const stageConfig = {
  research: { label: 'מחקר', color: 'bg-blue-500', textColor: 'text-blue-500' },
  development: { label: 'בפיתוח', color: 'bg-amber-500', textColor: 'text-amber-500' },
  beta: { label: 'בטא', color: 'bg-purple-500', textColor: 'text-purple-500' },
  live: { label: 'פעיל', color: 'bg-green-500', textColor: 'text-green-500' },
};

export function HotFeatureBanner({ feature, expanded = false, onToggleExpand }: HotFeatureBannerProps) {
  const stage = stageConfig[feature.stage];
  const daysInProgress = differenceInDays(new Date(), feature.startedAt);
  const daysLeft = feature.targetDate
    ? differenceInDays(feature.targetDate, new Date())
    : null;

  return (
    <Card className="relative overflow-hidden border-2 border-amber-500/30 bg-gradient-to-l from-amber-500/5 via-transparent to-transparent">
      {/* Hot indicator */}
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-500 via-orange-500 to-red-500" />

      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Icon & Title */}
          <div className="flex items-center gap-4 flex-1">
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                {feature.icon}
              </div>
              <Flame className="absolute -top-1 -right-1 w-5 h-5 text-orange-500 animate-pulse" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge className={`${stage.color} text-white`}>
                  <Zap className="w-3 h-3 ml-1" />
                  {stage.label}
                </Badge>
                {feature.tags?.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              <h3 className="text-lg sm:text-xl font-bold truncate">{feature.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {feature.description}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {daysInProgress} ימים בפיתוח
              </span>
            </div>

            {daysLeft !== null && daysLeft > 0 && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {daysLeft} ימים לסיום
                </span>
              </div>
            )}

            {feature.assignees && feature.assignees.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {feature.assignees.join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {feature.onOpen && (
              <Button onClick={feature.onOpen} className="gap-2">
                פתח
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            {onToggleExpand && (
              <Button variant="ghost" size="icon" onClick={onToggleExpand}>
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>התקדמות</span>
            <span>{feature.progress}%</span>
          </div>
          <Progress value={feature.progress} className="h-2" />
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground block mb-1">התחיל</span>
                <span className="font-medium">
                  {formatDistanceToNow(feature.startedAt, { addSuffix: true, locale: he })}
                </span>
              </div>
              {feature.targetDate && (
                <div>
                  <span className="text-muted-foreground block mb-1">יעד</span>
                  <span className="font-medium">
                    {formatDistanceToNow(feature.targetDate, { addSuffix: true, locale: he })}
                  </span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground block mb-1">שלב</span>
                <span className={`font-medium ${stage.textColor}`}>{stage.label}</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">סטטוס</span>
                <span className="font-medium text-green-500">פעיל</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
