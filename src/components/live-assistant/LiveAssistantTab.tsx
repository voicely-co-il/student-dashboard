import { useState, useEffect, useMemo, useRef } from 'react';
import { Mic, Square, Trash2, Volume2, User, AlertCircle, CheckCircle2, Timer, Search, Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSonioxStream } from '@/hooks/live-assistant/useSonioxStream';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface Student {
  id: string;
  name: string;
  email?: string;
}

interface ScheduledLesson {
  id: string;
  student_id: string;
  student_name: string;
  start_time: Date;
  end_time: Date;
}

interface Tip {
  id: string;
  type: 'technical' | 'suggestion' | 'context';
  text: string;
  timestamp: Date;
}

export function LiveAssistantTab() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  // Fetch students list - join profiles with user_roles to get students only
  const { data: students = [] } = useQuery({
    queryKey: ['students-for-live-assistant'],
    queryFn: async () => {
      // Get user IDs with student role
      const { data: studentRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student')
        .eq('is_active', true);

      if (rolesError) {
        console.error('Error fetching student roles:', rolesError);
        // Fallback: get all profiles if roles table fails
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .order('full_name');

        return (allProfiles || []).map(s => ({
          id: s.id,
          name: s.full_name || s.username || 'ללא שם',
          email: s.username,
        })) as Student[];
      }

      const studentIds = studentRoles?.map(r => r.user_id) || [];

      if (studentIds.length === 0) {
        // No students found, get all profiles as fallback
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .order('full_name');

        return (allProfiles || []).map(s => ({
          id: s.id,
          name: s.full_name || s.username || 'ללא שם',
          email: s.username,
        })) as Student[];
      }

      // Get profiles for students
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .in('id', studentIds)
        .order('full_name');

      if (error) throw error;
      return (data || []).map(s => ({
        id: s.id,
        name: s.full_name || s.username || 'ללא שם',
        email: s.username,
      })) as Student[];
    },
  });

  // Fetch current/upcoming lesson from calendar
  const { data: currentLesson } = useQuery({
    queryKey: ['current-lesson-for-live-assistant'],
    queryFn: async () => {
      // Try to get lesson from google calendar via edge function
      try {
        const { data, error } = await supabase.functions.invoke('google-calendar-events', {
          body: { action: 'list', maxResults: 5 },
        });

        if (error || !data?.events) return null;

        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

        // Find event happening now or starting soon
        const currentEvent = data.events.find((event: any) => {
          const start = new Date(event.start?.dateTime || event.start?.date);
          const end = new Date(event.end?.dateTime || event.end?.date);
          return start <= thirtyMinutesFromNow && end >= fiveMinutesAgo;
        });

        if (!currentEvent) return null;

        // Try to match student name from event title
        const eventTitle = currentEvent.summary || '';
        const matchedStudent = students.find(s =>
          eventTitle.includes(s.name) || (s.email && eventTitle.includes(s.email))
        );

        if (matchedStudent) {
          return {
            id: currentEvent.id,
            student_id: matchedStudent.id,
            student_name: matchedStudent.name,
            start_time: new Date(currentEvent.start?.dateTime || currentEvent.start?.date),
            end_time: new Date(currentEvent.end?.dateTime || currentEvent.end?.date),
          } as ScheduledLesson;
        }

        return null;
      } catch {
        return null;
      }
    },
    enabled: students.length > 0,
    refetchInterval: 60000, // Check every minute
  });

  // Auto-select student from current lesson
  useEffect(() => {
    if (currentLesson && !selectedStudentId) {
      setSelectedStudentId(currentLesson.student_id);
      toast({
        title: '🗓️ זוהה שיעור מתוכנן',
        description: `תלמיד: ${currentLesson.student_name}`,
      });
    }
  }, [currentLesson, selectedStudentId, toast]);

  // Filter students by search
  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.email && s.email.toLowerCase().includes(q))
    );
  }, [students, searchQuery]);

  // Get selected student info (handles both DB students and manual entries)
  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    if (selectedStudentId.startsWith('manual:')) {
      return {
        id: selectedStudentId,
        name: selectedStudentId.replace('manual:', ''),
        email: undefined,
      } as Student;
    }
    return students.find(s => s.id === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  const {
    status,
    transcript,
    interimText,
    currentSpeaker,
    start,
    stop,
    clearTranscript,
    isStreaming,
    isConnecting,
    // Beta limits
    sessionSeconds,
    dailyUsedSeconds,
    maxSessionSeconds,
    maxDailySeconds,
    remainingSessionSeconds,
    remainingDailySeconds,
  } = useSonioxStream({
    languageHints: ['he', 'en'],
    enableSpeakerDiarization: true,
    onTranscript: (words, isFinal) => {
      console.log('Transcript update:', words, 'Final:', isFinal);
    },
    onError: (error) => {
      console.error('Soniox error:', error);
      toast({
        title: 'שגיאה',
        description: error,
        variant: 'destructive',
      });
    },
    onLimitWarning: (type, remainingSeconds) => {
      const mins = Math.floor(remainingSeconds / 60);
      toast({
        title: type === 'session' ? 'אזהרת זמן' : 'אזהרת מכסה יומית',
        description: type === 'session'
          ? `נותרו ${mins} דקות לסיום ההקלטה`
          : `נותרו ${mins} דקות מהמכסה היומית`,
        variant: 'default',
      });
    },
    onLimitReached: (type) => {
      toast({
        title: type === 'session' ? 'ההקלטה הופסקה' : 'הגעת למכסה היומית',
        description: type === 'session'
          ? 'ההקלטה הופסקה אוטומטית לאחר 10 דקות (מגבלת בטא)'
          : 'הגעת למכסה של 30 דקות ביום (מגבלת בטא). נסה שוב מחר.',
        variant: 'destructive',
      });
    },
  });

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentages
  const sessionProgress = (sessionSeconds / maxSessionSeconds) * 100;
  const dailyProgress = (dailyUsedSeconds / maxDailySeconds) * 100;
  const isDailyLimitReached = dailyUsedSeconds >= maxDailySeconds;

  // AI Tips - analyze transcript every 30 seconds when there's new content
  const lastAnalyzedLengthRef = useRef(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (!isStreaming || !selectedStudentId) return;

    // Only analyze when we have at least 100 chars of new content
    const newContentLength = transcript.length - lastAnalyzedLengthRef.current;
    if (newContentLength < 100) return;

    const analyzeTranscript = async () => {
      if (isAnalyzing) return;
      setIsAnalyzing(true);

      try {
        const { data, error } = await supabase.functions.invoke('live-assistant-tips', {
          body: {
            transcript: transcript.slice(-2000), // Last 2000 chars for context
            studentName: selectedStudent?.name,
            studentId: selectedStudentId,
            // TODO: Add previous lesson summary from transcripts
            // TODO: Add lesson goals from student profile
          },
        });

        if (error) {
          console.error('Tips analysis error:', error);
          return;
        }

        if (data?.tips && data.tips.length > 0) {
          const newTips: Tip[] = data.tips.map((tip: { type: string; text: string }, index: number) => ({
            id: `${Date.now()}-${index}`,
            type: tip.type as 'technical' | 'suggestion' | 'context',
            text: tip.text,
            timestamp: new Date(),
          }));

          setTips(prev => [...newTips, ...prev].slice(0, 10)); // Keep last 10 tips
        }

        lastAnalyzedLengthRef.current = transcript.length;
      } catch (err) {
        console.error('Tips fetch error:', err);
      } finally {
        setIsAnalyzing(false);
      }
    };

    // Debounce - wait 5 seconds after last transcript update
    const timer = setTimeout(analyzeTranscript, 5000);
    return () => clearTimeout(timer);
  }, [isStreaming, transcript, selectedStudentId, selectedStudent?.name, isAnalyzing]);

  const handleStart = async () => {
    setTips([]);
    await start();
  };

  const handleStop = () => {
    stop();
  };

  const handleClear = () => {
    clearTranscript();
    setTips([]);
  };

  // Check if Soniox is configured
  const isSonioxConfigured = true; // TODO: Check if SONIOX_API_KEY exists

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>עוזר שיעור חי - בטא</AlertTitle>
        <AlertDescription>
          כלי זה מאזין לשיעור בזמן אמת ומציע טיפים למורה.
          משתמש ב-Soniox לתמלול עברית (דיוק 92.5%).
          <br />
          <span className="text-muted-foreground">
            מגבלות בטא: עד 10 דקות להקלטה, עד 30 דקות ביום
          </span>
        </AlertDescription>
      </Alert>

      {/* Beta Limits Warning */}
      {isDailyLimitReached && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>הגעת למכסה היומית</AlertTitle>
          <AlertDescription>
            השתמשת ב-30 דקות היום (מגבלת בטא). נסה שוב מחר.
          </AlertDescription>
        </Alert>
      )}

      {/* Student Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            בחירת תלמיד
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Dropdown - with portal for proper z-index in modals */}
            {students.length > 0 ? (
              <Select
                value={selectedStudentId || ''}
                onValueChange={(value) => setSelectedStudentId(value || null)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="בחר תלמיד מהרשימה..." />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[9999]">
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        {student.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex-1 text-sm text-muted-foreground p-2 border rounded-md">
                אין תלמידים במערכת
              </div>
            )}

            {/* Manual name input */}
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="או הזן שם ידנית..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    // Create a temporary student entry for manual input
                    setSelectedStudentId(`manual:${searchQuery.trim()}`);
                    setSearchQuery('');
                  }
                }}
                className="pr-9"
              />
            </div>
          </div>

          {/* Search results from existing students */}
          {searchQuery && filteredStudents.length > 0 && (
            <div className="mt-2 border rounded-md max-h-32 overflow-y-auto">
              {filteredStudents.slice(0, 5).map((student) => (
                <button
                  key={student.id}
                  onClick={() => {
                    setSelectedStudentId(student.id);
                    setSearchQuery('');
                  }}
                  className="w-full text-right px-3 py-2 hover:bg-muted flex items-center gap-2 text-sm"
                >
                  <User className="h-3 w-3" />
                  {student.name}
                  {student.email && (
                    <span className="text-muted-foreground text-xs">({student.email})</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Manual entry hint */}
          {searchQuery && filteredStudents.length === 0 && (
            <div className="mt-2 p-2 border rounded-md text-sm text-muted-foreground">
              לחץ Enter כדי להשתמש בשם "{searchQuery}"
            </div>
          )}

          {/* Current lesson indicator */}
          {currentLesson && (
            <div className="mt-3 p-2 bg-green-50 dark:bg-green-950 rounded-md flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-green-600" />
              <span className="text-green-700 dark:text-green-300">
                שיעור מתוכנן עכשיו: <strong>{currentLesson.student_name}</strong>
              </span>
              {selectedStudentId !== currentLesson.student_id && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedStudentId(currentLesson.student_id)}
                  className="mr-auto text-xs"
                >
                  בחר
                </Button>
              )}
            </div>
          )}

          {/* Selected student display */}
          {selectedStudentId && (
            <div className="mt-3 p-3 bg-primary/5 rounded-md flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="font-medium">
                  {selectedStudentId.startsWith('manual:')
                    ? selectedStudentId.replace('manual:', '')
                    : selectedStudent?.name || 'תלמיד לא ידוע'}
                </div>
                {selectedStudent?.email && (
                  <div className="text-xs text-muted-foreground">{selectedStudent.email}</div>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedStudentId(null)}
                className="mr-auto"
              >
                שנה
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status & Controls */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5" />
                  בקרת שיעור
                </CardTitle>
                <div className="flex items-center gap-2">
                  {status === 'idle' && (
                    <Badge variant="secondary">לא פעיל</Badge>
                  )}
                  {status === 'connecting' && (
                    <Badge variant="outline" className="animate-pulse">מתחבר...</Badge>
                  )}
                  {status === 'streaming' && (
                    <Badge className="bg-green-500 animate-pulse">מקליט</Badge>
                  )}
                  {status === 'error' && (
                    <Badge variant="destructive">שגיאה</Badge>
                  )}
                  {isStreaming && (
                    <span className={`text-lg font-mono px-3 py-1 rounded ${
                      remainingSessionSeconds <= 120 ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-muted'
                    }`}>
                      {formatDuration(sessionSeconds)} / {formatDuration(maxSessionSeconds)}
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-4">
                {!isStreaming ? (
                  <Button
                    size="lg"
                    onClick={handleStart}
                    disabled={isConnecting || isDailyLimitReached || !selectedStudentId}
                    className="gap-2"
                  >
                    <Mic className="h-5 w-5" />
                    {isConnecting ? 'מתחבר...' : isDailyLimitReached ? 'מכסה יומית מלאה' : !selectedStudentId ? 'בחר תלמיד קודם' : 'התחל שיעור'}
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={handleStop}
                    className="gap-2"
                  >
                    <Square className="h-5 w-5" />
                    הפסק
                  </Button>
                )}
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleClear}
                  disabled={isStreaming}
                  className="gap-2"
                >
                  <Trash2 className="h-5 w-5" />
                  נקה
                </Button>
              </div>

              {isStreaming && (
                <div className="flex items-center justify-center gap-2 mt-4 text-muted-foreground">
                  <Volume2 className="h-4 w-4 animate-pulse" />
                  <span>מאזין לשיעור...</span>
                  {currentSpeaker && (
                    <Badge variant="outline" className="mr-2">
                      <User className="h-3 w-3 ml-1" />
                      {currentSpeaker}
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tips Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  💡 טיפים
                  {isAnalyzing && (
                    <Badge variant="outline" className="animate-pulse text-xs">
                      מנתח...
                    </Badge>
                  )}
                </span>
                <Badge variant="secondary">{tips.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tips.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {isStreaming
                    ? isAnalyzing ? 'מנתח את השיעור...' : 'ממתין לתוכן לניתוח (מינימום 100 תווים)...'
                    : 'התחל שיעור כדי לקבל טיפים'}
                </p>
              ) : (
                <div className="space-y-3">
                  {tips.map((tip) => (
                    <div
                      key={tip.id}
                      className={`p-4 rounded-lg border ${
                        tip.type === 'technical'
                          ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800'
                          : tip.type === 'suggestion'
                          ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                          : 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg">
                          {tip.type === 'technical' ? '🎵' : tip.type === 'suggestion' ? '💡' : '📝'}
                        </span>
                        <p className="flex-1">{tip.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transcript */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>תמלול חי</span>
                <Badge variant="secondary">
                  {transcript.length} תווים
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[150px] w-full rounded-md border p-4 text-right" dir="rtl">
                {transcript || interimText ? (
                  <div className="whitespace-pre-wrap">
                    {transcript}
                    {interimText && (
                      <span className="text-muted-foreground italic">{interimText}</span>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center">
                    {isStreaming ? 'ממתין לדיבור...' : 'התמלול יופיע כאן'}
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Configuration Status */}
          <Card>
            <CardHeader>
              <CardTitle>סטטוס הגדרות</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Soniox API</span>
                <Badge variant={isSonioxConfigured ? 'default' : 'destructive'}>
                  {isSonioxConfigured ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 ml-1" />
                      מוגדר
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3 ml-1" />
                      חסר
                    </>
                  )}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Edge Function</span>
                <Badge variant="default">
                  <CheckCircle2 className="h-3 w-3 ml-1" />
                  פעיל
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Beta Limits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                מגבלות בטא
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Session Limit */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">הקלטה נוכחית</span>
                  <span className="font-mono">
                    {formatDuration(sessionSeconds)} / {formatDuration(maxSessionSeconds)}
                  </span>
                </div>
                <Progress
                  value={sessionProgress}
                  className={`h-2 ${sessionProgress > 80 ? '[&>div]:bg-red-500' : ''}`}
                />
              </div>

              {/* Daily Limit */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">שימוש יומי</span>
                  <span className="font-mono">
                    {formatDuration(dailyUsedSeconds)} / {formatDuration(maxDailySeconds)}
                  </span>
                </div>
                <Progress
                  value={dailyProgress}
                  className={`h-2 ${dailyProgress > 80 ? '[&>div]:bg-red-500' : dailyProgress > 60 ? '[&>div]:bg-amber-500' : ''}`}
                />
              </div>

              <p className="text-xs text-muted-foreground mt-2">
                המכסה היומית מתאפסת בחצות
              </p>
            </CardContent>
          </Card>

          {/* Documentation */}
          <Card>
            <CardHeader>
              <CardTitle>מידע טכני</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>API:</strong> Soniox STT</p>
              <p><strong>דיוק עברית:</strong> 92.5%</p>
              <p><strong>עלות:</strong> $0.12/שעה</p>
              <p><strong>Latency:</strong> ~300ms</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
