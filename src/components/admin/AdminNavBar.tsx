import { useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  GraduationCap,
  Users,
  Shield,
  MessageSquare,
  Radio,
  Gauge,
  Sparkles,
  Brain,
} from 'lucide-react';

const navItems = [
  { href: '/student', label: 'דשבורד תלמיד', icon: GraduationCap },
  { href: '/student/chat', label: 'צ\'אט תלמיד', icon: MessageSquare },
  { href: '/teacher', label: 'דשבורד מורה', icon: Users },
  { href: '/teacher/chat', label: 'צ\'אט מורה', icon: MessageSquare },
  { href: '/admin/live-chat', label: 'צ\'אט חי', icon: Radio },
  { href: '/admin/analytics', label: 'אנליטיקס', icon: BarChart3 },
  { href: '/admin/resources', label: 'משאבים', icon: Gauge },
  { href: '/admin/marketing', label: 'שיווק', icon: Sparkles },
  { href: '/admin/memory', label: 'זיכרון', icon: Brain },
];

const AdminNavBar = () => {
  const location = useLocation();

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-10">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-medium">מצב Admin</span>
          </div>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                      : 'text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400'
                  )}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default AdminNavBar;
