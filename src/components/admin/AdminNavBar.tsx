import { useState, useRef, useEffect } from 'react';
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
  Tags,
  Wallet,
  MoreHorizontal,
} from 'lucide-react';

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'תצוגות',
    items: [
      { href: '/student', label: 'תלמיד', icon: GraduationCap },
      { href: '/teacher', label: 'מורה', icon: Users },
    ],
  },
  {
    label: 'תקשורת',
    items: [
      { href: '/student/chat', label: 'צ\'אט תלמיד', icon: MessageSquare },
      { href: '/teacher/chat', label: 'צ\'אט מורה', icon: MessageSquare },
      { href: '/admin/live-chat', label: 'צ\'אט חי', icon: Radio },
    ],
  },
  {
    label: 'ניהול',
    items: [
      { href: '/admin/analytics', label: 'אנליטיקס', icon: BarChart3 },
      { href: '/admin/resources', label: 'משאבים', icon: Gauge },
      { href: '/admin/marketing', label: 'שיווק', icon: Sparkles },
      { href: '/admin/cashflow', label: 'תזרים', icon: Wallet },
    ],
  },
];

const moreItems: NavItem[] = [
  { href: '/admin/memory', label: 'זיכרון', icon: Brain },
  { href: '/admin/names', label: 'שמות', icon: Tags },
];

const AdminNavBar = () => {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isMoreActive = moreItems.some((item) => location.pathname.startsWith(item.href));

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-10">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-medium">Admin</span>
          </div>
          <nav className="flex items-center gap-0.5">
            {navGroups.map((group, groupIdx) => (
              <div key={group.label} className="flex items-center">
                {groupIdx > 0 && (
                  <div className="w-px h-4 bg-amber-500/20 mx-1.5" />
                )}
                {group.items.map((item) => {
                  const isActive = location.pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                          : 'text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400'
                      )}
                    >
                      <item.icon className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}

            {/* More dropdown */}
            <div className="w-px h-4 bg-amber-500/20 mx-1.5" />
            <div className="relative" ref={moreRef}>
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                  isMoreActive || moreOpen
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                    : 'text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400'
                )}
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
                <span className="hidden md:inline">עוד</span>
              </button>
              {moreOpen && (
                <div className="absolute left-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[140px] z-50">
                  {moreItems.map((item) => {
                    const isActive = location.pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setMoreOpen(false)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors',
                          isActive
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <item.icon className="w-3.5 h-3.5" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default AdminNavBar;
