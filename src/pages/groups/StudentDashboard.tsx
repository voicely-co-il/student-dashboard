import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { StudentLayout } from '@/components/groups/layout';
import {
  NextLessonCard,
  WeeklyProgressCard,
  TodaysExercisesCard,
  ActiveChallengeCard,
  NoChallengeCard,
} from '@/components/groups/dashboard';
import { useGroupStudent, useDailyPlan, useActiveChallenge, useChallengeLeaderboard } from '@/hooks/groups';
import { Loader2 } from 'lucide-react';
import { ExerciseWithProgress } from '@/types/groups';

// Real demo student (Adi) - data from actual transcripts
const DEMO_STUDENT = {
  id: '72578603-7d42-47d5-9a42-668864c499fb',
  student_name: 'עדי',
  avatar_emoji: '🌟',
  current_streak: 3,
  total_xp: 850,
  current_level: 4,
  onboarding_completed: true,
  age_group: '10-12' as const,
};

// Tips from recent lesson (Jan 22, 2026 - Group Lesson)
const LESSON_TIPS = [
  { emoji: '🎵', text: 'תשמרי על הנשימה בקטעים הארוכים של Diamonds - זה יעזור לך להגיע לסוף הפסוק', source: 'מהשיעור האחרון' },
  { emoji: '💎', text: 'את עושה עבודה מעולה עם הויברטו! תמשיכי לתרגל את זה', source: 'ענבל אמרה' },
  { emoji: '🎤', text: 'נסי לשיר יותר מהבטן ופחות מהגרון - זה ישמור על הקול שלך', source: 'טיפ מהשיעור' },
  { emoji: '✨', text: 'השירה שלך ב-"Shine bright like a diamond" הייתה מצוינת! כל הכבוד!', source: 'פידבק מענבל' },
];

// =====================================================
// STUDENT DASHBOARD PAGE
// Main dashboard for group students
// =====================================================

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';

  const { student: realStudent, isLoading: isLoadingStudent } = useGroupStudent();
  const { exercises, progress, isLoading: isLoadingPlan } = useDailyPlan();
  const { data: activeChallenge, isLoading: isLoadingChallenge } = useActiveChallenge();
  const { data: leaderboardData } = useChallengeLeaderboard(activeChallenge?.id);

  // Use demo student if in demo mode
  const student = isDemo ? DEMO_STUDENT : realStudent;

  // Redirect logic (only when NOT in demo mode)
  useEffect(() => {
    if (isDemo) return; // Skip all redirects in demo mode
    if (isLoadingStudent) return; // Wait for loading

    if (!realStudent) {
      navigate('/groups/register');
    } else if (!realStudent.onboarding_completed) {
      navigate('/groups/onboarding');
    }
  }, [isDemo, isLoadingStudent, realStudent, navigate]);

  // Loading state (skip in demo mode)
  if (!isDemo && isLoadingStudent) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      </StudentLayout>
    );
  }

  // Don't render if redirecting (not in demo mode and no valid student)
  if (!isDemo && (!realStudent || !realStudent.onboarding_completed)) {
    return null;
  }

  // Handlers
  const handleStartExercise = (exercise: ExerciseWithProgress) => {
    navigate(`/groups/student/practice/${exercise.id}`);
  };

  const handleViewAllExercises = () => {
    navigate('/groups/student/practice');
  };

  const handleJoinChallenge = () => {
    if (activeChallenge) {
      navigate(`/groups/student/challenges/${activeChallenge.id}/record`);
    }
  };

  const handleViewChallengeDetails = () => {
    if (activeChallenge) {
      navigate(`/groups/student/challenges/${activeChallenge.id}`);
    }
  };

  // Mock next lesson data (should come from real data)
  const nextLesson = {
    date: getNextLessonDate(),
    teacherName: 'ענבל',
    duration: 45,
    zoomLink: 'https://zoom.us/j/xxx',
  };

  // Mock progress data (should aggregate from student_progress table)
  const weeklyStats = {
    pitchAccuracy: 73,
    rhythmAccuracy: 81,
    breathControl: 68,
    energyLevel: 75,
    previousPitch: 70,
    previousRhythm: 78,
    previousBreath: 72,
    previousEnergy: 70,
    exercisesCompleted: progress.completed * 3, // Approximate weekly
    exercisesTotal: 21,
  };

  return (
    <StudentLayout>
      <div className="space-y-4 pb-4">
        {/* Welcome Message */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            היי {student.student_name}! 👋
          </h1>
          <p className="text-gray-600 mt-1">
            {getGreetingMessage(student.current_streak)}
          </p>
        </div>

        {/* Next Lesson */}
        <NextLessonCard {...nextLesson} />

        {/* Weekly Progress */}
        <WeeklyProgressCard {...weeklyStats} />

        {/* Active Challenge */}
        {isLoadingChallenge ? (
          <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
        ) : activeChallenge ? (
          <ActiveChallengeCard
            challenge={activeChallenge}
            participantsCount={leaderboardData?.leaderboard.length || 0}
            totalStudents={4} // Should come from group data
            myRank={leaderboardData?.myRank || undefined}
            hasParticipated={!!leaderboardData?.myRank}
            onJoin={handleJoinChallenge}
            onViewDetails={handleViewChallengeDetails}
          />
        ) : (
          <NoChallengeCard />
        )}

        {/* Today's Exercises */}
        {isLoadingPlan ? (
          <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
        ) : (
          <TodaysExercisesCard
            exercises={exercises}
            onStartExercise={handleStartExercise}
            onViewAll={handleViewAllExercises}
          />
        )}

        {/* Lesson Tips */}
        <LessonTip isDemo={isDemo} />
      </div>
    </StudentLayout>
  );
}

