import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Target, Users, Mic, User } from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// BOTTOM NAVIGATION
// Mobile-first bottom navigation bar
// =====================================================

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  labelHe: string;
  path: string;
}

const navItems: NavItem[] = [
  {
    icon: Home,
    label: 'Home',
    labelHe: 'בית',
    path: '/groups/student',
  },
  {
    icon: Mic,
    label: 'Practice',
    labelHe: 'תרגול',
    path: '/groups/student/practice',
  },
  {
    icon: Target,
    label: 'Challenges',
    labelHe: 'אתגרים',
    path: '/groups/student/challenges',
  },
  {
    icon: Users,
    label: 'Group',
    labelHe: 'קבוצה',
    path: '/groups/student/group',
  },
  {
    icon: User,
    label: 'Profile',
    labelHe: 'פרופיל',
    path: '/groups/student/profile',
  },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-pb">
      <div className="max-w-lg mx-auto px-2">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/groups/student' && location.pathname.startsWith(item.path));

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  'flex flex-col items-center justify-center w-16 h-full',
                  'transition-all duration-200',
                  isActive
                    ? 'text-purple-600'
                    : 'text-gray-400 hover:text-gray-600'
                )}
              >
                <item.icon
                  className={cn(
                    'h-6 w-6 mb-1 transition-transform',
                    isActive && 'scale-110'
                  )}
                />
                <span className={cn(
                  'text-xs font-medium',
                  isActive && 'font-semibold'
                )}>
                  {item.labelHe}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
