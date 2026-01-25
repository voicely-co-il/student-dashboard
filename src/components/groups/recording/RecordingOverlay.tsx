import { useState, useEffect } from 'react';
import { X, Mic, Square, Play, Pause, RotateCcw, Upload, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PracticeExercise } from '@/types/groups';
import { useAudioRecording, useAudioPlayback } from '@/hooks/groups';
import VUMeter from './VUMeter';

// =====================================================
// RECORDING OVERLAY
// Full-screen recording interface
// =====================================================

interface RecordingOverlayProps {
  exercise: PracticeExercise;
  onComplete: (recordingUrl: string, score: number) => void;
  onCancel: () => void;
  maxDuration?: number;
}

type RecordingPhase = 'ready' | 'countdown' | 'recording' | 'preview' | 'uploading';

export default function RecordingOverlay({
  exercise,
  onComplete,
  onCancel,
  maxDuration = 90,
}: RecordingOverlayProps) {
  const [phase, setPhase] = useState<RecordingPhase>('ready');
  const [countdown, setCountdown] = useState(3);

  const {
    isRecording,
    duration,
    audioLevel,
    recordingResult,
    startRecording,
    stopRecording,
    cancelRecording,
    clearResult,
    uploadRecording,
    isUploading,
    timeRemaining,
    hasPermission,
    requestPermission,
    error,
  } = useAudioRecording({ maxDuration });

  const {
    loadAudio,
    play,
    pause,
    stop,
    isPlaying,
    currentTime,
    duration: playbackDuration,
  } = useAudioPlayback();

  // Start countdown
  const handleStart = async () => {
    if (hasPermission === false) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    setPhase('countdown');
    setCountdown(3);
  };

  // Countdown effect
  useEffect(() => {
    if (phase !== 'countdown') return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Start recording
      startRecording();
      setPhase('recording');
    }
  }, [phase, countdown, startRecording]);

  // Handle recording stop
  useEffect(() => {
    if (!isRecording && recordingResult && phase === 'recording') {
      loadAudio(recordingResult.url);
      setPhase('preview');
    }
  }, [isRecording, recordingResult, phase, loadAudio]);

  // Handle stop button
  const handleStop = () => {
    stopRecording();
  };

  // Handle retry
  const handleRetry = () => {
    stop();
    clearResult();
    setPhase('ready');
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!recordingResult) return;

    setPhase('uploading');

    try {
      const recording = await uploadRecording({
        exerciseId: exercise.id,
        blob: recordingResult.blob,
        duration: recordingResult.duration,
      });

      // Wait a bit for AI analysis to start
      await new Promise(resolve => setTimeout(resolve, 500));

      onComplete(recording.audio_url, recording.overall_score || 75);
    } catch (err) {
      console.error('Upload failed:', err);
      setPhase('preview');
    }
  };

  // Handle cancel
  const handleCancel = () => {
    cancelRecording();
    stop();
    clearResult();
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 text-white">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
          onClick={handleCancel}
        >
          <X className="h-6 w-6" />
        </Button>

        <h1 className="font-semibold">{exercise.title_he}</h1>

        <div className="w-10" /> {/* Spacer */}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Ready Phase */}
        {phase === 'ready' && (
          <ReadyView
            hasPermission={hasPermission}
            error={error}
            onStart={handleStart}
            onRequestPermission={requestPermission}
          />
        )}

        {/* Countdown Phase */}
        {phase === 'countdown' && (
          <CountdownView count={countdown} />
        )}

        {/* Recording Phase */}
        {phase === 'recording' && (
          <RecordingView
            duration={duration}
            audioLevel={audioLevel}
            maxDuration={maxDuration}
            onStop={handleStop}
          />
        )}

        {/* Preview Phase */}
        {phase === 'preview' && recordingResult && (
          <PreviewView
            duration={recordingResult.duration}
            isPlaying={isPlaying}
            currentTime={currentTime}
            onPlay={play}
            onPause={pause}
            onRetry={handleRetry}
            onSubmit={handleSubmit}
          />
        )}

        {/* Uploading Phase */}
        {phase === 'uploading' && (
          <UploadingView />
        )}
      </main>

      {/* Tips */}
      {phase === 'recording' && (
        <div className="p-4 text-center">
          <p className="text-white/60 text-sm">
            💡 תנשמו עמוק והקליטו בביטחון
          </p>
        </div>
      )}
    </div>
  );
}

// =====================================================
// READY VIEW
// =====================================================

