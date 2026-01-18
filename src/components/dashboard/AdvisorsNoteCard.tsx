import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, ChevronLeft } from 'lucide-react';

const AdvisorsNoteCard = () => {
  return (
    <Card className="col-span-1 md:col-span-2 playful-shadow-accent overflow-hidden">
      <CardContent className="p-0">
        <div className="bg-gradient-to-l from-voicely-orange/10 to-voicely-coral/5 p-5">
          <div className="flex items-start gap-4">
            <div className="relative">
              <Avatar className="w-14 h-14 border-2 border-voicely-orange/30">
                <AvatarImage src="https://i.pravatar.cc/150?u=inbal" />
                <AvatarFallback className="bg-voicely-orange text-white font-bold">ע</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-voicely-green text-white rounded-full p-1">
                <MessageCircle className="w-3 h-3" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-foreground">ענבל כהן</h3>
                <span className="text-xs text-voicely-orange bg-voicely-orange/10 px-2 py-0.5 rounded-full">
                  המורה שלך
                </span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                שלום! שמתי לב לשיפור משמעותי בנשימה שלך 🎉 
                בואי נתמקד השבוע בדיוק הטונים.
              </p>
            </div>
          </div>
          
          <button className="mt-4 w-full flex items-center justify-center gap-2 text-voicely-orange font-medium text-sm hover:underline">
            <span>לכל ההודעות</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdvisorsNoteCard;
