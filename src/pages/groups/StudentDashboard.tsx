import { useNavigate } from 'react-router-dom';
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

// =====================================================
// STUDENT DASHBOARD PAGE
// Main dashboard for group students
// =====================================================

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { student, isLoading: isLoadingStudent } = useGroupStudent();
  const { exercises, progress, isLoading: isLoadingPlan } = useDailyPlan();
  const { data: activeChallenge, isLoading: isLoadingChallenge } = useActiveChallenge();
  const { data: leaderboardData } = useChallengeLeaderboard(activeChallenge?.id);

  // Loading state
  if (isLoadingStudent) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      </StudentLayout>
    );
  }

  // Redirect to registration if no student profile
  if (!student) {
    navigate('/groups/register');
    return null;
  }

  // Redirect to onboarding if not completed
  if (!student.onboarding_completed) {
    navigate('/groups/onboarding');
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

        {/* Quick Tips */}
        <QuickTip />
      </div>
    </StudentLayout>
  );
}

// =====================================================
// QUICK TIP COMPONENT
// =====================================================

function QuickTip() {
  const tips = [
    { emoji: '💡', text: 'תרגול קצר כל יום עדיף על אימון ארוך פעם בשבוע' },
    { emoji: '🎤', text: 'תמיד התחילו עם חימום קול - זה שומר על הקול שלכם' },
    { emoji: '🎧', text: 'הקשיבו להקלטות שלכם - זו הדרך הטובה ביותר להשתפר' },
    { emoji: '💪', text: 'גם אם קשה - המשיכו! ההתמדה היא המפתח להצלחה' },
    { emoji: '🌟', text: 'אל תשוו את עצמכם לאחרים - התחרו רק בעצמכם מאתמול' },
  ];

  const tip = tips[Math.floor(Math.random() * tips.length)];

  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
      <div className="flex gap-3">
        <span className="text-2xl">{tip.emoji}</span>
        <div>
          <h4 className="font-medium text-purple-900 text-sm">טיפ היום</h4>
          <p className="text-purple-700 text-sm mt-0.5">{tip.text}</p>
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