// =====================================================
// LESSON TIP COMPONENT
// Tips from the most recent lesson
// =====================================================

function LessonTip({ isDemo }: { isDemo: boolean }) {
  // Generic tips for non-demo users
  const genericTips = [
    { emoji: '💡', text: 'תרגול קצר כל יום עדיף על אימון ארוך פעם בשבוע', source: 'טיפ כללי' },
    { emoji: '🎤', text: 'תמיד התחילו עם חימום קול - זה שומר על הקול שלכם', source: 'טיפ כללי' },
    { emoji: '🎧', text: 'הקשיבו להקלטות שלכם - זו הדרך הטובה ביותר להשתפר', source: 'טיפ כללי' },
    { emoji: '💪', text: 'גם אם קשה - המשיכו! ההתמדה היא המפתח להצלחה', source: 'טיפ כללי' },
    { emoji: '🌟', text: 'אל תשוו את עצמכם לאחרים - התחרו רק בעצמכם מאתמול', source: 'טיפ כללי' },
  ];

  // Use lesson tips for demo mode (Adi), generic tips otherwise
  const tips = isDemo ? LESSON_TIPS : genericTips;
  const tip = tips[Math.floor(Math.random() * tips.length)];

  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
      <div className="flex gap-3">
        <span className="text-2xl">{tip.emoji}</span>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-purple-900 text-sm">
              {isDemo ? 'מהשיעור האחרון' : 'טיפ היום'}
            </h4>
            {isDemo && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                22/01
              </span>
            )}
          </div>
          <p className="text-purple-700 text-sm mt-0.5">{tip.text}</p>
          {tip.source && tip.source !== 'טיפ כללי' && (
            <p className="text-purple-500 text-xs mt-1">{tip.source}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// HELPERS
// =====================================================

function getNextLessonDate(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();

  // Assuming lessons are on Monday (1) at 17:00
  const daysUntilLesson = dayOfWeek <= 1 ? 1 - dayOfWeek : 8 - dayOfWeek;
  const nextLesson = new Date(now);
  nextLesson.setDate(now.getDate() + daysUntilLesson);
  nextLesson.setHours(17, 0, 0, 0);

  return nextLesson;
}

function getGreetingMessage(streak: number): string {
  if (streak >= 7) {
    return `🔥 וואו! ${streak} ימים ברצף! את/ה אלופים!`;
  }
  if (streak >= 3) {
    return `🌟 ${streak} ימים ברצף - ממשיכים ככה!`;
  }
  if (streak > 0) {
    return `💪 יש לך רצף של ${streak} ימים - בואו נשמור עליו!`;
  }
  return 'בואו נתחיל לתרגל היום!';
}
