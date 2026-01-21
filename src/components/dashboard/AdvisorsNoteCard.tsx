import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, ChevronLeft, Loader2, Sparkles } from 'lucide-react';
import { useStudentInsights } from '@/hooks/useStudentInsights';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

interface AdvisorsNoteCardProps {
  studentName?: string;
}

const AdvisorsNoteCard = ({ studentName }: AdvisorsNoteCardProps) => {
  const { profile } = useAuth();
  const name = studentName || profile?.name || null;
  const { data: insights, isLoading } = useStudentInsights(name);

  // Get the most recent insight with a recommendation
  const latestInsight = insights?.find(
    (i) => i.teacher_recommendations && i.teacher_recommendations !== "לא צוין"
  );

  // Get recent action items
  const recentActions = insights
    ?.flatMap((i) => i.action_items || [])
    .filter((a) => a && a !== "לא צוין")
    .slice(0, 3);

  if (isLoading) {
    return (
      <Card className="col-span-1 md:col-span-2 playful-shadow-accent overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <Skeleton className="w-14 h-14 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

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

              {latestInsight ? (
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {latestInsight.teacher_recommendations}
                </p>
              ) : (
                <p className="text-muted-foreground text-sm leading-relaxed">
                  שלום! ממתינה לראות אותך בשיעור הבא 🎵
                </p>
              )}

              {/* Action Items */}
              {recentActions && recentActions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-voicely-orange/20">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-voicely-orange" />
                    <span className="text-xs font-medium text-voicely-orange">לתרגול בבית:</span>
                  </div>
                  <ul className="space-y-1">
                    {recentActions.map((action, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-voicely-green">•</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <button className="mt-4 w-full flex items-center justify-center gap-2 text-voicely-orange font-medium text-sm hover:underline">
            <span>לכל ההמלצות</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdvisorsNoteCard;
