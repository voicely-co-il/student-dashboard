import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  ArrowRight,
  FileText,
  Calendar,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';

interface Transcript {
  id: string;
  title: string;
  lesson_date: string | null;
  word_count: number | null;
  full_text: string | null;
  gdrive_file_id: string | null;
}

const StudentDetail = () => {
  const { studentName } = useParams<{ studentName: string }>();
  const navigate = useNavigate();
  const [expandedTranscript, setExpandedTranscript] = useState<string | null>(null);
  const [selectedTranscript, setSelectedTranscript] = useState<Transcript | null>(null);

  const decodedName = decodeURIComponent(studentName || '');

  // Fetch student's transcripts
  const { data: transcripts, isLoading } = useQuery({
    queryKey: ['student-transcripts', decodedName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transcripts')
        .select('id, title, lesson_date, word_count, full_text, gdrive_file_id')
        .eq('student_name', decodedName)
        .order('lesson_date', { ascending: false });

      if (error) throw error;
      return data as Transcript[];
    },
    enabled: !!decodedName,
  });

  // Calculate stats
  const stats = {
    totalLessons: transcripts?.length || 0,
    totalWords: transcripts?.reduce((sum, t) => sum + (t.word_count || 0), 0) || 0,
    firstLesson: transcripts?.length
      ? transcripts[transcripts.length - 1].lesson_date
      : null,
    lastLesson: transcripts?.length ? transcripts[0].lesson_date : null,
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('he-IL', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatShortDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('he-IL', {
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return name.slice(0, 2);
  };

  // Group transcripts by month
  const groupedTranscripts = transcripts?.reduce((groups, t) => {
    const monthKey = t.lesson_date
      ? new Date(t.lesson_date).toLocaleDateString('he-IL', {
          month: 'long',
          year: 'numeric',
        })
      : 'ללא תאריך';

    if (!groups[monthKey]) {
      groups[monthKey] = [];
    }
    groups[monthKey].push(t);
    return groups;
  }, {} as Record<string, Transcript[]>);

  const openInDrive = (fileId: string | null) => {
    if (fileId) {
      window.open(`https://docs.google.com/document/d/${fileId}`, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="p-4 pt-6 border-b bg-gradient-to-l from-voicely-green/10 to-transparent">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/teacher/students')}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>

          <Avatar className="h-16 w-16 bg-gradient-to-br from-voicely-green to-voicely-coral">
            <AvatarFallback className="text-white text-xl font-bold">
              {getInitials(decodedName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h1 className="text-2xl font-bold">{decodedName}</h1>
            <p className="text-muted-foreground text-sm">
              {stats.totalLessons} שיעורים מתומללים
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <Card className="bg-white/80">
            <CardContent className="p-3 text-center">
              <FileText className="h-5 w-5 mx-auto text-voicely-green mb-1" />
              <p className="text-xl font-bold">{stats.totalLessons}</p>
              <p className="text-xs text-muted-foreground">תמלולים</p>
            </CardContent>
          </Card>
          <Card className="bg-white/80">
            <CardContent className="p-3 text-center">
              <Clock className="h-5 w-5 mx-auto text-voicely-orange mb-1" />
              <p className="text-xl font-bold">
                {Math.round(stats.totalWords / 150)}
              </p>
              <p className="text-xs text-muted-foreground">דקות (משוער)</p>
            </CardContent>
          </Card>
          <Card className="bg-white/80">
            <CardContent className="p-3 text-center">
              <Calendar className="h-5 w-5 mx-auto text-voicely-coral mb-1" />
              <p className="text-lg font-bold">{formatShortDate(stats.firstLesson)}</p>
              <p className="text-xs text-muted-foreground">שיעור ראשון</p>
            </CardContent>
          </Card>
          <Card className="bg-white/80">
            <CardContent className="p-3 text-center">
              <Calendar className="h-5 w-5 mx-auto text-purple-500 mb-1" />
              <p className="text-lg font-bold">{formatShortDate(stats.lastLesson)}</p>
              <p className="text-xs text-muted-foreground">שיעור אחרון</p>
            </CardContent>
          </Card>
        </div>
      </header>

      {/* Transcripts List */}
      <main className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !transcripts?.length ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>אין תמלולים עבור תלמיד זה</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedTranscripts || {}).map(([month, items]) => (
              <div key={month}>
                <h2 className="text-lg font-semibold mb-3 text-muted-foreground">
                  {month}
                </h2>
                <div className="space-y-2">
                  {items.map((transcript) => (
                    <Card
                      key={transcript.id}
                      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-4">
                        <div
                          className="flex items-center gap-3"
                          onClick={() =>
                            setExpandedTranscript(
                              expandedTranscript === transcript.id
                                ? null
                                : transcript.id
                            )
                          }
                        >
                          <div className="w-10 h-10 rounded-full bg-voicely-green/10 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-voicely-green" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">
                              {transcript.title?.replace('Transcript: ', '') ||
                                'שיעור'}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(transcript.lesson_date)}
                              {transcript.word_count && (
                                <span className="ms-2">
                                  • {transcript.word_count.toLocaleString()} מילים
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {transcript.gdrive_file_id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openInDrive(transcript.gdrive_file_id);
                                }}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                            {expandedTranscript === transcript.id ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {/* Expanded Content */}
                        {expandedTranscript === transcript.id && (
                          <div className="mt-4 pt-4 border-t">
                            <ScrollArea className="h-[300px] rounded-lg bg-muted/30 p-4">
                              <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                                {transcript.full_text?.slice(0, 3000) ||
                                  'אין תוכן זמין'}
                                {(transcript.full_text?.length || 0) > 3000 && (
                                  <span className="text-muted-foreground">
                                    {'\n\n'}... ({((transcript.full_text?.length || 0) - 3000).toLocaleString()} תווים נוספים)
                                  </span>
                                )}
                              </pre>
                            </ScrollArea>
                            <div className="flex gap-2 mt-3">
                              <Sheet>
                                <SheetTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedTranscript(transcript)}
                                  >
                                    קרא הכל
                                  </Button>
                                </SheetTrigger>
                                <SheetContent side="bottom" className="h-[80vh]">
                                  <SheetHeader>
                                    <SheetTitle>
                                      {transcript.title?.replace('Transcript: ', '')}
                                    </SheetTitle>
                                  </SheetHeader>
                                  <ScrollArea className="h-full mt-4">
                                    <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed p-4">
                                      {transcript.full_text || 'אין תוכן זמין'}
                                    </pre>
                                  </ScrollArea>
                                </SheetContent>
                              </Sheet>
                              {transcript.gdrive_file_id && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openInDrive(transcript.gdrive_file_id)}
                                >
                                  <ExternalLink className="h-4 w-4 ms-2" />
                                  פתח ב-Google Docs
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentDetail;
