
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';

interface MetricCardProps {
  title: string;
  value: string;
  description: string;
  percentage: number;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, description, percentage, color }) => {
    const data = [{ name: 'metric', value: percentage }];
    return (
    <Card>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between h-32">
            <span className="text-4xl font-bold">{value}</span>
             <div className="w-24 h-24">
                 <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                        innerRadius="70%"
                        outerRadius="85%"
                        data={data}
                        startAngle={90}
                        endAngle={-270}
                        barSize={8}
                    >
                        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                        <RadialBar
                            background={{ fill: 'hsla(var(--muted), 0.3)' }}
                            dataKey="value"
                            cornerRadius={4}
                            fill={color}
                        />
                    </RadialBarChart>
                </ResponsiveContainer>
             </div>
        </CardContent>
    </Card>
    );
};

export default MetricCard;
