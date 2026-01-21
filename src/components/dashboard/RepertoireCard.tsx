import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useStudentInsights } from '@/hooks/useStudentInsights';
import { useAuth } from '@/hooks/useAuth';
import { Music, MusicIcon, Play, Sparkles } from 'lucide-react';

interface RepertoireCardProps {
  studentName?: string;
}

// Extract songs from expert insights
function extractSongs(insights: Array<{ raw_ai_response: Record<string, unknown> | null }>): Array<{
  song: string;
  artist?: string;
  style?: string;
  count: number;
}> {
  const songMap: Record<string, { artist?: string; style?: string; count: number }> = {};

  insights.forEach((insight) => {
    const raw = insight.raw_ai_response as {
      repertoire?: Array<{ song: string; artist?: string; style?: string }>;
    } | null;

    if (raw?.repertoire) {
      raw.repertoire.forEach((r) => {
        if (r.song && r.song !== "לא צוין") {
          const key = r.song.toLowerCase();
          if (songMap[key]) {
            songMap[key].count++;
          } else {
            songMap[key] = { artist: r.artist, style: r.style, count: 1 };
          }
        }
      });
    }
  });

  return Object.entries(songMap)
    .map(([song, data]) => ({ song, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

const RepertoireCard = ({ studentName }: RepertoireCardProps) => {
  const { profile } = useAuth();
  const name = studentName || profile?.name || null;
  const { data: insights, isLoading } = useStudentInsights(name);

  const songs = insights ? extractSongs(insights) : [];

  if (isLoading) {
    return (
      <Card className="playful-shadow">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (songs.length === 0) {
    return (
      <Card className="playful-shadow">
        <CardContent className="py-8 text-center">
          <Music className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">עוד אין שירים ברפרטואר</p>
          <p className="text-muted-foreground text-xs mt-1">שירים מהשיעורים יופיעו כאן</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="playful-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <MusicIcon className="w-4 h-4 text-voicely-coral" />
          הרפרטואר שלי
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {songs.map((song, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-gradient-to-br from-muted/50 to-muted/30 border border-muted hover:border-voicely-coral/30 transition-colors"
            >
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-voicely-coral/10 flex items-center justify-center flex-shrink-0">
                  <Play className="w-3.5 h-3.5 text-voicely-coral" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{song.song}</p>
                  {song.artist && (
                    <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1">
                    {song.style && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {song.style}
                      </Badge>
                    )}
                    {song.count > 1 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {song.count}x
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {songs.length > 0 && (
          <div className="mt-4 pt-3 border-t flex items-center justify-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-voicely-green" />
            <span className="text-xs text-muted-foreground">
              {songs.length} שירים נעבדו
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RepertoireCard;
