import { Routes, Route, Navigate } from 'react-router-dom';

// Student Pages
import StudentDashboard from './StudentDashboard';
import PracticePage from './PracticePage';
import ExercisePage from './ExercisePage';
import ChallengesPage from './ChallengesPage';
import ChallengeDetailPage from './ChallengeDetailPage';
import ChallengeRecordPage from './ChallengeRecordPage';
import StudentProfilePage from './StudentProfilePage';
import GroupInfoPage from './GroupInfoPage';

// Teacher Pages
import TeacherDashboard from './TeacherDashboard';
import TeacherChallengesPage from './TeacherChallengesPage';
import CreateChallengePage from './CreateChallengePage';
import TeacherAnalyticsPage from './TeacherAnalyticsPage';
import TeacherStudentProfilePage from './TeacherStudentProfilePage';
import TeacherChallengeDetailPage from './TeacherChallengeDetailPage';

// Auth Pages
import RegisterPage from './RegisterPage';
import OnboardingPage from './OnboardingPage';

// =====================================================
// GROUPS ROUTES
// All routes for the groups/juniors platform
// =====================================================

export default function GroupsRoutes() {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="register" element={<RegisterPage />} />
      <Route path="onboarding" element={<OnboardingPage />} />

      {/* Student Routes */}
      <Route path="student" element={<StudentDashboard />} />
      <Route path="student/practice" element={<PracticePage />} />
      <Route path="student/practice/:exerciseId" element={<ExercisePage />} />
      <Route path="student/challenges" element={<ChallengesPage />} />
      <Route path="student/challenges/:challengeId" element={<ChallengeDetailPage />} />
      <Route path="student/challenges/:challengeId/record" element={<ChallengeRecordPage />} />
      <Route path="student/group" element={<GroupInfoPage />} />
      <Route path="student/profile" element={<StudentProfilePage />} />

      {/* Teacher Routes */}
      <Route path="teacher" element={<TeacherDashboard />} />
      <Route path="teacher/students/:studentId" element={<TeacherStudentProfilePage />} />
      <Route path="teacher/challenges" element={<TeacherChallengesPage />} />
      <Route path="teacher/challenges/new" element={<CreateChallengePage />} />
      <Route path="teacher/challenges/:challengeId" element={<TeacherChallengeDetailPage />} />
      <Route path="teacher/analytics" element={<TeacherAnalyticsPage />} />

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/groups/student" replace />} />
    </Routes>
  );
}

// =====================================================
// PLACEHOLDER PAGE (for routes not yet fully implemented)
// =====================================================

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <span className="text-6xl">🚧</span>
        <h1 className="text-2xl font-bold text-gray-900 mt-4">{title}</h1>
        <p className="text-gray-500 mt-2">דף זה בבנייה</p>
        <a
          href="/groups/student"
          className="inline-block mt-4 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
        >
          חזרה לדשבורד
        </a>
      </div>
    </div>
  );
}
