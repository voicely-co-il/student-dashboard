import { Routes, Route, Navigate } from 'react-router-dom';

// Pages
import StudentDashboard from './StudentDashboard';
import TeacherDashboard from './TeacherDashboard';
import PracticePage from './PracticePage';
import ExercisePage from './ExercisePage';
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
      <Route path="student/challenges" element={<PlaceholderPage title="אתגרים" />} />
      <Route path="student/challenges/:challengeId" element={<PlaceholderPage title="אתגר" />} />
      <Route path="student/challenges/:challengeId/record" element={<PlaceholderPage title="הקלטת אתגר" />} />
      <Route path="student/group" element={<PlaceholderPage title="הקבוצה שלי" />} />
      <Route path="student/profile" element={<PlaceholderPage title="פרופיל" />} />

      {/* Teacher Routes */}
      <Route path="teacher" element={<TeacherDashboard />} />
      <Route path="teacher/students/:studentId" element={<PlaceholderPage title="פרופיל תלמיד" />} />
      <Route path="teacher/challenges" element={<PlaceholderPage title="ניהול אתגרים" />} />
      <Route path="teacher/challenges/new" element={<PlaceholderPage title="אתגר חדש" />} />
      <Route path="teacher/challenges/:challengeId" element={<PlaceholderPage title="פרטי אתגר" />} />
      <Route path="teacher/analytics" element={<PlaceholderPage title="אנליטיקס" />} />

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/groups/student" replace />} />
    </Routes>
  );
}

// =====================================================
// PLACEHOLDER PAGE (for routes not yet implemented)
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
