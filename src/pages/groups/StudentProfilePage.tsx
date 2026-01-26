import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { StudentLayout } from '@/components/groups/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  User,
  Bell,
  Palette,
  Shield,
  Trophy,
  Flame,
  Star,
  ArrowRight,
  ChevronLeft,
  Moon,
  Sun,
  Sparkles,
  Check,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGroupStudent } from '@/hooks/groups';
import { GroupStudent, AgeGroup } from '@/types/groups';

// =====================================================
// DEMO DATA
// =====================================================

const DEMO_STUDENT: GroupStudent = {
  id: '72578603-7d42-47d5-9a42-668864c499fb',
  user_id: 'demo-user',
  parent_email: 'parent@example.com',
  parent_name: 'אמא של עדי',
  parent_phone: '050-1234567',
  student_name: 'עדי',
  avatar_emoji: '🌟',
  age: 12,
  age_group: '10-12',
  consent_audio_recording: true,
  consent_data_processing: true,
  consent_peer_sharing: true,
  ui_theme: 'auto',
  notification_preferences: {
    daily_reminder: true,
    challenge_updates: true,
    weekly_report: true,
  },
  current_streak: 3,
  longest_streak: 12,
  total_xp: 850,
  current_level: 4,
  is_active: true,
  onboarding_completed: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: new Date().toISOString(),
};

const AVATAR_OPTIONS = ['🌟', '🎤', '🎵', '🦋', '🌈', '🔥', '💫', '🎭', '🦄', '🐱', '🐰', '🌸'];

// =====================================================
// STUDENT PROFILE PAGE
// =====================================================

