
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';

interface VoiceScoreCardProps {
  score: number;
}

const VoiceScoreCard: React.FC<VoiceScoreCardProps> = ({ score }) => {
  const data = [{ name: 'score', value: score }];
  
  const scoreColor = score > 75 ? 'hsl(var(--voicely-green))' : score > 50 ? 'hsl(var(--voicely-yellow))' : 'hsl(var(--voicely-red))';

  return (
    <Card className="col-span-1 md:col-span-2 bg-gradient-to-br from-card to-secondary/20">
      <CardHeader>
        <CardTitle className="text-xl">ציון קולי (VOICE SCORE)</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center h-64">
        <div className="relative w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="70%"
              outerRadius="90%"
              data={data}
              startAngle={90}
              endAngle={-270}
              barSize={20}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar
                background={{ fill: 'hsla(var(--muted), 0.3)' }}
                dataKey="value"
                cornerRadius={10}
                fill={scoreColor}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold" style={{ color: scoreColor }}>{score}</span>
            <span className="text-muted-foreground mt-1">מתוך 100</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceScoreCard;
