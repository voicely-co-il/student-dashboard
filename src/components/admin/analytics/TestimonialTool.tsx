import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Star,
  Loader2,
  RefreshCw,
  Video,
  MessageSquare,
  Mail,
  Globe,
  Copy,
  Check,
  Sparkles,
  Users,
  Calendar,
  TrendingUp,
  Heart,
} from 'lucide-react';
import {
  useTestimonialCandidates,
  useGenerateTestimonialRequest,
  TestimonialCandidate,
  GeneratedRequest,
} from '@/hooks/admin/useTestimonialTool';
import { toast } from 'sonner';

const PLATFORM_CONFIG = {
  video: { icon: Video, label: 'וידאו', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950' },
  google: { icon: Globe, label: 'גוגל', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950' },
  facebook: { icon: MessageSquare, label: 'פייסבוק', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-950' },
  website: { icon: Star, label: 'אתר', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950' },
  whatsapp: { icon: MessageSquare, label: 'וואטסאפ', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950' },
  email: { icon: Mail, label: 'מייל', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950' },
};

const TONE_OPTIONS = [
  { value: 'warm', label: 'חם ואישי', emoji: '💝' },
  { value: 'professional', label: 'מקצועי', emoji: '👔' },
  { value: 'playful', label: 'שובב וקליל', emoji: '🎉' },
  { value: 'grateful', label: 'מודה ומעריך', emoji: '🙏' },
];

const REQUEST_PLATFORMS = [
  { value: 'whatsapp', label: 'וואטסאפ' },
  { value: 'email', label: 'מייל' },
  { value: 'video', label: 'בקשה לוידאו' },
  { value: 'google', label: 'גוגל ביזנס' },
  { value: 'facebook', label: 'פייסבוק' },
];

function CandidateCard({
  candidate,
  onGenerateRequest,
}: {
  candidate: TestimonialCandidate;
  onGenerateRequest: (studentName: string, platform: string) => void;
}) {
  const platformConfig = PLATFORM_CONFIG[candidate.suggestedPlatform];
  const PlatformIcon = platformConfig?.icon || Star;

  return (
    <Card className="playful-shadow hover:shadow-lg transition-all">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${platformConfig?.bg || 'bg-gray-100'}`}>
              <PlatformIcon className={`w-5 h-5 ${platformConfig?.color || 'text-gray-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{candidate.studentName}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>{candidate.lessonCount} שיעורים</span>
              </div>
            </div>
          </div>
          <Badge
            variant="outline"
            className={`
              ${candidate.confidenceScore >= 80 ? 'border-green-500 text-green-600' : ''}
              ${candidate.confidenceScore >= 60 && candidate.confidenceScore < 80 ? 'border-amber-500 text-amber-600' : ''}
              ${candidate.confidenceScore < 60 ? 'border-gray-400 text-gray-500' : ''}
            `}
          >
            {candidate.confidenceScore}% התאמה
          </Badge>
        </div>

        {/* Reason */}
        <p className="text-sm text-muted-foreground mb-3">{candidate.reason}</p>

        {/* Highlights */}
        <div className="flex flex-wrap gap-2 mb-4">
          {candidate.highlights.map((highlight, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {highlight}
            </Badge>
          ))}
        </div>

        {/* Recent Lessons */}
        {candidate.recentLessons.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-muted/50">
            <p className="text-xs font-medium text-muted-foreground mb-2">שיעורים אחרונים:</p>
            <div className="space-y-1">
              {candidate.recentLessons.slice(0, 2).map((lesson, idx) => (
                <p key={idx} className="text-xs text-muted-foreground">
                  <span className="font-medium">{lesson.date}:</span> {lesson.summary?.substring(0, 60)}...
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={() => onGenerateRequest(candidate.studentName, candidate.suggestedPlatform)}
          >
            <Sparkles className="w-4 h-4 ms-2" />
            צור בקשה
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onGenerateRequest(candidate.studentName, 'video')}
          >
            <Video className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function GenerateRequestDialog({
  open,
  onOpenChange,
  studentName,
  initialPlatform,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  initialPlatform: string;
}) {
  const [platform, setPlatform] = useState(initialPlatform);
  const [tone, setTone] = useState<string>('warm');
  const [generatedRequest, setGeneratedRequest] = useState<GeneratedRequest | null>(null);
  const [copied, setCopied] = useState(false);

  const generateRequest = useGenerateTestimonialRequest();

  const handleGenerate = async () => {
    try {
      const result = await generateRequest.mutateAsync({
        studentName,
        platform: platform as any,
        tone: tone as any,
        includeSpecificMoments: true,
      });
      setGeneratedRequest(result.request);
    } catch (error) {
      toast.error('שגיאה ביצירת הבקשה');
    }
  };

  const copyToClipboard = async () => {
    if (!generatedRequest) return;
    try {
      await navigator.clipboard.writeText(generatedRequest.message);
      setCopied(true);
      toast.success('הועתק ללוח');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('שגיאה בהעתקה');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-voicely-orange" />
            יצירת בקשת חוות דעת ל{studentName}
          </DialogTitle>
          <DialogDescription>
            בחר פלטפורמה וטון, ו-AI ייצור בקשה מותאמת אישית על סמך השיעורים
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">פלטפורמה</label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">טון</label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.emoji} {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Generate Button */}
          {!generatedRequest && (
            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={generateRequest.isPending}
            >
              {generateRequest.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ms-2" />
                  יוצר בקשה מותאמת אישית...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 ms-2" />
                  צור בקשה
                </>
              )}
            </Button>
          )}

          {/* Generated Request */}
          {generatedRequest && (
            <div className="space-y-4">
              {generatedRequest.subject && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs font-medium text-muted-foreground mb-1">נושא:</p>
                  <p className="text-sm font-medium">{generatedRequest.subject}</p>
                </div>
              )}

              <div className="relative">
                <div className="p-4 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                  {generatedRequest.message}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 left-2"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Personal Details Used */}
              {generatedRequest.personalDetails.length > 0 && (
                <div className="p-3 rounded-lg bg-voicely-green/10">
                  <p className="text-xs font-medium text-voicely-green mb-2">פרטים אישיים שנכללו:</p>
                  <div className="flex flex-wrap gap-1">
                    {generatedRequest.personalDetails.map((detail, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {detail}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setGeneratedRequest(null)}
                >
                  <RefreshCw className="w-4 h-4 ms-2" />
                  צור גרסה אחרת
                </Button>
                <Button className="flex-1" onClick={copyToClipboard}>
                  <Copy className="w-4 h-4 ms-2" />
                  העתק והדבק
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const TestimonialTool = () => {
  const { data, isLoading, error, refetch, isRefetching } = useTestimonialCandidates();
  const [selectedCandidate, setSelectedCandidate] = useState<{
    studentName: string;
    platform: string;
  } | null>(null);

  const handleGenerateRequest = (studentName: string, platform: string) => {
    setSelectedCandidate({ studentName, platform });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-voicely-orange mb-4" />
        <p className="text-muted-foreground">מחפש מועמדים מתאימים לחוות דעת...</p>
        <p className="text-sm text-muted-foreground mt-2">מנתח תמלולים והתקדמות תלמידים</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-destructive mb-4">שגיאה במציאת מועמדים</p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 ms-2" />
          נסה שוב
        </Button>
      </div>
    );
  }

  const candidates = data?.candidates || [];

  // Group by suggested platform
  const videoFirst = candidates.filter(c => c.suggestedPlatform === 'video');
  const others = candidates.filter(c => c.suggestedPlatform !== 'video');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Star className="w-5 h-5 text-voicely-orange" />
            כלי בקשת חוות דעת
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            AI מנתח את התמלולים ומוצא את התלמידים הכי מתאימים לתת חוות דעת
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`w-4 h-4 ms-2 ${isRefetching ? 'animate-spin' : ''}`} />
          {isRefetching ? 'מחפש...' : 'חפש מחדש'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="playful-shadow">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 mx-auto text-voicely-green mb-2" />
            <p className="text-2xl font-bold">{candidates.length}</p>
            <p className="text-xs text-muted-foreground">מועמדים נמצאו</p>
          </CardContent>
        </Card>
        <Card className="playful-shadow">
          <CardContent className="p-4 text-center">
            <Video className="w-6 h-6 mx-auto text-red-500 mb-2" />
            <p className="text-2xl font-bold">{videoFirst.length}</p>
            <p className="text-xs text-muted-foreground">מתאימים לוידאו</p>
          </CardContent>
        </Card>
        <Card className="playful-shadow">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold">
              {candidates.filter(c => c.confidenceScore >= 80).length}
            </p>
            <p className="text-xs text-muted-foreground">התאמה גבוהה</p>
          </CardContent>
        </Card>
        <Card className="playful-shadow">
          <CardContent className="p-4 text-center">
            <Heart className="w-6 h-6 mx-auto text-pink-500 mb-2" />
            <p className="text-2xl font-bold">
              {Math.round(candidates.reduce((sum, c) => sum + c.lessonCount, 0) / candidates.length || 0)}
            </p>
            <p className="text-xs text-muted-foreground">ממוצע שיעורים</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="video" className="space-y-4">
        <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1.5 rounded-xl">
          <TabsTrigger value="video" className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            מתאימים לוידאו ({videoFirst.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            כל המועמדים ({candidates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="video" className="space-y-4">
          <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Video className="w-5 h-5 text-red-500" />
                <div>
                  <p className="font-medium">עדיפות לוידאו</p>
                  <p className="text-sm text-muted-foreground">
                    התלמידים הבאים מתאימים במיוחד לתת חוות דעת בוידאו - יש להם סיפור מעניין ויכולת הבעה טובה
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {videoFirst.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videoFirst.map((candidate, index) => (
                <CandidateCard
                  key={index}
                  candidate={candidate}
                  onGenerateRequest={handleGenerateRequest}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              לא נמצאו מועמדים מתאימים לוידאו כרגע
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {candidates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {candidates.map((candidate, index) => (
                <CandidateCard
                  key={index}
                  candidate={candidate}
                  onGenerateRequest={handleGenerateRequest}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              לא נמצאו מועמדים כרגע. נסה להגדיל את כמות הנתונים.
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Generate Request Dialog */}
      {selectedCandidate && (
        <GenerateRequestDialog
          open={!!selectedCandidate}
          onOpenChange={(open) => !open && setSelectedCandidate(null)}
          studentName={selectedCandidate.studentName}
          initialPlatform={selectedCandidate.platform}
        />
      )}
    </div>
  );
};

export default TestimonialTool;
