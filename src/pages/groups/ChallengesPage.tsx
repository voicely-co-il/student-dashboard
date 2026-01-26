import { useNavigate, useSearchParams } from 'react-router-dom';
import { StudentLayout } from '@/components/groups/layout';
import ChallengeCard from '@/components/groups/challenges/ChallengeCard';
import Leaderboard, { CompactLeaderboard } from '@/components/groups/challenges/Leaderboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Clock, Star, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WeeklyChallenge, LeaderboardEntry, GroupStudent, ChallengeEntry } from '@/types/groups';

// =====================================================
// DEMO DATA - Will be replaced with real data from hooks
// =====================================================

const DEMO_STUDENT: GroupStudent = {
  id: '72578603-7d42-47d5-9a42-668864c499fb',
  user_id: 'demo-user',
  parent_email: 'demo@example.com',
  parent_name: 'הורה לדוגמה',
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

const DEMO_CHALLENGES: WeeklyChallenge[] = [
  {
    id: 'challenge-1',
    group_id: 'group-diamonds',
    title: 'אתגר יהלומים',
    title_he: 'אתגר יהלומים',
    description_he: 'שרו את הקטע המרכזי של Diamonds מאת ריהאנה',
    song_title: 'Diamonds',
    song_artist: 'Rihanna',
    song_excerpt_start_sec: 45,
    song_excerpt_end_sec: 90,
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
  },
  {
    id: 'challenge-2',
    group_id: 'group-diamonds',
    title: 'אתגר Let It Go',
    title_he: 'אתגר Let It Go',
    description_he: 'שרו את הפזמון של Let It Go מתוך Frozen',
    song_title: 'Let It Go',
    song_artist: 'Frozen',
    song_excerpt_start_sec: 60,
    song_excerpt_end_sec: 120,
    criteria: { min_pitch_accuracy: 65, min_energy_level: 70, no_breaks: false, duration_range: [40, 80] },
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
    status: 'ended',
    starts_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    ends_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_by: 'teacher-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const createDemoEntry = (studentName: string, emoji: string, score: number, rank: number): LeaderboardEntry => ({
  rank,
  student: { ...DEMO_STUDENT, id: `student-${rank}`, student_name: studentName, avatar_emoji: emoji },
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
    likes_count: Math.floor(Math.random() * 5),
    comments_count: Math.floor(Math.random() * 3),
    xp_earned: 25,
    is_best_entry: true,
    is_disqualified: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  isCurrentUser: studentName === 'עדי',
});

const DEMO_LEADERBOARD: LeaderboardEntry[] = [
  createDemoEntry('שיראל', '💫', 92, 1),
  createDemoEntry('אורין', '🎤', 88, 2),
  createDemoEntry('עדי', '🌟', 85, 3),
  createDemoEntry('לירז', '🦋', 82, 4),
];

// =====================================================
// CHALLENGES PAGE
// =====================================================

export default function ChallengesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';

  // In real implementation, use hooks:
  // const { data: challenges } = useChallenges();
  // const { data: activeChallenge } = useActiveChallenge();
  // const { data: leaderboard } = useChallengeLeaderboard(activeChallenge?.id);

  const challenges = isDemo ? DEMO_CHALLENGES : [];
  const activeChallenge = challenges.find(c => c.status === 'active');
  const pastChallenges = challenges.filter(c => c.status === 'ended');
  const leaderboard = isDemo ? DEMO_LEADERBOARD : [];
  const myRank = leaderboard.find(e => e.isCurrentUser)?.rank;

  const handleChallengeClick = (challengeId: string) => {
    navigate(`/groups/student/challenges/${challengeId}${isDemo ? '?demo=true' : ''}`);
  };

  const handleJoinChallenge = () => {
    if (activeChallenge) {
      navigate(`/groups/student/challenges/${activeChallenge.id}/record${isDemo ? '?demo=true' : ''}`);
    }
  };

  return (
    <StudentLayout>
      <div className="space-y-6 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Trophy className="h-6 w-6 text-purple-500" />
              אתגרים
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              התחרו, השתפרו וצברו XP!
            </p>
          </div>
          {myRank && (
            <div className="flex items-center gap-2 bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full">
              <Star className="h-4 w-4" />
              <span className="font-medium text-sm">מקום {myRank}</span>
            </div>
          )}
        </div>

        {/* Active Challenge */}
        {activeChallenge ? (
          <Card className="bg-white overflow-hidden">
            {/* Gradient Header */}
            <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 p-4 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-5 w-5" />
                    <span className="text-sm font-medium opacity-90">האתגר הפעיל</span>
                  </div>
                  <h2 className="text-xl font-bold">{activeChallenge.title_he}</h2>
                  <p className="text-sm opacity-90 mt-1">
                    {activeChallenge.song_title} • {activeChallenge.song_artist}
                  </p>
                </div>
                <TimeRemaining endsAt={activeChallenge.ends_at} />
              </div>
            </div>

            <CardContent className="p-4 space-y-4">
              {/* Description */}
              {activeChallenge.description_he && (
                <p className="text-gray-600 text-sm">{activeChallenge.description_he}</p>
              )}

              {/* Prizes */}
              <div className="flex items-center justify-around bg-gray-50 rounded-lg p-3">
                <PrizeDisplay rank={1} xp={activeChallenge.prizes.first.xp} />
                <PrizeDisplay rank={2} xp={activeChallenge.prizes.second.xp} />
                <PrizeDisplay rank={3} xp={activeChallenge.prizes.third.xp} />
              </div>

              {/* Mini Leaderboard */}
              {leaderboard.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    טבלת המובילים
                  </h3>
                  <CompactLeaderboard entries={leaderboard} maxEntries={3} />
                </div>
              )}

              {/* CTA */}
              <Button
                className="w-full gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                size="lg"
                onClick={handleJoinChallenge}
              >
                <Trophy className="h-5 w-5" />
                {myRank ? 'נסיון נוסף' : 'להשתתף באתגר!'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white">
            <CardContent className="p-8 text-center">
              <span className="text-5xl">🎯</span>
              <h2 className="text-xl font-bold text-gray-900 mt-4">אין אתגר פעיל כרגע</h2>
              <p className="text-gray-600 mt-2">האתגר הבא יתחיל בקרוב!</p>
              <p className="text-sm text-purple-600 mt-4">בינתיים, תמשיכו לתרגל ולצבור XP 💪</p>
            </CardContent>
          </Card>
        )}

        {/* Full Leaderboard (if active challenge) */}
        {activeChallenge && leaderboard.length > 0 && (
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trophy className="h-5 w-5 text-yellow-500" />
                כל המשתתפים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Leaderboard
                entries={leaderboard}
                mode={activeChallenge.leaderboard_mode}
                currentUserId={DEMO_STUDENT.id}
              />
            </CardContent>
          </Card>
        )}

        {/* Past Challenges */}
        {pastChallenges.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-400" />
              אתגרים קודמים
            </h2>
            <div className="space-y-3">
              {pastChallenges.map(challenge => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  participantsCount={4}
                  myRank={challenge.id === 'challenge-2' ? 2 : undefined}
                  hasParticipated={challenge.id === 'challenge-2'}
                  onClick={() => handleChallengeClick(challenge.id)}
                  className="bg-white"
                />
              ))}
            </div>
          </div>
        )}

        {/* How it works */}
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100">
          <CardContent className="p-4">
            <h3 className="font-semibold text-purple-900 mb-3">איך זה עובד? 🤔</h3>
            <div className="space-y-2 text-sm text-purple-800">
              <div className="flex items-start gap-2">
                <span className="text-purple-500">1.</span>
                <span>בכל שבוע יש אתגר חדש עם שיר לשיר</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-500">2.</span>
                <span>מקליטים את עצמכם שרים את הקטע</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-500">3.</span>
                <span>AI + ענבל מעריכים ונותנים ציון</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-500">4.</span>
                <span>3 הראשונים מקבלים פרסים ו-XP בונוס! 🏆</span>
              </div>
            </div>
          </CardContent>
        </Card>
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

  if (diff <= 0) return <span className="text-xs bg-white/20 px-2 py-1 rounded-full">הסתיים</span>;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  const isUrgent = days === 0 && hours < 24;

  return (
    <div className={cn(
      'px-3 py-1.5 rounded-full text-xs font-medium',
      isUrgent ? 'bg-red-500/20 animate-pulse' : 'bg-white/20'
    )}>
      <Clock className="h-3 w-3 inline ml-1" />
      {days > 0 ? `עוד ${days} ימים` : `עוד ${hours} שעות`}
    </div>
  );
}

function PrizeDisplay({ rank, xp }: { rank: number; xp: number }) {
  const emojis = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const labels = { 1: 'ראשון', 2: 'שני', 3: 'שלישי' };

  return (
    <div className="text-center">
      <span className="text-2xl">{emojis[rank as 1 | 2 | 3]}</span>
      <div className="text-xs text-gray-600 mt-1">מקום {labels[rank as 1 | 2 | 3]}</div>
      <div className="text-sm font-bold text-purple-600">+{xp} XP</div>
    </div>
  );
}
