import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Search,
  Code,
  FlaskConical,
  Rocket,
  Clock,
  ArrowLeft,
  GripVertical,
} from 'lucide-react';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { he } from 'date-fns/locale';

export interface KanbanFeature {
  id: string;
  name: string;
  description: string;
  icon?: React.ReactNode;
  stage: 'research' | 'development' | 'beta' | 'live';
  progress: number;
  startedAt: Date;
  tags?: string[];
  isHot?: boolean;
  onOpen?: () => void;
}

interface FeatureKanbanProps {
  features: KanbanFeature[];
  onFeatureClick?: (feature: KanbanFeature) => void;
}

const stages = [
  { id: 'research', label: 'מחקר', icon: Search, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { id: 'development', label: 'בפיתוח', icon: Code, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  { id: 'beta', label: 'בטא', icon: FlaskConical, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  { id: 'live', label: 'פעיל', icon: Rocket, color: 'text-green-500', bgColor: 'bg-green-500/10' },
] as const;

function FeatureCard({ feature, onClick }: { feature: KanbanFeature; onClick?: () => void }) {
  const daysInProgress = differenceInDays(new Date(), feature.startedAt);

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-all group ${
        feature.isHot ? 'border-amber-500/50 bg-gradient-to-br from-amber-500/5 to-transparent' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2 mb-2">
          {feature.icon && (
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              {feature.icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-1">
              {feature.isHot && (
                <span className="text-orange-500 text-xs">🔥</span>
              )}
              <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                {feature.name}
              </h4>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {feature.description}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-2">
          <Progress value={feature.progress} className="h-1" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{daysInProgress} ימים</span>
          </div>
          <span>{feature.progress}%</span>
        </div>

        {/* Tags */}
        {feature.tags && feature.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {feature.tags.slice(0, 2).map(tag => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function FeatureKanban({ features, onFeatureClick }: FeatureKanbanProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stages.map(stage => {
        const stageFeatures = features.filter(f => f.stage === stage.id);
        const StageIcon = stage.icon;

        return (
          <div key={stage.id} className="space-y-3">
            {/* Column Header */}
            <div className={`flex items-center gap-2 p-3 rounded-lg ${stage.bgColor}`}>
              <StageIcon className={`w-4 h-4 ${stage.color}`} />
              <span className={`font-medium text-sm ${stage.color}`}>{stage.label}</span>
              <Badge variant="secondary" className="mr-auto text-xs">
                {stageFeatures.length}
              </Badge>
            </div>

            {/* Cards */}
            <div className="space-y-2 min-h-[200px]">
              {stageFeatures.length > 0 ? (
                stageFeatures.map(feature => (
                  <FeatureCard
                    key={feature.id}
                    feature={feature}
                    onClick={() => onFeatureClick?.(feature)}
                  />
                ))
              ) : (
                <div className="h-[100px] border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground text-xs">
                  אין פיצ'רים
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
