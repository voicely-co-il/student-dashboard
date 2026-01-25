import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  Mic,
  CheckCircle,
  XCircle,
  Loader2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RecordingOverlay } from '@/components/groups/recording';
import { useExerciseById, useDailyPlan, useGroupStudent } from '@/hooks/groups';
import { useAudioRecording, useAudioPlayback } from '@/hooks/groups/useAudioRecording';
import { cn } from '@/lib/utils';

// =====================================================
// EXERCISE PAGE
// Single exercise with instructions and recording
// =====================================================

type Phase = 'intro' | 'demo' | 'practice' | 'recording' | 'result';

export default function ExercisePage() {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const navigate = useNavigate();

  const { student } = useGroupStudent();
  const { data: exercise, isLoading } = useExerciseById(exerciseId);
  const { dailyPlanId, updateProgress } = useDailyPlan();

  const [phase, setPhase] = useState<Phase>('intro');
  const [showRecordingOverlay, setShowRecordingOverlay] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const audioPlayback = useAudioPlayback();
  const recording = useAudioRecording({
    maxDuration: exercise?.duration_seconds || 60,
    onRecordingComplete: (result) => {
      setPhase('result');
    },
  });

  // Redirect if no student
  useEffect(() => {
    if (!student && !isLoading) {
      navigate('/groups/register');
    }
  }, [student, isLoading, navigate]);

  if (isLoading || !exercise) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const handleStartRecording = () => {
    setShowRecordingOverlay(true);
  };

  const handleRecordingComplete = async (blob: Blob, duration: number) => {
    setShowRecordingOverlay(false);

    // Upload and trigger analysis
    try {
      const result = await recording.uploadRecording({
        exerciseId: exercise.id,
        dailyPlanId,
        blob,
        duration,
      });

      setAnalysisResult(result);
      setPhase('result');
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleRecordingCancel = () => {
    setShowRecordingOverlay(false);
    setPhase('practice');
  };

  const handlePlayDemo = () => {
    if (exercise.demo_audio_url) {
      audioPlayback.loadAudio(exercise.demo_audio_url);
      audioPlayback.play();
      setPhase('demo');
    }
  };

  const handleFinish = () => {
    navigate('/groups/student/practice');
  };

  const handleRetry = () => {
    setAnalysisResult(null);
    setPhase('practice');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/groups/student/practice')}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold text-gray-900">{exercise.title_he}</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Exercise Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl bg-purple-100 flex items-center justify-center text-3xl">
                {getCategoryEmoji(exercise.category)}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900">{exercise.title_he}</h2>
                <p className="text-gray-600 text-sm mt-1">{exercise.description_he}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span>{exercise.duration_seconds} שניות</span>
                  <span className={cn(
                    'px-2 py-0.5 rounded-full',
                    exercise.difficulty === 'easy' && 'bg-green-100 text-green-700',
                    exercise.difficulty === 'medium' && 'bg-yellow-100 text-yellow-700',
                    exercise.difficulty === 'hard' && 'bg-red-100 text-red-700',
                  )}>
                    {exercise.difficulty === 'easy' ? 'קל' :
                      exercise.difficulty === 'medium' ? 'בינוני' : 'מאתגר'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Phase Content */}
        {phase === 'intro' && (
          <IntroPhase
            exercise={exercise}
            onContinue={() => setPhase('practice')}
            onPlayDemo={handlePlayDemo}
          />
        )}

        {phase === 'demo' && (
          <DemoPhase
            audioPlayback={audioPlayback}
            onComplete={() => setPhase('practice')}
          />
        )}

        {phase === 'practice' && (
          <PracticePhase
            exercise={exercise}
            onStartRecording={handleStartRecording}
            onPlayDemo={handlePlayDemo}
          />
        )}

        {phase === 'result' && (
          <ResultPhase
            result={analysisResult}
            isLoading={recording.isUploading}
            onRetry={handleRetry}
            onFinish={handleFinish}
          />
        )}
      </main>

      {/* Recording Overlay */}
      {showRecordingOverlay && (
        <RecordingOverlay
          maxDuration={exercise.duration_seconds || 60}
          onComplete={handleRecordingComplete}
          onCancel={handleRecordingCancel}
          exerciseTitle={exercise.title_he}
        />
      )}
    </div>
  );
}

// =====================================================
// INTRO PHASE
// =====================================================

interface IntroPhaseProps {
  exercise: any;
  onContinue: () => void;
  onPlayDemo: () => void;
}

function IntroPhase({ exercise, onContinue, onPlayDemo }: IntroPhaseProps) {
  return (
    <div className="space-y-4">
      {/* Instructions */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3">הוראות</h3>
          {exercise.instructions_he ? (
            <div className="space-y-2 text-gray-600 text-sm">
              {exercise.instructions_he.split('\n').map((line: string, i: number) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-sm">
              הקשיבו להדגמה, תרגלו כמה פעמים, ואז הקליטו את עצמכם.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-purple-50 border-purple-100">
        <CardContent className="p-4">
          <h3 className="font-semibold text-purple-900 mb-2">טיפים</h3>
          <ul className="space-y-1 text-purple-700 text-sm">
            <li>• וודאו שאתם במקום שקט</li>
            <li>• נשמו עמוק לפני ההקלטה</li>
            <li>• אל תחזיקו את הטלפון קרוב מדי לפה</li>
          </ul>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        {exercise.demo_audio_url && (
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={onPlayDemo}
          >
            <Volume2 className="h-4 w-4" />
            הדגמה
          </Button>
        )}
        <Button
          className="flex-1 gap-2 bg-purple-500 hover:bg-purple-600"
          onClick={onContinue}
        >
          בואו נתחיל
        </Button>
      </div>
    </div>
  );
}

// =====================================================
// DEMO PHASE
// =====================================================

interface DemoPhaseProps {
  audioPlayback: ReturnType<typeof useAudioPlayback>;
  onComplete: () => void;
}

function DemoPhase({ audioPlayback, onComplete }: DemoPhaseProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6 text-center">
          <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
            <Volume2 className="h-10 w-10 text-purple-500" />
          </div>

          <h3 className="font-semibold text-gray-900 mb-2">הקשיבו להדגמה</h3>
          <p className="text-gray-600 text-sm mb-4">
            הקשיבו היטב ונסו לזכור את הצליל
          </p>

          <Progress value={audioPlayback.progress} className="h-2 mb-4" />

          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={audioPlayback.toggle}
            >
              {audioPlayback.isPlaying ?
                <Pause className="h-5 w-5" /> :
                <Play className="h-5 w-5" />
              }
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => audioPlayback.seek(0)}
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Button
        className="w-full bg-purple-500 hover:bg-purple-600"
        onClick={onComplete}
      >
        הבנתי, אני מוכן/ה
      </Button>
    </div>
  );
}

// =====================================================
// PRACTICE PHASE
// =====================================================

interface PracticePhaseProps {
  exercise: any;
  onStartRecording: () => void;
  onPlayDemo: () => void;
}

function PracticePhase({ exercise, onStartRecording, onPlayDemo }: PracticePhaseProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6 text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Mic className="h-12 w-12 text-white" />
          </div>

          <h3 className="font-semibold text-gray-900 mb-2">מוכנים להקליט?</h3>
          <p className="text-gray-600 text-sm mb-4">
            לחצו על הכפתור כשאתם מוכנים
          </p>

          <p className="text-2xl font-bold text-purple-500 mb-6">
            {exercise.duration_seconds} שניות
          </p>

          <Button
            size="lg"
            className="w-full h-14 text-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            onClick={onStartRecording}
          >
            <Mic className="h-5 w-5 ml-2" />
            התחלת הקלטה
          </Button>
        </CardContent>
      </Card>

      {exercise.demo_audio_url && (
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={onPlayDemo}
        >
          <Volume2 className="h-4 w-4" />
          האזינו שוב להדגמה
        </Button>
      )}
    </div>
  );
}

// =====================================================
// RESULT PHASE
// =====================================================

interface ResultPhaseProps {
  result: any;
  isLoading: boolean;
  onRetry: () => void;
  onFinish: () => void;
}

function ResultPhase({ result, isLoading, onRetry, onFinish }: ResultPhaseProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">מעלה את ההקלטה...</h3>
          <p className="text-gray-600 text-sm">
            הניתוח יהיה מוכן תוך כמה שניות
          </p>
        </CardContent>
      </Card>
    );
  }

  // Waiting for analysis
  if (!result?.ai_analysis) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">ההקלטה נשמרה!</h3>
          <p className="text-gray-600 mb-6">
            הניתוח יהיה מוכן בעוד כמה דקות
          </p>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onRetry}
            >
              להקליט שוב
            </Button>
            <Button
              className="flex-1 bg-purple-500 hover:bg-purple-600"
              onClick={onFinish}
            >
              סיום
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const analysis = result.ai_analysis;
  const score = analysis.overall_score || 0;

  return (
    <div className="space-y-4">
      {/* Score Card */}
      <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
        <CardContent className="p-6 text-center">
          <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl font-bold">{score}</span>
          </div>
          <h3 className="text-xl font-bold mb-2">
            {score >= 80 ? 'מעולה!' : score >= 60 ? 'יפה מאוד!' : 'כל הכבוד!'}
          </h3>
          <p className="text-white/80">+{result.xp_earned || 10} XP</p>
        </CardContent>
      </Card>

      {/* Metrics */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <MetricRow label="דיוק צליל" value={analysis.pitch_accuracy} />
          <MetricRow label="דיוק קצב" value={analysis.rhythm_accuracy} />
          <MetricRow label="שליטה בנשימה" value={analysis.breath_control} />
          <MetricRow label="אנרגיה" value={analysis.energy_level} />
        </CardContent>
      </Card>

      {/* Feedback */}
      {analysis.feedback_he && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-semibold text-gray-900 mb-2">משוב</h4>
            <p className="text-gray-600 text-sm">{analysis.feedback_he}</p>
          </CardContent>
        </Card>
      )}

      {/* Suggestions */}
      {analysis.suggestions?.length > 0 && (
        <Card className="bg-purple-50 border-purple-100">
          <CardContent className="p-4">
            <h4 className="font-semibold text-purple-900 mb-2">להמשך שיפור</h4>
            <ul className="space-y-1 text-purple-700 text-sm">
              {analysis.suggestions.map((suggestion: string, i: number) => (
                <li key={i}>• {suggestion}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onRetry}
        >
          <RotateCcw className="h-4 w-4 ml-2" />
          נסה שוב
        </Button>
        <Button
          className="flex-1 bg-purple-500 hover:bg-purple-600"
          onClick={onFinish}
        >
          <CheckCircle className="h-4 w-4 ml-2" />
          סיום
        </Button>
      </div>
    </div>
  );
}

// =====================================================
// METRIC ROW
// =====================================================

function MetricRow({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-medium text-gray-900">{value}%</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// =====================================================
// HELPERS
// =====================================================

function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    warmup: '🔥',
    breathing: '🌬️',
    pitch: '🎯',
    rhythm: '🥁',
    resonance: '🔔',
    range: '📈',
    song: '🎵',
  };
  return emojis[category] || '🎤';
}
