import { useNavigate, useSearchParams } from 'react-router-dom';
import { StudentLayout } from '@/components/groups/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  ArrowRight,
  Trophy,
  Star,
  Flame,
  Calendar,
  Clock,
  MapPin,
  User,
  Crown,
  Medal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGroupStudent } from '@/hooks/groups';
import { GroupStudent } from '@/types/groups';

// =====================================================
// DEMO DATA
// =====================================================

const DEMO_GROUP = {
  id: 'group-diamonds',
  name: 'קבוצת יהלומים',
  description: 'קבוצת שירה לגילאי 10-12',
  teacher_name: 'ענבל',
  teacher_avatar: '👩‍🏫',
  created_at: '2026-01-01T00:00:00Z',
  lesson_day: 'שני',
  lesson_time: '17:00',
  lesson_duration: 45,
  zoom_link: 'https://zoom.us/j/xxx',
  total_xp: 3420,
  avg_streak: 4.2,
  total_challenges: 8,
};

const DEMO_MEMBERS: (GroupStudent & { rank: number })[] = [
  {
    id: '1',
    user_id: 'u1',
    parent_email: '',
    parent_name: '',
    student_name: 'שיראל',
    avatar_emoji: '💫',
    age: 11,
    age_group: '10-12',
    consent_audio_recording: true,
    consent_data_processing: true,
    consent_peer_sharing: true,
    ui_theme: 'auto',
    notification_preferences: { daily_reminder: true, challenge_updates: true, weekly_report: true },
    current_streak: 7,
    longest_streak: 14,
    total_xp: 1250,
    current_level: 6,
    is_active: true,
    onboarding_completed: true,
    created_at: '',
    updated_at: '',
    rank: 1,
  },
  {
    id: '2',
    user_id: 'u2',
    parent_email: '',
    parent_name: '',
    student_name: 'אורין',
    avatar_emoji: '🎤',
    age: 12,
    age_group: '10-12',
    consent_audio_recording: true,
    consent_data_processing: true,
    consent_peer_sharing: true,
    ui_theme: 'auto',
    notification_preferences: { daily_reminder: true, challenge_updates: true, weekly_report: true },
    current_streak: 5,
    longest_streak: 10,
    total_xp: 980,
    current_level: 5,
    is_active: true,
    onboarding_completed: true,
    created_at: '',
    updated_at: '',
    rank: 2,
  },
  {
    id: '72578603-7d42-47d5-9a42-668864c499fb',
    user_id: 'u3',
    parent_email: '',
    parent_name: '',
    student_name: 'עדי',
    avatar_emoji: '🌟',
    age: 12,
    age_group: '10-12',
    consent_audio_recording: true,
    consent_data_processing: true,
    consent_peer_sharing: true,
    ui_theme: 'auto',
    notification_preferences: { daily_reminder: true, challenge_updates: true, weekly_report: true },
    current_streak: 3,
    longest_streak: 12,
    total_xp: 850,
    current_level: 4,
    is_active: true,
    onboarding_completed: true,
    created_at: '',
    updated_at: '',
    rank: 3,
  },
  {
    id: '4',
    user_id: 'u4',
    parent_email: '',
    parent_name: '',
    student_name: 'לירז',
    avatar_emoji: '🦋',
    age: 10,
    age_group: '10-12',
    consent_audio_recording: true,
    consent_data_processing: true,
    consent_peer_sharing: false,
    ui_theme: 'auto',
    notification_preferences: { daily_reminder: true, challenge_updates: true, weekly_report: true },
    current_streak: 2,
    longest_streak: 8,
    total_xp: 340,
    current_level: 2,
    is_active: true,
    onboarding_completed: true,
    created_at: '',
    updated_at: '',
    rank: 4,
  },
];

// =====================================================
// GROUP INFO PAGE
// =====================================================

