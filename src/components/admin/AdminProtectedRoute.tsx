import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface AdminProtectedRouteProps {
  children: ReactNode;
}

/**
 * Route guard that only allows admins to access.
 * - Redirects to /auth if not logged in
 * - Redirects to /student if user is a student
 * - Redirects to /teacher if user is a teacher
 */
const AdminProtectedRoute = ({ children }: AdminProtectedRouteProps) => {
  const { user, role, isLoading, isAdmin } = useAuth();

  // Show loading while checking auth and role
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-voicely-green" />
          <span className="text-muted-foreground">בודק הרשאות...</span>
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

  // Redirect teachers to their dashboard
  if (role === 'teacher') {
    return <Navigate to="/teacher" replace />;
  }

  // Only allow admins
  if (!isAdmin) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;
