import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Target,
  Music,
  TrendingUp,
  Wind,
  Mic,
  Sparkles,
  Heart,
  CheckCircle2,
} from 'lucide-react';
import { useStudentInsights, useStudentProgress } from '@/hooks/useStudentInsights';

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

  // Fetch insights and progress
  const { data: insights, isLoading: insightsLoading } = useStudentInsights(decodedName);
  const { data: progress, isLoading: progressLoading } = useStudentProgress(decodedName);

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

  // Icon mapping for topics
  const getTopicIcon = (topic: string) => {
    if (topic.includes('נשימה')) return <Wind className="w-4 h-4 text-blue-500" />;
    if (topic.includes('רזוננס')) return <Mic className="w-4 h-4 text-purple-500" />;
    if (topic.includes('טווח')) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (topic.includes('ויברטו')) return <Music className="w-4 h-4 text-pink-500" />;
    return <Sparkles className="w-4 h-4 text-voicely-green" />;
  };

  // Mood color mapping
  const getMoodColor = (mood: string) => {
    if (mood === 'נלהב' || mood === 'מלא מוטיבציה') return 'bg-green-100 text-green-700 border-green-300';
    if (mood === 'מתוסכל') return 'bg-red-100 text-red-700 border-red-300';
    if (mood === 'מרוכז') return 'bg-blue-100 text-blue-700 border-blue-300';
    if (mood === 'רגוע') return 'bg-purple-100 text-purple-700 border-purple-300';
    return 'bg-gray-100 text-gray-700 border-gray-300';
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

      {/* Main Content with Tabs */}
      <main className="p-4">
        <Tabs defaultValue="insights" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="insights">תובנות</TabsTrigger>
            <TabsTrigger value="progress">התקדמות</TabsTrigger>
            <TabsTrigger value="transcripts">תמלולים</TabsTrigger>
          </TabsList>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-4">
            {insightsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-[200px] w-full rounded-xl" />
                <Skeleton className="h-[200px] w-full rounded-xl" />
              </div>
            ) : !insights?.length ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>אין תובנות זמינות עדיין</p>
                  <p className="text-sm mt-2">התובנות יופקו אוטומטית מהתמלולים</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Recent Insights */}
                <Card className="playful-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="w-4 h-4 text-voicely-coral" />
                      תובנות אחרונות
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {insights.slice(0, 5).map((insight, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-muted/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className={getMoodColor(insight.student_mood || '')}>
                            {insight.student_mood || 'לא צוין'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatShortDate((insight as any).transcripts?.lesson_date)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {insight.key_topics?.slice(0, 4).map((topic, i) => (
                            <Badge key={i} variant="secondary" className="text-xs flex items-center gap-1">
                              {getTopicIcon(topic)}
                              {topic}
                            </Badge>
                          ))}
                        </div>
                        {insight.progress_notes && insight.progress_notes !== 'לא צוין' && (
                          <p className="text-sm text-muted-foreground">{insight.progress_notes}</p>
                        )}
                        {insight.action_items && insight.action_items.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {insight.action_items.slice(0, 2).map((item, i) => (
                              <span key={i} className="text-xs text-voicely-green flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                {item}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Skills Practiced */}
                <Card className="playful-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Music className="w-4 h-4 text-voicely-orange" />
                      מיומנויות שנעבדו
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {[...new Set(insights.flatMap(i => i.skills_practiced || []))]
                        .filter(s => s && s !== 'לא צוין')
                        .slice(0, 12)
                        .map((skill, idx) => (
                          <Badge key={idx} variant="outline" className="text-sm">
                            {skill}
                          </Badge>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-4">
            {progressLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-[200px] w-full rounded-xl" />
              </div>
            ) : !progress ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>אין מידע על התקדמות</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Topics Progress */}
                <Card className="playful-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-voicely-green" />
                      נושאים שנלמדו
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {progress.topTopics?.slice(0, 6).map((topic, idx) => {
                      const maxCount = progress.topTopics?.[0]?.count || 1;
                      const percentage = Math.round((topic.count / maxCount) * 100);
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getTopicIcon(topic.topic)}
                              <span className="text-sm">{topic.topic}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{topic.count} שיעורים</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Skills Progress */}
                <Card className="playful-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="w-4 h-4 text-voicely-coral" />
                      מיומנויות
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {progress.topSkills?.slice(0, 6).map((skill, idx) => {
                      const maxCount = progress.topSkills?.[0]?.count || 1;
                      const percentage = Math.round((skill.count / maxCount) * 100);
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">{skill.skill}</span>
                            <span className="text-xs text-muted-foreground">{skill.count}x</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Mood Trend */}
                <Card className="playful-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Heart className="w-4 h-4 text-pink-500" />
                      מגמת מצב רוח
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {progress.moodTrend?.map((mood, idx) => (
                        <Badge key={idx} variant="outline" className={getMoodColor(mood.mood)}>
                          {mood.mood} ({mood.count})
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Transcripts Tab */}
          <TabsContent value="transcripts">
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default StudentDetail;
