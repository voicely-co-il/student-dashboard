import { useState, useEffect } from 'react';
import { Mic, MicOff, Square, Trash2, Volume2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSonioxStream } from '@/hooks/live-assistant/useSonioxStream';

interface Tip {
  id: string;
  type: 'technical' | 'suggestion' | 'context';
  text: string;
  timestamp: Date;
}

export default function LiveAssistant() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [lessonDuration, setLessonDuration] = useState(0);
  const [studentName] = useState('תלמיד'); // TODO: Get from route params

  const {
    status,
    transcript,
    currentSpeaker,
    start,
    stop,
    clearTranscript,
    isStreaming,
    isConnecting,
  } = useSonioxStream({
    languageHints: ['he', 'en'],
    enableSpeakerDiarization: true,
    onTranscript: (words, isFinal) => {
      // TODO: Send to AI for analysis every 30 seconds
      console.log('Transcript update:', words, 'Final:', isFinal);
    },
    onError: (error) => {
      console.error('Soniox error:', error);
      // TODO: Show toast notification
    },
    onStatusChange: (newStatus) => {
      console.log('Status changed:', newStatus);
    },
  });

  // Lesson timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isStreaming) {
      interval = setInterval(() => {
        setLessonDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStreaming]);

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get status badge
  const getStatusBadge = () => {
    switch (status) {
      case 'idle':
        return <Badge variant="secondary">לא פעיל</Badge>;
      case 'connecting':
        return <Badge variant="outline" className="animate-pulse">מתחבר...</Badge>;
      case 'connected':
        return <Badge variant="outline">מחובר</Badge>;
      case 'streaming':
        return <Badge className="bg-green-500 animate-pulse">מקליט</Badge>;
      case 'error':
        return <Badge variant="destructive">שגיאה</Badge>;
      case 'stopped':
        return <Badge variant="secondary">הופסק</Badge>;
      default:
        return null;
    }
  };

  // Mock tips for demo
  useEffect(() => {
    if (isStreaming && tips.length === 0) {
      // Add demo tips after a few seconds
      const timer = setTimeout(() => {
        setTips([
          {
            id: '1',
            type: 'technical',
            text: 'נסי להוריד חצי טון - התלמיד נשמע מתאמץ בנוטות הגבוהות',
            timestamp: new Date(),
          },
          {
            id: '2',
            type: 'context',
            text: 'מהשיעור הקודם: עבדתם על head voice - נסי תרגיל סירנה',
            timestamp: new Date(),
          },
        ]);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isStreaming, tips.length]);

  const handleStart = async () => {
    setLessonDuration(0);
    setTips([]);
    await start();
  };

  const handleStop = () => {
    stop();
  };

  const handleClear = () => {
    clearTranscript();
    setTips([]);
    setLessonDuration(0);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">עוזר שיעור חי</h1>
          {getStatusBadge()}
        </div>
        <div className="flex items-center gap-2">
          {isStreaming && (
            <span className="text-lg font-mono bg-muted px-3 py-1 rounded">
              {formatDuration(lessonDuration)}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Controls & Tips */}
        <div className="lg:col-span-2 space-y-6">
          {/* Control Panel */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center gap-4">
                {!isStreaming ? (
                  <Button
                    size="lg"
                    onClick={handleStart}
                    disabled={isConnecting}
                    className="gap-2"
                  >
                    <Mic className="h-5 w-5" />
                    {isConnecting ? 'מתחבר...' : 'התחל שיעור'}
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

              {/* Audio indicator */}
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
              <CardTitle className="flex items-center gap-2">
                💡 טיפים
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tips.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {isStreaming
                    ? 'מנתח את השיעור...'
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

          {/* Transcript (Collapsible) */}
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
              <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                {transcript || (
                  <p className="text-muted-foreground text-center">
                    {isStreaming ? 'ממתין לדיבור...' : 'התמלול יופיע כאן'}
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Student Context Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {studentName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">מספר שיעורים</p>
                <p className="text-2xl font-bold">47</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">התקדמות כללית</p>
                <div className="w-full bg-muted rounded-full h-2 mt-1">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '70%' }} />
                </div>
                <p className="text-sm mt-1">70%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">חוזקות</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary">נשימה</Badge>
                  <Badge variant="secondary">ביטוי</Badge>
                  <Badge variant="secondary">קצב</Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">לשיפור</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline">head voice</Badge>
                  <Badge variant="outline">טווח גבוה</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>פעולות מהירות</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                🎵 המלץ שיר
              </Button>
              <Button variant="outline" className="w-full justify-start">
                📝 הוסף הערה
              </Button>
              <Button variant="outline" className="w-full justify-start">
                📊 היסטוריה
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