function ReadyView({
  hasPermission,
  error,
  onStart,
  onRequestPermission,
}: {
  hasPermission: boolean | null;
  error: string | null;
  onStart: () => void;
  onRequestPermission: () => void;
}) {
  return (
    <div className="text-center">
      <div className="w-32 h-32 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-8">
        <Mic className="h-16 w-16 text-purple-400" />
      </div>

      <h2 className="text-2xl font-bold text-white mb-2">
        מוכנים להקליט?
      </h2>

      <p className="text-white/60 mb-8">
        לחצו על הכפתור כדי להתחיל
      </p>

      {error && (
        <p className="text-red-400 mb-4 text-sm">{error}</p>
      )}

      {hasPermission === false ? (
        <Button
          size="lg"
          variant="outline"
          className="gap-2 text-white border-white/30 hover:bg-white/10"
          onClick={onRequestPermission}
        >
          <Mic className="h-5 w-5" />
          אשר גישה למיקרופון
        </Button>
      ) : (
        <Button
          size="lg"
          className="gap-2 bg-purple-500 hover:bg-purple-600 px-8"
          onClick={onStart}
        >
          <Mic className="h-5 w-5" />
          התחל הקלטה
        </Button>
      )}
    </div>
  );
}

// =====================================================
// COUNTDOWN VIEW
// =====================================================

function CountdownView({ count }: { count: number }) {
  return (
    <div className="text-center">
      <div className={cn(
        'w-40 h-40 rounded-full flex items-center justify-center mx-auto mb-8',
        'bg-gradient-to-br from-purple-500 to-pink-500',
        'animate-pulse'
      )}>
        <span className="text-7xl font-bold text-white">
          {count}
        </span>
      </div>

      <p className="text-white/80 text-lg">
        מתכוננים...
      </p>
    </div>
  );
}

// =====================================================
// RECORDING VIEW
// =====================================================

function RecordingView({
  duration,
  audioLevel,
  maxDuration,
  onStop,
}: {
  duration: number;
  audioLevel: number;
  maxDuration: number;
  onStop: () => void;
}) {
  const progress = (duration / maxDuration) * 100;
  const isNearEnd = duration >= maxDuration - 10;

  return (
    <div className="text-center w-full max-w-sm">
      {/* Recording indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        <span className="text-red-400 font-medium">מקליט</span>
      </div>

      {/* VU Meter */}
      <div className="mb-8">
        <VUMeter level={audioLevel} />
      </div>

      {/* Duration */}
      <div className="mb-8">
        <span className={cn(
          'text-5xl font-mono font-bold',
          isNearEnd ? 'text-orange-400' : 'text-white'
        )}>
          {formatDuration(duration)}
        </span>
        <p className="text-white/40 text-sm mt-2">
          מקסימום {formatDuration(maxDuration)}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden mb-8">
        <div
          className={cn(
            'h-full transition-all duration-1000',
            isNearEnd ? 'bg-orange-500' : 'bg-purple-500'
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stop button */}
      <Button
        size="lg"
        className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600"
        onClick={onStop}
      >
        <Square className="h-6 w-6" />
      </Button>

      <p className="text-white/60 text-sm mt-4">
        לחץ לעצור
      </p>
    </div>
  );
}

// =====================================================
// PREVIEW VIEW
// =====================================================

function PreviewView({
  duration,
  isPlaying,
  currentTime,
  onPlay,
  onPause,
  onRetry,
  onSubmit,
}: {
  duration: number;
  isPlaying: boolean;
  currentTime: number;
  onPlay: () => void;
  onPause: () => void;
  onRetry: () => void;
  onSubmit: () => void;
}) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="text-center w-full max-w-sm">
      <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
        <Check className="h-12 w-12 text-green-400" />
      </div>

      <h2 className="text-2xl font-bold text-white mb-2">
        הקלטה הושלמה!
      </h2>

      <p className="text-white/60 mb-6">
        {formatDuration(duration)}
      </p>

      {/* Playback */}
      <div className="bg-white/10 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-4">
          <Button
            size="icon"
            variant="ghost"
            className="text-white hover:bg-white/10"
            onClick={isPlaying ? onPause : onPlay}
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6" />
            )}
          </Button>

          <div className="flex-1">
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-white/40 mt-1">
              <span>{formatDuration(Math.round(currentTime))}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 gap-2 text-white border-white/30 hover:bg-white/10"
          onClick={onRetry}
        >
          <RotateCcw className="h-4 w-4" />
          נסיון נוסף
        </Button>

        <Button
          className="flex-1 gap-2 bg-green-500 hover:bg-green-600"
          onClick={onSubmit}
        >
          <Upload className="h-4 w-4" />
          שמור
        </Button>
      </div>
    </div>
  );
}

// =====================================================
// UPLOADING VIEW
// =====================================================

function UploadingView() {
  return (
    <div className="text-center">
      <div className="w-24 h-24 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-6 animate-pulse">
        <Upload className="h-10 w-10 text-purple-400 animate-bounce" />
      </div>

      <h2 className="text-xl font-bold text-white mb-2">
        שומר ומנתח...
      </h2>

      <p className="text-white/60">
        רק רגע, ה-AI בודק את ההקלטה שלך
      </p>
    </div>
  );
}

// =====================================================
// HELPERS
// =====================================================

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
