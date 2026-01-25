import { useState, useEffect } from 'react';
import { ChevronRight, Play, Pause, RotateCcw, Check, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { PracticeExercise, ExerciseInstruction } from '@/types/groups';
import RecordingOverlay from '../recording/RecordingOverlay';
import { useAudioPlayback } from '@/hooks/groups';

// =====================================================
// EXERCISE PLAYER
// Full-screen exercise player with instructions and recording
// =====================================================

interface ExercisePlayerProps {
  exercise: PracticeExercise;
  onComplete: (recordingUrl: string, score: number) => void;
  onBack: () => void;
  attemptNumber?: number;
}

type PlayerState = 'instructions' | 'demo' | 'recording' | 'review';

export default function ExercisePlayer({
  exercise,
  onComplete,
  onBack,
  attemptNumber = 1,
}: ExercisePlayerProps) {
  const [state, setState] = useState<PlayerState>('instructions');
  const [currentStep, setCurrentStep] = useState(0);
  const [showRecording, setShowRecording] = useState(false);

  const { loadAudio, play, pause, isPlaying, progress } = useAudioPlayback();

  const instructions = exercise.instructions as ExerciseInstruction[];
  const totalSteps = instructions.length;

  // Handle demo playback
  const handlePlayDemo = () => {
    if (exercise.audio_demo_url) {
      loadAudio(exercise.audio_demo_url);
      play();
      setState('demo');
    }
  };

  // Handle recording complete
  const handleRecordingComplete = (recordingUrl: string, score: number) => {
    setShowRecording(false);
    onComplete(recordingUrl, score);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-lg border-b">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
            <ChevronRight className="h-4 w-4" />
            חזרה
          </Button>

          <h1 className="font-semibold text-gray-900 text-sm">
            {exercise.title_he}
          </h1>

          <span className="text-sm text-gray-500">
            ניסיון {attemptNumber}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-14 pb-24 px-4 max-w-lg mx-auto">
        {/* Exercise Info Card */}
        <Card className="mt-4 overflow-hidden">
          <div className={cn(
            'h-2',
            getCategoryGradient(exercise.category)
          )} />

          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{getCategoryEmoji(exercise.category)}</span>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {exercise.title_he}
                </h2>
                <p className="text-sm text-gray-500">
                  {exercise.duration_minutes} דקות • {getDifficultyLabel(exercise.difficulty)}
                </p>
              </div>
            </div>

            {exercise.description_he && (
              <p className="text-gray-600 text-sm mb-4">
                {exercise.description_he}
              </p>
            )}

            {/* Demo Button */}
            {exercise.audio_demo_url && (
              <Button
                variant="outline"
                className="w-full gap-2 mb-4"
                onClick={handlePlayDemo}
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-4 w-4" />
                    עצור הדגמה
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4" />
                    האזן להדגמה
                  </>
                )}
              </Button>
            )}

            {/* Demo Progress */}
            {isPlaying && (
              <Progress value={progress} className="h-1 mb-4" />
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mt-4">
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>📋</span>
              הוראות
            </h3>

            <div className="space-y-3">
              {instructions.map((instruction, index) => (
                <InstructionStep
                  key={index}
                  instruction={instruction}
                  stepNumber={index + 1}
                  isActive={index === currentStep}
                  isCompleted={index < currentStep}
                  onClick={() => setCurrentStep(index)}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        {exercise.ai_feedback_templates && (
          <div className="mt-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
            <h4 className="font-medium text-purple-900 text-sm mb-2">💡 טיפ</h4>
            <p className="text-purple-700 text-sm">
              {getRandomTip(exercise)}
            </p>
          </div>
        )}
      </main>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 safe-area-pb">
        <div className="max-w-lg mx-auto">
          <Button
            size="lg"
            className="w-full gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            onClick={() => setShowRecording(true)}
          >
            <Play className="h-5 w-5" />
            התחל הקלטה
          </Button>
        </div>
      </div>

      {/* Recording Overlay */}
      {showRecording && (
        <RecordingOverlay
          exercise={exercise}
          onComplete={handleRecordingComplete}
          onCancel={() => setShowRecording(false)}
        />
      )}
    </div>
  );
}

// =====================================================
// INSTRUCTION STEP
// =====================================================

interface InstructionStepProps {
  instruction: ExerciseInstruction;
  stepNumber: number;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
}

function InstructionStep({
  instruction,
  stepNumber,
  isActive,
  isCompleted,
  onClick,
}: InstructionStepProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 p-3 rounded-lg text-right transition-all',
        isActive && 'bg-purple-50 border border-purple-200',
        isCompleted && 'bg-green-50 border border-green-200',
        !isActive && !isCompleted && 'bg-gray-50 hover:bg-gray-100'
      )}
    >
      <div className={cn(
        'flex items-center justify-center h-7 w-7 rounded-full text-sm font-semibold flex-shrink-0',
        isCompleted && 'bg-green-500 text-white',
        isActive && 'bg-purple-500 text-white',
        !isActive && !isCompleted && 'bg-gray-200 text-gray-600'
      )}>
        {isCompleted ? <Check className="h-4 w-4" /> : stepNumber}
      </div>

      <div className="flex-1">
        <p className={cn(
          'text-sm',
          isActive && 'text-purple-900 font-medium',
          isCompleted && 'text-green-700',
          !isActive && !isCompleted && 'text-gray-600'
        )}>
          {instruction.text_he}
        </p>

        {instruction.duration_sec && (
          <span className="text-xs text-gray-400 mt-1">
            {instruction.duration_sec} שניות
          </span>
        )}
      </div>
    </button>
  );
}

// =====================================================
// HELPERS
// =====================================================

function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    warmup: '🔥',
    technique: '🎯',
    song: '🎵',
    breathing: '💨',
    rhythm: '🥁',
  };
  return emojis[category] || '🎤';
}

function getCategoryGradient(category: string): string {
  const gradients: Record<string, string> = {
    warmup: 'bg-gradient-to-r from-orange-400 to-red-400',
    technique: 'bg-gradient-to-r from-purple-400 to-pink-400',
    song: 'bg-gradient-to-r from-blue-400 to-cyan-400',
    breathing: 'bg-gradient-to-r from-green-400 to-teal-400',
    rhythm: 'bg-gradient-to-r from-yellow-400 to-orange-400',
  };
  return gradients[category] || 'bg-purple-400';
}

function getDifficultyLabel(difficulty: string): string {
  const labels: Record<string, string> = {
    easy: 'קל',
    medium: 'בינוני',
    advanced: 'מתקדם',
  };
  return labels[difficulty] || difficulty;
}

function getRandomTip(exercise: PracticeExercise): string {
  const tips = [
    'תנשמו עמוק לפני שמתחילים - זה עוזר להירגע',
    'אל תדאגו מטעויות - הן חלק מהלמידה!',
    'נסו להרגיש את הצליל בגוף, לא רק לשמוע אותו',
    'אם משהו קשה, תעצרו ותנסו שוב באיטיות',
  ];
  return tips[Math.floor(Math.random() * tips.length)];
}
