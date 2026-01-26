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
  LayoutGrid,
  ChevronDown,
  ChevronLeft,
  FlaskConical,
  UsersRound,
  ClipboardList,
  Trophy,
  Mic2,
  Menu,
  X,
} from 'lucide-react';

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; description?: string };

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'תצוגות',
    items: [
      { href: '/student', label: 'תלמיד', icon: GraduationCap, description: 'דשבורד תלמיד' },
      { href: '/teacher', label: 'מורה', icon: Users, description: 'דשבורד מורה' },
    ],
  },
  {
    label: 'קבוצות - תלמיד',
    items: [
      { href: '/groups/student?demo=true', label: 'דשבורד', icon: UsersRound, description: 'עדי - דמו' },
      { href: '/groups/student/practice?demo=true', label: 'תרגול', icon: Mic2, description: 'תרגילי קול' },
      { href: '/groups/student/challenges?demo=true', label: 'אתגרים', icon: Trophy, description: 'אתגרים שבועיים' },
      { href: '/groups/student/group?demo=true', label: 'הקבוצה', icon: Users, description: 'מידע על הקבוצה' },
    ],
  },
  {
    label: 'קבוצות - מורה',
    items: [
      { href: '/groups/teacher', label: 'דשבורד', icon: ClipboardList, description: 'סקירת קבוצה' },
      { href: '/groups/teacher/challenges', label: 'אתגרים', icon: Trophy, description: 'ניהול אתגרים' },
      { href: '/groups/teacher/analytics', label: 'אנליטיקס', icon: BarChart3, description: 'נתוני קבוצה' },
    ],
  },
  {
    label: 'תקשורת',
    items: [
      { href: '/student/chat', label: 'צ\'אט תלמיד', icon: MessageSquare, description: 'צ\'אט AI לתלמידים' },
      { href: '/teacher/chat', label: 'צ\'אט מורה', icon: MessageSquare, description: 'צ\'אט AI למורים' },
      { href: '/admin/live-chat', label: 'צ\'אט חי', icon: Radio, description: 'שיחות בזמן אמת' },
    ],
  },
  {
    label: 'ניהול',
    items: [
      { href: '/admin/analytics', label: 'אנליטיקס', icon: BarChart3, description: 'נתונים וסטטיסטיקות' },
      { href: '/admin/resources', label: 'משאבים', icon: Gauge, description: 'ניהול תוכן ומשאבים' },
      { href: '/admin/marketing', label: 'שיווק', icon: Sparkles, description: 'כלי שיווק ותוכן' },
      { href: '/admin/cashflow', label: 'תזרים', icon: Wallet, description: 'מעקב הכנסות והוצאות' },
    ],
  },
  {
    label: 'כלים',
    items: [
      { href: '/admin/ai-lab', label: 'מעבדה', icon: FlaskConical, description: 'AI Lab - ניסויים וכלים חדשים' },
      { href: '/admin/memory', label: 'זיכרון', icon: Brain, description: 'ניהול זיכרון AI' },
      { href: '/admin/names', label: 'שמות', icon: Tags, description: 'מיפוי שמות תלמידים' },
    ],
  },
];

const AdminNavBar = () => {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen && window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  // Find current active item for display
  const allItems = navGroups.flatMap((g) => g.items);
  const activeItem = allItems.find((item) => location.pathname.startsWith(item.href));

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    );
  };

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-10" ref={menuRef}>
          {/* Menu trigger */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                menuOpen
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                  : 'text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400'
              )}
            >
              {/* Hamburger on mobile, Grid on desktop */}
              <Menu className="w-4 h-4 md:hidden" />
              <LayoutGrid className="w-3.5 h-3.5 hidden md:block" />
              <span className="hidden sm:inline">{activeItem?.label || 'ניווט'}</span>
              <ChevronDown className={cn('w-3 h-3 transition-transform hidden md:block', menuOpen && 'rotate-180')} />
            </button>

            {/* Desktop: Dropdown mega menu */}
            {menuOpen && (
              <div className="hidden md:block absolute right-0 top-full mt-1 bg-popover border border-border rounded-xl shadow-xl z-50 p-4 min-w-[480px]">
                <div className="grid grid-cols-2 gap-4">
                  {navGroups.map((group) => (
                    <div key={group.label}>
                      <h3 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2 px-2">
                        {group.label}
                      </h3>
                      <div className="space-y-0.5">
                        {group.items.map((item) => {
                          const isActive = location.pathname.startsWith(item.href);
                          return (
                            <Link
                              key={item.href}
                              to={item.href}
                              onClick={() => setMenuOpen(false)}
                              className={cn(
                                'flex items-center gap-3 px-2 py-2 rounded-lg transition-colors group',
                                isActive
                                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                  : 'text-foreground hover:bg-muted'
                              )}
                            >
                              <div className={cn(
                                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                                isActive
                                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                  : 'bg-muted text-muted-foreground group-hover:bg-amber-500/10 group-hover:text-amber-600'
                              )}>
                                <item.icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-medium">{item.label}</div>
                                {item.description && (
                                  <div className="text-[10px] text-muted-foreground truncate">{item.description}</div>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Admin badge */}
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-medium">Admin</span>
          </div>
        </div>
      </div>

      {/* Mobile: Full-screen side drawer from right (RTL) */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setMenuOpen(false)}
          />

          {/* Drawer */}
          <div className="md:hidden fixed top-0 right-0 bottom-0 w-[85%] max-w-[320px] bg-background z-50 shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Drawer header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2 text-amber-600">
                <Shield className="w-5 h-5" />
                <span className="font-semibold">Admin Panel</span>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer content with accordion groups */}
            <div className="overflow-y-auto h-[calc(100vh-65px)] p-2">
              {navGroups.map((group) => {
                const isExpanded = expandedGroups.includes(group.label);
                const hasActiveItem = group.items.some((item) =>
                  location.pathname.startsWith(item.href)
                );

                return (
                  <div key={group.label} className="mb-1">
                    {/* Group header - clickable accordion */}
                    <button
                      onClick={() => toggleGroup(group.label)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        hasActiveItem
                          ? 'bg-amber-500/10 text-amber-700'
                          : 'text-muted-foreground hover:bg-muted'
                      )}
                    >
                      <span>{group.label}</span>
                      <ChevronLeft
                        className={cn(
                          'w-4 h-4 transition-transform',
                          isExpanded && '-rotate-90'
                        )}
                      />
                    </button>

                    {/* Group items */}
                    {isExpanded && (
                      <div className="mt-1 mr-2 space-y-0.5">
                        {group.items.map((item) => {
                          const isActive = location.pathname.startsWith(item.href);
                          return (
                            <Link
                              key={item.href}
                              to={item.href}
                              onClick={() => setMenuOpen(false)}
                              className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                                isActive
                                  ? 'bg-amber-500/15 text-amber-700'
                                  : 'text-foreground hover:bg-muted'
                              )}
                            >
                              <div
                                className={cn(
                                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                                  isActive
                                    ? 'bg-amber-500/20 text-amber-600'
                                    : 'bg-muted text-muted-foreground'
                                )}
                              >
                                <item.icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium">{item.label}</div>
                                {item.description && (
                                  <div className="text-xs text-muted-foreground truncate">
                                    {item.description}
                                  </div>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminNavBar;
