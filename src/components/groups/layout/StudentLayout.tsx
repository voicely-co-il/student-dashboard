import { ReactNode } from 'react';
import { useGroupStudent } from '@/hooks/groups';
import { cn } from '@/lib/utils';
import BottomNav from './BottomNav';
import Header from './Header';

// =====================================================
// STUDENT LAYOUT
// Main layout wrapper for group student dashboard
// =====================================================

interface StudentLayoutProps {
  children: ReactNode;
  title?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  hideNav?: boolean;
  className?: string;
}

export default function StudentLayout({
  children,
  title,
  showBackButton = false,
  onBack,
  hideNav = false,
  className,
}: StudentLayoutProps) {
  const { student } = useGroupStudent();

  // Determine theme based on age group
  const isYounger = student?.age_group === '10-12';
  const themeClass = isYounger ? 'theme-playful' : 'theme-mature';

  return (
    <div
      className={cn(
        'min-h-screen bg-gradient-to-b',
        isYounger
          ? 'from-purple-50 via-blue-50 to-pink-50'
          : 'from-slate-50 via-white to-slate-50',
        themeClass
      )}
    >
      {/* Header */}
      <Header
        title={title}
        showBackButton={showBackButton}
        onBack={onBack}
        studentName={student?.student_name}
        avatarEmoji={student?.avatar_emoji}
        streak={student?.current_streak}
        xp={student?.total_xp}
      />

      {/* Main Content */}
      <main
        className={cn(
          'pb-20 pt-16 px-4 mx-auto',
          // Responsive width: mobile narrow, desktop wider
          'max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl',
          className
        )}
      >
        {children}
      </main>

      {/* Bottom Navigation */}
      {!hideNav && <BottomNav />}
    </div>
  );
}
