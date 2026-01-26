import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { StudentLayout } from '@/components/groups/layout';
import Leaderboard from '@/components/groups/challenges/Leaderboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Trophy,
  Clock,
  Users,
  Music,
  ArrowRight,
  Mic,
  Play,
  Pause,
  Info,
  Star,
  Award,
  Target,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';
import { useChallengeDetail, useChallengeLeaderboard, useMyEntries } from '@/hooks/groups';
import { WeeklyChallenge, LeaderboardEntry, GroupStudent, ChallengeEntry } from '@/types/groups';

// =====================================================
// DEMO DATA
// =====================================================

const DEMO_CHALLENGE: WeeklyChallenge = {
  id: 'challenge-1',
  group_id: 'group-diamonds',
  title: 'אתגר יהלומים',
  title_he: 'אתגר יהלומים',
  description: 'שרו את הקטע המרכזי של Diamonds',
  description_he: 'שרו את הקטע "Shine bright like a diamond" מהשיר של ריהאנה. התמקדו בדיוק הצלילים ובאנרגיה!',
  song_title: 'Diamonds',
  song_artist: 'Rihanna',
  song_excerpt_start_sec: 45,
  song_excerpt_end_sec: 90,
  reference_audio_url: 'https://example.com/diamonds-excerpt.mp3',
  lyrics_text: 'Shine bright like a diamond\nShine bright like a diamond\nFind light in the beautiful sea\nI choose to be happy',
  lyrics_he: 'זרחי כמו יהלום\nזרחי כמו יהלום\nמצאי אור בים היפה\nאני בוחרת להיות שמחה',
  criteria: { min_pitch_accuracy: 70, min_energy_level: 60, no_breaks: false, duration_range: [30, 60] },
  max_attempts: 3,
  scoring_weights: { ai_score: 0.4, teacher_score: 0.4, effort_score: 0.1, participation_bonus: 0.1 },
  leaderboard_mode: 'full',
  allow_comments: true,
  show_scores_publicly: true,
  prizes: {
    first: { xp: 100, badge: '🥇' },
    second: { xp: 75, badge: '🥈' },
    third: { xp: 50, badge: '🥉' },
    participation: { xp: 25 },
  },
  status: 'active',
  starts_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  ends_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
  created_by: 'teacher-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const DEMO_STUDENT: GroupStudent = {
  id: '72578603-7d42-47d5-9a42-668864c499fb',
  user_id: 'demo-user',
  parent_email: 'demo@example.com',
  parent_name: 'הורה',
  student_name: 'עדי',
  avatar_emoji: '🌟',
  age: 12,
  age_group: '10-12',
  consent_audio_recording: true,
  consent_data_processing: true,
  consent_peer_sharing: true,
  ui_theme: 'auto',
  notification_preferences: { daily_reminder: true, challenge_updates: true, weekly_report: true },
  current_streak: 3,
  longest_streak: 7,
  total_xp: 850,
  current_level: 4,
  is_active: true,
  onboarding_completed: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const createDemoEntry = (name: string, emoji: string, score: number, rank: number): LeaderboardEntry => ({
  rank,
  student: { ...DEMO_STUDENT, id: `student-${rank}`, student_name: name, avatar_emoji: emoji },
  entry: {
    id: `entry-${rank}`,
    challenge_id: 'challenge-1',
    student_id: `student-${rank}`,
    recording_url: '',
    duration_seconds: 45,
    attempt_number: 1,
    final_score: score,
    participation_bonus: 10,
    is_shared: true,
    likes_count: Math.floor(Math.random() * 8),
    comments_count: Math.floor(Math.random() * 4),
    xp_earned: rank === 1 ? 100 : rank === 2 ? 75 : rank === 3 ? 50 : 25,
    is_best_entry: true,
    is_disqualified: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  isCurrentUser: name === 'עדי',
});

const DEMO_LEADERBOARD: LeaderboardEntry[] = [
  createDemoEntry('שיראל', '💫', 92, 1),
  createDemoEntry('אורין', '🎤', 88, 2),
  createDemoEntry('עדי', '🌟', 85, 3),
  createDemoEntry('לירז', '🦋', 82, 4),
  createDemoEntry('תהל', '🎵', 78, 5),
];

const DEMO_MY_ENTRIES: ChallengeEntry[] = [
  {
    id: 'my-entry-1',
    challenge_id: 'challenge-1',
    student_id: DEMO_STUDENT.id,
    recording_url: '',
    duration_seconds: 42,
    attempt_number: 1,
    ai_score: 82,
    final_score: 85,
    participation_bonus: 10,
    is_shared: true,
    likes_count: 3,
    comments_count: 1,
    xp_earned: 50,
    is_best_entry: true,
    is_disqualified: false,
    ai_feedback_he: 'שירה יפה! הצליל היה מדויק והאנרגיה טובה.',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// =====================================================
// CHALLENGE DETAIL PAGE
// =====================================================

export default function ChallengeDetailPage() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';

  // Real data hooks
  const { data: realChallenge, isLoading } = useChallengeDetail(isDemo ? undefined : challengeId);
  const { data: realLeaderboard } = useChallengeLeaderboard(isDemo ? undefined : challengeId);
  const { data: realMyEntries } = useMyEntries(isDemo ? undefined : challengeId);

  // Use demo or real data
  const challenge = isDemo ? DEMO_CHALLENGE : realChallenge;
  const leaderboard = isDemo ? DEMO_LEADERBOARD : (realLeaderboard?.leaderboard || []);
  const myRank = isDemo ? 3 : realLeaderboard?.myRank;
  const myEntries = isDemo ? DEMO_MY_ENTRIES : (realMyEntries || []);

  const [isPlayingReference, setIsPlayingReference] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Audio playback
  const toggleReferenceAudio = () => {
    if (!audioRef.current && challenge?.reference_audio_url) {
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

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      </StudentLayout>
    );
  }

  if (!challenge) {
    return (
      <StudentLayout>
        <div className="text-center py-12">
          <span className="text-5xl">🔍</span>
          <h2 className="text-xl font-bold text-gray-900 mt-4">האתגר לא נמצא</h2>
          <Button
            className="mt-4"
            onClick={() => navigate('/groups/student/challenges')}
          >
            חזרה לאתגרים
          </Button>
        </div>
      </StudentLayout>
    );
  }

  const isActive = challenge.status === 'active';
  const attemptsUsed = myEntries.length;
  const attemptsRemaining = challenge.max_attempts - attemptsUsed;
  const canAttempt = isActive && attemptsRemaining > 0;
  const bestEntry = myEntries.find(e => e.is_best_entry);

  const handleRecord = () => {
    navigate(`/groups/student/challenges/${challengeId}/record${isDemo ? '?demo=true' : ''}`);
  };

  return (
    <StudentLayout>
      <div className="space-y-4 pb-4">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => navigate('/groups/student/challenges' + (isDemo ? '?demo=true' : ''))}
        >
          <ArrowRight className="h-4 w-4" />
          חזרה לאתגרים
        </Button>

        {/* Challenge Header */}
        <Card className="bg-white overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 p-5 text-white">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-5 w-5" />
                  <span className="text-sm font-medium opacity-90">
                    {isActive ? 'אתגר פעיל' : 'אתגר שהסתיים'}
                  </span>
                </div>
                <h1 className="text-2xl font-bold">{challenge.title_he}</h1>
              </div>
              {isActive && <TimeRemaining endsAt={challenge.ends_at} />}
            </div>
          </div>

          <CardContent className="p-4 space-y-4">
            {/* Song Info */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Music className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{challenge.song_title}</h3>
                {challenge.song_artist && (
                  <p className="text-sm text-gray-600">{challenge.song_artist}</p>
                )}
              </div>
              {challenge.reference_audio_url && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={toggleReferenceAudio}
                >
                  {isPlayingReference ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {isPlayingReference ? 'עצור' : 'האזן'}
                </Button>
              )}
            </div>

            {/* Description */}
            {challenge.description_he && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4 text-purple-500" />
                  על האתגר
                </h3>
                <p className="text-gray-600 text-sm">{challenge.description_he}</p>
              </div>
            )}

            {/* Lyrics */}
            {challenge.lyrics_he && (
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                <h3 className="font-semibold text-purple-900 mb-2">מילות השיר</h3>
                <p className="text-purple-800 text-sm whitespace-pre-line leading-relaxed">
                  {challenge.lyrics_he}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Progress */}
        {myEntries.length > 0 && (
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Star className="h-5 w-5 text-yellow-500" />
                ההשתתפות שלי
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Best Score */}
              {bestEntry && (
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                  <div>
                    <p className="text-sm text-purple-600 font-medium">הציון הטוב ביותר</p>
                    <p className="text-3xl font-bold text-purple-700">{bestEntry.final_score}%</p>
                  </div>
                  {myRank && (
                    <div className="text-center">
                      <span className="text-3xl">{getRankEmoji(myRank)}</span>
                      <p className="text-sm text-purple-600 mt-1">מקום {myRank}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Feedback */}
              {bestEntry?.ai_feedback_he && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">{bestEntry.ai_feedback_he}</p>
                </div>
              )}

              {/* Attempts */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">ניסיונות:</span>
                <span className="font-medium">
                  {attemptsUsed} / {challenge.max_attempts}
                </span>
              </div>
              <Progress value={(attemptsUsed / challenge.max_attempts) * 100} className="h-2" />
            </CardContent>
          </Card>
        )}

        {/* Rules & Criteria */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-purple-500" />
              חוקי האתגר
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">מקסימום ניסיונות</span>
                <span className="font-medium">{challenge.max_attempts}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">אורך הקלטה</span>
                <span className="font-medium">
                  {challenge.criteria.duration_range[0]}-{challenge.criteria.duration_range[1]} שניות
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">דיוק צליל מינימלי</span>
                <span className="font-medium">{challenge.criteria.min_pitch_accuracy}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prizes */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="h-5 w-5 text-yellow-500" />
              פרסים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2 text-center">
              <PrizeItem rank={1} xp={challenge.prizes.first.xp} />
              <PrizeItem rank={2} xp={challenge.prizes.second.xp} />
              <PrizeItem rank={3} xp={challenge.prizes.third.xp} />
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-2xl">🎤</span>
                <p className="text-xs text-gray-600 mt-1">השתתפות</p>
                <p className="text-sm font-bold text-purple-600">+{challenge.prizes.participation.xp}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-yellow-500" />
              לוח מובילים
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leaderboard.length > 0 ? (
              <Leaderboard
                entries={leaderboard}
                mode={challenge.leaderboard_mode}
                currentUserId={DEMO_STUDENT.id}
              />
            ) : (
              <div className="text-center py-6">
                <span className="text-4xl">🏆</span>
                <p className="text-gray-600 mt-2">עדיין אין משתתפים</p>
                <p className="text-sm text-purple-600">היה הראשון להשתתף!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CTA Button */}
        {isActive && (
          <div className="sticky bottom-20 pt-4 bg-gradient-to-t from-gray-50 via-gray-50">
            <Button
              size="lg"
              className={cn(
                'w-full h-14 text-lg gap-2',
                canAttempt
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                  : 'bg-gray-300 cursor-not-allowed'
              )}
              onClick={handleRecord}
              disabled={!canAttempt}
            >
              <Mic className="h-5 w-5" />
              {canAttempt
                ? attemptsUsed > 0
                  ? `ניסיון נוסף (${attemptsRemaining} נותרו)`
                  : 'להשתתף באתגר!'
                : 'הגעת למקסימום ניסיונות'}
            </Button>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}

// =====================================================
// HELPER COMPONENTS
// =====================================================

function TimeRemaining({ endsAt }: { endsAt: string }) {
  const end = new Date(endsAt);
  const now = new Date();
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return null;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const isUrgent = days === 0;

  return (
    <div className={cn(
      'px-3 py-2 rounded-lg text-sm',
      isUrgent ? 'bg-red-500/20 animate-pulse' : 'bg-white/20'
    )}>
      <div className="flex items-center gap-1.5">
        <Clock className="h-4 w-4" />
        <span className="font-medium">
          {days > 0 ? `${days} ימים ${hours} שעות` : `${hours} שעות`}
        </span>
      </div>
      <p className="text-xs opacity-75 mt-0.5">עד סיום האתגר</p>
    </div>
  );
}

function PrizeItem({ rank, xp }: { rank: number; xp: number }) {
  const emojis = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const labels = { 1: 'ראשון', 2: 'שני', 3: 'שלישי' };
  const bgColors = {
    1: 'bg-yellow-50',
    2: 'bg-gray-50',
    3: 'bg-orange-50',
  };

  return (
    <div className={cn('p-3 rounded-lg', bgColors[rank as 1 | 2 | 3])}>
      <span className="text-2xl">{emojis[rank as 1 | 2 | 3]}</span>
      <p className="text-xs text-gray-600 mt-1">{labels[rank as 1 | 2 | 3]}</p>
      <p className="text-sm font-bold text-purple-600">+{xp} XP</p>
    </div>
  );
}

function getRankEmoji(rank: number): string {
  switch (rank) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return '🏅';
  }
}
