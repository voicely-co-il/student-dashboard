import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface StudentProtectedRouteProps {
  children: ReactNode;
}

/**
 * Route guard that only allows students to access.
 * - Redirects to /auth if not logged in
 * - Redirects to /teacher if user is a teacher
 * - Redirects to /admin if user is an admin
 */
const StudentProtectedRoute = ({ children }: StudentProtectedRouteProps) => {
  const { user, role, isLoading, isStudent } = useAuth();

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

  // Redirect teachers to their dashboard
  if (role === 'teacher') {
    return <Navigate to="/teacher" replace />;
  }

  // Redirect admins to their dashboard
  if (role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  // Only allow students
  if (!isStudent) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default StudentProtectedRoute;