export default function StudentProfilePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';

  const { student: realStudent, updateStudent } = useGroupStudent();
  const student = isDemo ? DEMO_STUDENT : realStudent;

  const [selectedAvatar, setSelectedAvatar] = useState(student?.avatar_emoji || '🌟');
  const [theme, setTheme] = useState<'auto' | 'playful' | 'mature'>(student?.ui_theme || 'auto');
  const [notifications, setNotifications] = useState(student?.notification_preferences || {
    daily_reminder: true,
    challenge_updates: true,
    weekly_report: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  if (!student) {
    return (
      <StudentLayout>
        <div className="text-center py-12">
          <span className="text-5xl">🔐</span>
          <h2 className="text-xl font-bold text-gray-900 mt-4">יש להתחבר</h2>
          <Button className="mt-4" onClick={() => navigate('/groups/register')}>
            הרשמה
          </Button>
        </div>
      </StudentLayout>
    );
  }

  const handleSave = async () => {
    if (isDemo) {
      alert('במצב דמו לא ניתן לשמור שינויים');
      return;
    }

    setIsSaving(true);
    try {
      await updateStudent({
        avatar_emoji: selectedAvatar,
        ui_theme: theme,
        notification_preferences: notifications,
      });
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    selectedAvatar !== student.avatar_emoji ||
    theme !== student.ui_theme ||
    JSON.stringify(notifications) !== JSON.stringify(student.notification_preferences);

  return (
    <StudentLayout>
      <div className="space-y-4 pb-4">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => navigate('/groups/student' + (isDemo ? '?demo=true' : ''))}
        >
          <ArrowRight className="h-4 w-4" />
          חזרה לדשבורד
        </Button>

        {/* Profile Header */}
        <Card className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-4xl">
                {selectedAvatar}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{student.student_name}</h1>
                <p className="opacity-90">רמה {student.current_level}</p>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4" />
                    {student.total_xp} XP
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame className="h-4 w-4" />
                    {student.current_streak} ימים
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={<Trophy className="h-5 w-5 text-yellow-500" />} label="רמה" value={student.current_level} />
          <StatCard icon={<Star className="h-5 w-5 text-purple-500" />} label="XP" value={student.total_xp} />
          <StatCard icon={<Flame className="h-5 w-5 text-orange-500" />} label="רצף שיא" value={student.longest_streak} />
        </div>

        {/* Avatar Selection */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-purple-500" />
              בחירת אווטאר
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-2">
              {AVATAR_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setSelectedAvatar(emoji)}
                  className={cn(
                    'w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all',
                    selectedAvatar === emoji
                      ? 'bg-purple-100 ring-2 ring-purple-500 scale-110'
                      : 'bg-gray-100 hover:bg-gray-200'
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Theme Selection */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Palette className="h-5 w-5 text-purple-500" />
              עיצוב
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <ThemeOption
                icon={<Sparkles className="h-5 w-5" />}
                label="אוטומטי"
                value="auto"
                selected={theme === 'auto'}
                onClick={() => setTheme('auto')}
              />
              <ThemeOption
                icon={<Sun className="h-5 w-5" />}
                label="שובב"
                value="playful"
                selected={theme === 'playful'}
                onClick={() => setTheme('playful')}
              />
              <ThemeOption
                icon={<Moon className="h-5 w-5" />}
                label="מבוגר"
                value="mature"
                selected={theme === 'mature'}
                onClick={() => setTheme('mature')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-purple-500" />
              התראות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <NotificationToggle
              label="תזכורת יומית לתרגול"
              description="קבלו תזכורת בכל יום לתרגל"
              checked={notifications.daily_reminder}
              onChange={(checked) => setNotifications({ ...notifications, daily_reminder: checked })}
            />
            <NotificationToggle
              label="עדכוני אתגרים"
              description="קבלו עדכונים על אתגרים חדשים ותוצאות"
              checked={notifications.challenge_updates}
              onChange={(checked) => setNotifications({ ...notifications, challenge_updates: checked })}
            />
            <NotificationToggle
              label="דו״ח שבועי"
              description="קבלו סיכום שבועי של ההתקדמות שלכם"
              checked={notifications.weekly_report}
              onChange={(checked) => setNotifications({ ...notifications, weekly_report: checked })}
            />
          </CardContent>
        </Card>

        {/* Privacy & Consents */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-purple-500" />
              פרטיות והסכמות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ConsentItem
              label="הקלטות קול"
              description="אישור להקלטת תרגולים לצורך ניתוח AI"
              enabled={student.consent_audio_recording}
            />
            <ConsentItem
              label="עיבוד נתונים"
              description="אישור לעיבוד נתונים לצורך מעקב התקדמות"
              enabled={student.consent_data_processing}
            />
            <ConsentItem
              label="שיתוף עם קבוצה"
              description="הצגת הציונים שלי בלוח המובילים"
              enabled={student.consent_peer_sharing}
            />
            <p className="text-xs text-gray-500 pt-2">
              לשינוי הסכמות יש לפנות להורים דרך המייל {student.parent_email}
            </p>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">פרטי חשבון</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">שם ההורה:</span>
              <span className="font-medium">{student.parent_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">מייל:</span>
              <span className="font-medium">{student.parent_email}</span>
            </div>
            {student.parent_phone && (
              <div className="flex justify-between">
                <span className="text-gray-600">טלפון:</span>
                <span className="font-medium">{student.parent_phone}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">גיל:</span>
              <span className="font-medium">{student.age}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">הצטרפות:</span>
              <span className="font-medium">
                {new Date(student.created_at).toLocaleDateString('he-IL')}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        {hasChanges && (
          <div className="sticky bottom-20 pt-4 bg-gradient-to-t from-gray-50 via-gray-50">
            <Button
              size="lg"
              className="w-full h-14 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'שומר...' : 'שמירת שינויים'}
            </Button>
          </div>
        )}

        {/* Logout (for real users) */}
        {!isDemo && (
          <Button
            variant="outline"
            className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => {
              // Handle logout
              navigate('/groups/register');
            }}
          >
            <LogOut className="h-4 w-4" />
            התנתקות
          </Button>
        )}
      </div>
    </StudentLayout>
  );
}

// =====================================================
// HELPER COMPONENTS
// =====================================================

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="bg-white">
      <CardContent className="p-4 text-center">
        <div className="flex justify-center mb-2">{icon}</div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </CardContent>
    </Card>
  );
}

function ThemeOption({
  icon,
  label,
  value,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2',
        selected
          ? 'border-purple-500 bg-purple-50 text-purple-700'
          : 'border-gray-200 hover:border-gray-300 text-gray-600'
      )}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
      {selected && <Check className="h-4 w-4 text-purple-500" />}
    </button>
  );
}

function NotificationToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Label className="font-medium text-gray-900">{label}</Label>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function ConsentItem({
  label,
  description,
  enabled,
}: {
  label: string;
  description: string;
  enabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div>
        <p className="font-medium text-gray-900 text-sm">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <div className={cn(
        'px-2 py-1 rounded-full text-xs font-medium',
        enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      )}>
        {enabled ? 'מאושר' : 'לא מאושר'}
      </div>
    </div>
  );
}