export default function GroupInfoPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';

  const { student } = useGroupStudent();
  const currentStudentId = isDemo ? '72578603-7d42-47d5-9a42-668864c499fb' : student?.id;

  const group = DEMO_GROUP;
  const members = DEMO_MEMBERS;

  const myRank = members.find(m => m.id === currentStudentId)?.rank || 0;

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

        {/* Group Header */}
        <Card className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center">
                <Users className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{group.name}</h1>
                <p className="opacity-90">{group.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Group Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-white">
            <CardContent className="p-4 text-center">
              <Users className="h-5 w-5 text-purple-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-900">{members.length}</p>
              <p className="text-xs text-gray-500">משתתפים</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 text-center">
              <Star className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-900">{group.total_xp}</p>
              <p className="text-xs text-gray-500">XP קבוצתי</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 text-center">
              <Trophy className="h-5 w-5 text-orange-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-900">{group.total_challenges}</p>
              <p className="text-xs text-gray-500">אתגרים</p>
            </CardContent>
          </Card>
        </div>

        {/* Teacher */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">המורה שלנו</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center text-2xl">
                {group.teacher_avatar}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{group.teacher_name}</h3>
                <p className="text-sm text-gray-600">מורה לפיתוח קול</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lesson Schedule */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-purple-500" />
              מועד השיעור
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-500" />
                <span className="text-gray-700">יום {group.lesson_day}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-500" />
                <span className="font-medium text-purple-700">{group.lesson_time}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>משך השיעור:</span>
              <span className="font-medium">{group.lesson_duration} דקות</span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>פלטפורמה:</span>
              <span className="font-medium">Zoom</span>
            </div>
          </CardContent>
        </Card>

        {/* Members Leaderboard */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-yellow-500" />
              חברי הקבוצה
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {members.map((member) => {
              const isMe = member.id === currentStudentId;
              const isTopThree = member.rank <= 3;

              return (
                <div
                  key={member.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl transition-all',
                    isMe ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50'
                  )}
                >
                  {/* Rank */}
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    member.rank === 1 && 'bg-yellow-100',
                    member.rank === 2 && 'bg-gray-200',
                    member.rank === 3 && 'bg-orange-100',
                    member.rank > 3 && 'bg-white border'
                  )}>
                    {isTopThree ? (
                      <span className="text-lg">{getRankEmoji(member.rank)}</span>
                    ) : (
                      <span className="text-sm font-bold text-gray-600">{member.rank}</span>
                    )}
                  </div>

                  {/* Avatar & Name */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xl">{member.avatar_emoji}</span>
                    <div className="min-w-0">
                      <p className={cn(
                        'font-medium truncate',
                        isMe ? 'text-purple-700' : 'text-gray-900'
                      )}>
                        {member.student_name}
                        {isMe && <span className="text-purple-500"> (את/ה)</span>}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="flex items-center gap-0.5">
                          <Flame className="h-3 w-3 text-orange-400" />
                          {member.current_streak}
                        </span>
                        <span>רמה {member.current_level}</span>
                      </div>
                    </div>
                  </div>

                  {/* XP */}
                  <div className="text-left">
                    <p className={cn(
                      'font-bold',
                      isTopThree ? 'text-purple-600' : 'text-gray-700'
                    )}>
                      {member.total_xp}
                    </p>
                    <p className="text-xs text-gray-500">XP</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* My Position */}
        {myRank > 0 && (
          <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">המיקום שלך בקבוצה</p>
                  <p className="text-3xl font-bold text-purple-700">#{myRank}</p>
                </div>
                <div className="text-4xl">{getRankEmoji(myRank)}</div>
              </div>
              {myRank > 1 && (
                <p className="text-sm text-purple-600 mt-2">
                  עוד {members[myRank - 2].total_xp - (members.find(m => m.id === currentStudentId)?.total_xp || 0)} XP למקום {myRank - 1}!
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Encouragement */}
        <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-100">
          <CardContent className="p-4 text-center">
            <span className="text-4xl">💪</span>
            <p className="font-semibold text-gray-900 mt-2">יחד אנחנו חזקים!</p>
            <p className="text-sm text-gray-600 mt-1">
              תמשיכו לתרגל ולצבור XP לקבוצה
            </p>
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}

// =====================================================
// HELPERS
// =====================================================

function getRankEmoji(rank: number): string {
  switch (rank) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return '🏅';
  }
}
