import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  description: string;
  percentage: number;
  color: string;
  icon: LucideIcon;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  description, 
  percentage, 
  color,
  icon: Icon 
}) => {
  const data = [{ name: 'metric', value: percentage }];
  
  return (
    <Card className="playful-shadow hover:scale-[1.02] transition-transform duration-300 cursor-pointer">
      <CardContent className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div 
            className="p-2.5 rounded-xl"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-3xl font-bold text-foreground">{value}</span>
          <div className="w-16 h-16">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="65%"
                outerRadius="100%"
                data={data}
                startAngle={90}
                endAngle={-270}
                barSize={6}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar
                  background={{ fill: 'hsl(var(--muted))' }}
                  dataKey="value"
                  cornerRadius={6}
                  fill={color}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricCard;
