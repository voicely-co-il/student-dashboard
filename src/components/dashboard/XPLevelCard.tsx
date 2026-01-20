import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, TrendingUp } from 'lucide-react';

interface XPLevelCardProps {
  currentXP: number;
  level: number;
  levelName: string;
  xpToNextLevel: number;
}

// Level thresholds and names
const LEVELS = [
  { level: 1, name: 'מתחיל', minXP: 0, color: 'from-gray-400 to-gray-500' },
  { level: 2, name: 'חובב', minXP: 100, color: 'from-green-400 to-green-500' },
  { level: 3, name: 'מתקדם', minXP: 300, color: 'from-blue-400 to-blue-500' },
  { level: 4, name: 'מיומן', minXP: 600, color: 'from-purple-400 to-purple-500' },
  { level: 5, name: 'מומחה', minXP: 1000, color: 'from-orange-400 to-orange-500' },
  { level: 6, name: 'אמן', minXP: 1500, color: 'from-pink-400 to-pink-500' },
  { level: 7, name: 'וירטואוז', minXP: 2500, color: 'from-yellow-400 to-yellow-500' },
];

const XPLevelCard: React.FC<XPLevelCardProps> = ({
  currentXP,
  level,
  levelName,
  xpToNextLevel,
}) => {
  const currentLevelData = LEVELS.find(l => l.level === level) || LEVELS[0];
  const nextLevelData = LEVELS.find(l => l.level === level + 1);

  const xpInCurrentLevel = nextLevelData
    ? currentXP - currentLevelData.minXP
    : currentXP;
  const xpNeededForLevel = nextLevelData
    ? nextLevelData.minXP - currentLevelData.minXP
    : 1000;
  const progressPercent = Math.min((xpInCurrentLevel / xpNeededForLevel) * 100, 100);

  return (
    <Card className="playful-shadow overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <h3 className="font-semibold text-foreground">רמה והתקדמות</h3>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
            <TrendingUp className="w-3 h-3" />
            <span>+45 XP היום</span>
          </div>
        </div>

        {/* Level Badge */}
        <div className="flex items-center justify-center mb-4">
          <div className={`relative w-20 h-20 rounded-full bg-gradient-to-br ${currentLevelData.color} flex items-center justify-center shadow-lg`}>
            <div className="absolute inset-1 rounded-full bg-background flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{level}</div>
                <div className="text-[10px] text-muted-foreground">{levelName}</div>
              </div>
            </div>
          </div>
        </div>

        {/* XP Display */}
        <div className="text-center mb-3">
          <span className="text-3xl font-bold text-foreground">{currentXP.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground mr-1">XP</span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>רמה {level}</span>
            {nextLevelData && <span>רמה {level + 1}</span>}
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${currentLevelData.color} rounded-full transition-all duration-700 relative`}
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>
          <div className="text-center text-xs text-muted-foreground">
            {nextLevelData ? (
              <span>עוד {xpToNextLevel.toLocaleString()} XP לרמה הבאה</span>
            ) : (
              <span>🏆 הגעת לרמה המקסימלית!</span>
            )}
          </div>
        </div>

        {/* Recent XP Gains */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground mb-2">פעילות אחרונה</div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-foreground">תרגול יומי</span>
              <span className="text-green-600 font-medium">+10 XP</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-foreground">השלמת שיעור</span>
              <span className="text-green-600 font-medium">+50 XP</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-foreground">העלאת הקלטה</span>
              <span className="text-green-600 font-medium">+20 XP</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default XPLevelCard;
