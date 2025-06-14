
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Mic, MoveUp, Repeat } from 'lucide-react';

const actionItems = [
  { icon: Repeat, text: 'תרגיל נשימה 3x10 דק׳', color: 'text-voicely-green' },
  { icon: Mic, text: 'להקליט "ma-me-mi-mo-mu"', color: 'text-voicely-orange' },
  { icon: MoveUp, text: 'צפייה בסרטון דיקציה', color: 'text-voicely-purple' },
];

const ActionPlanCard = () => {
  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle className="text-xl">תוכנית הפעולה שלך</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {actionItems.map((item, index) => (
            <li key={index} className="flex items-center">
              <div className={`p-2 rounded-full bg-muted mr-4 ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="flex-grow">{item.text}</span>
              <CheckCircle2 className="w-6 h-6 text-muted-foreground/50 hover:text-voicely-green transition-colors cursor-pointer"/>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default ActionPlanCard;
