import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Trophy } from 'lucide-react';

interface StarBoxCardProps {
  earnedStars: number;
  totalStars?: number;
  streakDays: number;
}

const StarBoxCard: React.FC<StarBoxCardProps> = ({ 
  earnedStars, 
  totalStars = 5,
  streakDays 
}) => {
  return (
    <Card className="playful-shadow overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-voicely-orange" />
            <h3 className="font-semibold text-foreground">ההישגים שלך</h3>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-voicely-orange bg-voicely-orange/10 px-2 py-1 rounded-full">
            🔥 {streakDays} ימים רצופים
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-2 py-3">
          {Array.from({ length: totalStars }).map((_, index) => (
            <Star
              key={index}
              className={`w-8 h-8 transition-all duration-500 ${
                index < earnedStars 
                  ? 'text-voicely-yellow fill-voicely-yellow scale-110 drop-shadow-md' 
                  : 'text-muted-foreground/30'
              }`}
              style={{
                animationDelay: `${index * 100}ms`
              }}
            />
          ))}
        </div>
        
        <p className="text-center text-sm text-muted-foreground mt-2">
          {earnedStars === totalStars 
            ? '🎉 כל הכוכבים! מדהים!' 
            : `עוד ${totalStars - earnedStars} כוכבים להישג הבא`
          }
        </p>
      </CardContent>
    </Card>
  );
};

export default StarBoxCard;
