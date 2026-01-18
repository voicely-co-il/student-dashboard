import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Smile, Meh, Frown, AlertCircle } from 'lucide-react';

interface VoiceComfortCardProps {
  level: 1 | 2 | 3 | 4 | 5; // 1 = excellent, 5 = very tired
}

const comfortLevels = [
  { level: 1, icon: Smile, label: 'מצוין', color: 'hsl(var(--voicely-green))', bg: 'bg-voicely-green/10' },
  { level: 2, icon: Smile, label: 'טוב', color: 'hsl(var(--voicely-mint))', bg: 'bg-voicely-mint/10' },
  { level: 3, icon: Meh, label: 'בסדר', color: 'hsl(var(--voicely-yellow))', bg: 'bg-voicely-yellow/10' },
  { level: 4, icon: Frown, label: 'עייף', color: 'hsl(var(--voicely-orange))', bg: 'bg-voicely-orange/10' },
  { level: 5, icon: AlertCircle, label: 'צרוד', color: 'hsl(var(--voicely-red))', bg: 'bg-voicely-red/10' },
];

const VoiceComfortCard: React.FC<VoiceComfortCardProps> = ({ level }) => {
  const currentLevel = comfortLevels.find(l => l.level === level) || comfortLevels[2];
  const Icon = currentLevel.icon;

  return (
    <Card className="playful-shadow">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Icon className="w-5 h-5" style={{ color: currentLevel.color }} />
          <h3 className="font-semibold text-foreground">נוחות קולית</h3>
        </div>
        
        <div className="flex items-center gap-1.5 mb-3">
          {comfortLevels.map((l) => (
            <div
              key={l.level}
              className={`flex-1 h-3 rounded-full transition-all duration-300 ${
                l.level <= level 
                  ? '' 
                  : 'bg-muted'
              }`}
              style={{
                backgroundColor: l.level <= level ? l.color : undefined,
                opacity: l.level === level ? 1 : l.level < level ? 0.5 : undefined
              }}
            />
          ))}
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">מצב הקול:</span>
          <span 
            className={`font-medium px-2 py-0.5 rounded-full ${currentLevel.bg}`}
            style={{ color: currentLevel.color }}
          >
            {currentLevel.label}
          </span>
        </div>
        
        {level >= 4 && (
          <div className="mt-3 p-2 bg-voicely-orange/10 rounded-lg text-xs text-voicely-orange flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>מומלץ לנוח ולשתות מים</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VoiceComfortCard;
