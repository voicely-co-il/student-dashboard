import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import AdminNavBar from './AdminNavBar';

interface AdminLayoutProps {
  children: ReactNode;
}

/**
 * Layout wrapper that shows admin navigation bar when user is admin.
 * Wraps page content and adds the admin nav bar at the top.
 */
const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AdminNavBar />
      <div className="flex-1">{children}</div>
    </div>
  );
};

export default AdminLayout;
