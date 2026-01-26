import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Play,
  Pause,
  Mic,
  CheckCircle,
  XCircle,
  Loader2,
  Music,
  Trophy,
  RotateCcw,
  Upload,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RecordingOverlay } from '@/components/groups/recording';
import { useChallengeDetail, useMyEntries, useSubmitChallengeEntry } from '@/hooks/groups';
import { useAudioRecording } from '@/hooks/groups/useAudioRecording';
import { cn } from '@/lib/utils';
import { WeeklyChallenge } from '@/types/groups';

// =====================================================
// DEMO DATA
// =====================================================

const DEMO_CHALLENGE: WeeklyChallenge = {
  id: 'challenge-1',
  group_id: 'group-diamonds',
  title: 'אתגר יהלומים',
  title_he: 'אתגר יהלומים',
  description_he: 'שרו את הקטע "Shine bright like a diamond" מהשיר של ריהאנה.',
  song_title: 'Diamonds',
  song_artist: 'Rihanna',
  song_excerpt_start_sec: 45,
  song_excerpt_end_sec: 90,
  reference_audio_url: '',
  lyrics_he: 'Shine bright like a diamond\nShine bright like a diamond\nFind light in the beautiful sea\nI choose to be happy',
  criteria: { min_pitch_accuracy: 70, min_energy_level: 60, no_breaks: false, duration_range: [30, 60] },
  max_attempts: 3,
  scoring_weights: { ai_score: 0.4, teacher_score: 0.4, effort_score: 0.1, participation_bonus: 0.1 },
  leaderboard_mode: 'full',
  allow_comments: true,
  show_scores_publicly: true,
  prizes: {
    first: { xp: 100 },
    second: { xp: 75 },
    third: { xp: 50 },
    participation: { xp: 25 },
  },
  status: 'active',
  starts_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  ends_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
  created_by: 'teacher-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// =====================================================
// CHALLENGE RECORD PAGE
// =====================================================

type Phase = 'intro' | 'recording' | 'uploading' | 'result';

export default function ChallengeRecordPage() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';

  // Data hooks
  const { data: realChallenge, isLoading } = useChallengeDetail(isDemo ? undefined : challengeId);
  const { data: realMyEntries } = useMyEntries(isDemo ? undefined : challengeId);
  const submitEntry = useSubmitChallengeEntry();

  const challenge = isDemo ? DEMO_CHALLENGE : realChallenge;
  const myEntries = isDemo ? [] : (realMyEntries || []);
  const attemptsUsed = myEntries.length;

  const [phase, setPhase] = useState<Phase>('intro');
  const [showRecordingOverlay, setShowRecordingOverlay] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Reference audio playback
  const [isPlayingReference, setIsPlayingReference] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const recording = useAudioRecording({
    maxDuration: challenge?.criteria.duration_range[1] || 60,
  });

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Check if can attempt
  const canAttempt = challenge &&
    challenge.status === 'active' &&
    attemptsUsed < challenge.max_attempts;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">האתגר לא נמצא</h2>
            <Button onClick={() => navigate('/groups/student/challenges')}>
              חזרה לאתגרים
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canAttempt && phase === 'intro') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {challenge.status !== 'active'
                ? 'האתגר הסתיים'
                : 'הגעת למקסימום ניסיונות'}
            </h2>
            <p className="text-gray-600 mb-6">
              {challenge.status !== 'active'
                ? 'לא ניתן להגיש הקלטות לאתגר שהסתיים'
                : `כבר השתמשת ב-${challenge.max_attempts} ניסיונות`}
            </p>
            <Button onClick={() => navigate(`/groups/student/challenges/${challengeId}${isDemo ? '?demo=true' : ''}`)}>
              לצפייה בתוצאות
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const toggleReferenceAudio = () => {
    if (!audioRef.current && challenge.reference_audio_url) {
      audioRef.current = new Audio(challenge.reference_audio_url);
      audioRef.current.onended = () => setIsPlayingReference(false);
    }

    if (audioRef.current) {
      if (isPlayingReference) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlayingReference(!isPlayingReference);
    }
  };

  const handleStartRecording = () => {
    setShowRecordingOverlay(true);
  };

  const handleRecordingComplete = async (blob: Blob, duration: number) => {
    setShowRecordingOverlay(false);
    setPhase('uploading');
    setError(null);

    if (isDemo) {
      // Simulate upload in demo mode
      await new Promise(resolve => setTimeout(resolve, 2000));
      setUploadResult({
        id: 'demo-entry',
        final_score: null,
        attempt_number: attemptsUsed + 1,
      });
      setPhase('result');
      return;
    }

    try {
      // Upload recording
      const result = await recording.uploadRecording({
        challengeId: challenge.id,
        blob,
        duration,
      });

      // Submit entry
      const entry = await submitEntry.mutateAsync({
        challengeId: challenge.id,
        recordingUrl: result.url,
        durationSeconds: duration,
      });

      setUploadResult(entry);
      setPhase('result');
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err instanceof Error ? err.message : 'שגיאה בהעלאת ההקלטה');
      setPhase('intro');
    }
  };

  const handleRecordingCancel = () => {
    setShowRecordingOverlay(false);
  };

  const handleRetry = () => {
    setUploadResult(null);
    setError(null);
    setPhase('intro');
  };

  const handleFinish = () => {
    navigate(`/groups/student/challenges/${challengeId}${isDemo ? '?demo=true' : ''}`);
  };

  const handleViewLeaderboard = () => {
    navigate(`/groups/student/challenges/${challengeId}${isDemo ? '?demo=true' : ''}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/groups/student/challenges/${challengeId}${isDemo ? '?demo=true' : ''}`)}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <h1 className="font-semibold text-gray-900">{challenge.title_he}</h1>
            <p className="text-xs text-gray-500">
              ניסיון {attemptsUsed + 1} מתוך {challenge.max_attempts}
            </p>
          </div>
          <div className="w-10" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Error Message */}
        {error && (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Phase: Intro */}
        {phase === 'intro' && (
          <>
            {/* Song Card */}
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
                    <Music className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-bold">{challenge.song_title}</h2>
                    {challenge.song_artist && (
                      <p className="text-sm opacity-90">{challenge.song_artist}</p>
                    )}
                  </div>
                </div>
              </div>

              <CardContent className="p-4 space-y-4">
                {/* Reference Audio */}
                {challenge.reference_audio_url && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">האזינו לדוגמה</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={toggleReferenceAudio}
                    >
                      {isPlayingReference ? (
                        <>
                          <Pause className="h-4 w-4" />
                          עצור
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          נגן
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Lyrics */}
                {challenge.lyrics_he && (
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h3 className="font-semibold text-purple-900 mb-2 text-sm">מילות השיר:</h3>
                    <p className="text-purple-800 text-sm whitespace-pre-line leading-relaxed">
                      {challenge.lyrics_he}
                    </p>
                  </div>
                )}

                {/* Duration Info */}
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>אורך הקלטה:</span>
                  <span className="font-medium">
                    {challenge.criteria.duration_range[0]}-{challenge.criteria.duration_range[1]} שניות
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100">
              <CardContent className="p-4">
                <h3 className="font-semibold text-purple-900 mb-3">טיפים להצלחה</h3>
                <ul className="space-y-2 text-purple-800 text-sm">
                  <li className="flex items-start gap-2">
                    <span>🎯</span>
                    <span>שירו בדיוק את המילים - זה משפיע על הציון</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>🎤</span>
                    <span>החזיקו את הטלפון 20 ס"מ מהפה</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>🔇</span>
                    <span>וודאו שאתם במקום שקט</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>💪</span>
                    <span>שירו באנרגיה - זה חשוב!</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Record Button */}
            <Button
              size="lg"
              className="w-full h-16 text-lg gap-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg"
              onClick={handleStartRecording}
            >
              <Mic className="h-6 w-6" />
              התחלת הקלטה
            </Button>
          </>
        )}

        {/* Phase: Uploading */}
        {phase === 'uploading' && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full bg-purple-100 animate-pulse" />
                <div className="absolute inset-2 rounded-full bg-purple-200 animate-pulse delay-100" />
                <div className="absolute inset-4 rounded-full bg-purple-300 flex items-center justify-center">
                  <Upload className="h-8 w-8 text-purple-600 animate-bounce" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">מעלה את ההקלטה...</h3>
              <p className="text-gray-600">זה יקח כמה שניות</p>
              <Progress value={66} className="mt-6 h-2" />
            </CardContent>
          </Card>
        )}

        {/* Phase: Result */}
        {phase === 'result' && (
          <>
            {/* Success Card */}
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-white text-center">
                <CheckCircle className="h-16 w-16 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">ההקלטה נשלחה!</h2>
                <p className="opacity-90">ניסיון #{uploadResult?.attempt_number || attemptsUsed + 1}</p>
              </div>

              <CardContent className="p-6 text-center">
                <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                  <Trophy className="h-10 w-10 text-purple-500" />
                </div>

                <h3 className="font-semibold text-gray-900 mb-2">
                  הציון יעודכן בקרוב
                </h3>
                <p className="text-gray-600 text-sm mb-6">
                  ה-AI מנתח את ההקלטה שלך. הציון יופיע בלוח המובילים תוך כמה דקות.
                </p>

                {/* XP Earned */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full mb-6">
                  <span className="text-purple-600 font-bold">+{challenge.prizes.participation.xp} XP</span>
                  <span className="text-purple-500 text-sm">על השתתפות</span>
                </div>

                {/* Remaining Attempts */}
                {(attemptsUsed + 1) < challenge.max_attempts && (
                  <p className="text-sm text-gray-500 mb-4">
                    נשארו לך עוד {challenge.max_attempts - attemptsUsed - 1} ניסיונות
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full h-12 gap-2"
                onClick={handleViewLeaderboard}
              >
                <Trophy className="h-5 w-5" />
                צפייה בלוח המובילים
              </Button>

              {(attemptsUsed + 1) < challenge.max_attempts && (
                <Button
                  variant="outline"
                  className="w-full h-12 gap-2"
                  onClick={handleRetry}
                >
                  <RotateCcw className="h-5 w-5" />
                  ניסיון נוסף
                </Button>
              )}

              <Button
                className="w-full h-12 bg-purple-500 hover:bg-purple-600"
                onClick={handleFinish}
              >
                סיום
              </Button>
            </div>
          </>
        )}
      </main>

      {/* Recording Overlay */}
      {showRecordingOverlay && (
        <RecordingOverlay
          maxDuration={challenge.criteria.duration_range[1]}
          minDuration={challenge.criteria.duration_range[0]}
          onComplete={handleRecordingComplete}
          onCancel={handleRecordingCancel}
          exerciseTitle={`${challenge.song_title} - ${challenge.title_he}`}
        />
      )}
    </div>
  );
}
