import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { TrendingUp, Sparkles } from 'lucide-react';

interface VoiceScoreCardProps {
  score: number;
}

const VoiceScoreCard: React.FC<VoiceScoreCardProps> = ({ score }) => {
  const data = [{ name: 'score', value: score }];
  
  const getScoreColor = () => {
    if (score > 75) return 'hsl(var(--voicely-green))';
    if (score > 50) return 'hsl(var(--voicely-yellow))';
    return 'hsl(var(--voicely-red))';
  };

  const getScoreLabel = () => {
    if (score > 85) return 'מעולה! 🌟';
    if (score > 75) return 'יופי! 👏';
    if (score > 50) return 'בדרך הנכונה 💪';
    return 'בואי נתרגל 🎯';
  };

  return (
    <Card className="col-span-1 md:col-span-2 overflow-hidden playful-shadow bg-gradient-to-br from-card via-card to-secondary/30">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-voicely-orange" />
            <h3 className="text-lg font-semibold text-foreground">VOICE SCORE</h3>
          </div>
          <div className="flex items-center gap-1 text-voicely-green text-sm font-medium bg-voicely-green/10 px-3 py-1 rounded-full">
            <TrendingUp className="w-4 h-4" />
            <span>+5 מהשבוע שעבר</span>
          </div>
        </div>
        
        <div className="flex items-center justify-center h-52">
          <div className="relative w-full max-w-[220px] h-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="72%"
                outerRadius="100%"
                data={data}
                startAngle={90}
                endAngle={-270}
                barSize={16}
              >
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--voicely-green))" />
                    <stop offset="100%" stopColor="hsl(var(--voicely-mint))" />
                  </linearGradient>
                </defs>
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar
                  background={{ fill: 'hsl(var(--muted))' }}
                  dataKey="value"
                  cornerRadius={12}
                  fill="url(#scoreGradient)"
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span 
                className="text-5xl font-bold"
                style={{ color: getScoreColor() }}
              >
                {score}
              </span>
              <span className="text-muted-foreground text-sm mt-1">מתוך 100</span>
              <span className="text-foreground font-medium text-sm mt-2">{getScoreLabel()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceScoreCard;
