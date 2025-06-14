
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const AdvisorsNoteCard = () => {
  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader className="flex flex-row items-start space-x-4 space-x-reverse">
        <Avatar className="w-12 h-12">
            <AvatarImage src="https://i.pravatar.cc/150?u=inbal" />
            <AvatarFallback>IC</AvatarFallback>
        </Avatar>
        <div>
            <CardTitle className="text-lg">הערה מהיועצת שלך</CardTitle>
            <CardDescription>ענבל כהן, 14 ביוני 2025</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
        שלום! זיהיתי כמה נקודות ספציפיות לשיפור הגוון והביצועים הקוליים שלך. אל תהסס/י לקבוע שיחת ייעוץ אם תרצה/י לדבר על זה.
        </p>
      </CardContent>
    </Card>
  );
};

export default AdvisorsNoteCard;
