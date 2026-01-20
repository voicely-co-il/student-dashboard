import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface TeacherProtectedRouteProps {
  children: ReactNode;
}

/**
 * Route guard that only allows teachers to access.
 * - Redirects to /auth if not logged in
 * - Redirects to /student if user is a student
 * - Redirects to /admin if user is an admin (admins have their own routes)
 */
const TeacherProtectedRoute = ({ children }: TeacherProtectedRouteProps) => {
  const { user, role, isLoading, isTeacher } = useAuth();

  // Show loading while checking auth and role
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-voicely-green" />
          <span className="text-muted-foreground">טוען...</span>
        </div>
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect students to their dashboard
  if (role === 'student') {
    return <Navigate to="/student" replace />;
  }

  // Admins can access teacher routes (they have full access)
  // But if they want admin-specific routes, redirect them
  if (role === 'admin') {
    // Admins can view teacher dashboard - don't redirect
    // They have access to everything
  }

  // Only allow teachers (and admins)
  if (!isTeacher && role !== 'admin') {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default TeacherProtectedRoute;
