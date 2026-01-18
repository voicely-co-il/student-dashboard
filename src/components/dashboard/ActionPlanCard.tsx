import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Circle, Mic, Wind, PlayCircle, Sparkles } from 'lucide-react';

const initialItems = [
  { id: 1, icon: Wind, text: 'תרגיל נשימה 3×10 דק׳', color: 'hsl(var(--voicely-green))', done: false },
  { id: 2, icon: Mic, text: 'להקליט "ma-me-mi-mo-mu"', color: 'hsl(var(--voicely-orange))', done: false },
  { id: 3, icon: PlayCircle, text: 'צפייה בסרטון דיקציה', color: 'hsl(var(--voicely-coral))', done: true },
];

const ActionPlanCard = () => {
  const [items, setItems] = useState(initialItems);
  const completedCount = items.filter(i => i.done).length;

  const toggleItem = (id: number) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, done: !item.done } : item
    ));
  };

  return (
    <Card className="col-span-1 md:col-span-2 playful-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-voicely-orange" />
            <CardTitle className="text-lg">תוכנית הפעולה שלך</CardTitle>
          </div>
          <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
            {completedCount}/{items.length} הושלמו
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {items.map((item) => (
            <li 
              key={item.id} 
              onClick={() => toggleItem(item.id)}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300 ${
                item.done 
                  ? 'bg-voicely-green/10 opacity-70' 
                  : 'bg-muted/50 hover:bg-muted'
              }`}
            >
              <div 
                className="p-2 rounded-lg transition-colors"
                style={{ backgroundColor: item.done ? 'hsl(var(--voicely-green) / 0.2)' : `${item.color}20` }}
              >
                <item.icon 
                  className="w-5 h-5 transition-colors" 
                  style={{ color: item.done ? 'hsl(var(--voicely-green))' : item.color }} 
                />
              </div>
              <span className={`flex-grow font-medium transition-all ${
                item.done ? 'line-through text-muted-foreground' : 'text-foreground'
              }`}>
                {item.text}
              </span>
              {item.done ? (
                <CheckCircle2 className="w-6 h-6 text-voicely-green animate-scale-in" />
              ) : (
                <Circle className="w-6 h-6 text-muted-foreground/40" />
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default ActionPlanCard;
