import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  Trophy,
  Users,
  Calendar,
  Clock,
  Play,
  Star,
  Crown,
  Medal,
  Award,
  Music,
  BarChart3,
  Edit,
  Trash2,
  Share2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// DEMO DATA
// =====================================================

const DEMO_CHALLENGES: Record<string, {
  id: string;
  title: string;
  songTitle: string;
  artist: string;
  description: string;
  status: 'active' | 'completed' | 'draft';
  startDate: string;
  endDate: string;
  totalParticipants: number;
  submissions: number;
  avgScore: number;
  prizes: { place: number; prize: string }[];
  leaderboard: { rank: number; name: string; avatar: string; score: number; submittedAt: string }[];
  criteria: { name: string; weight: number }[];
}> = {
  '1': {
    id: '1',
    title: 'אתגר יהלומים',
    songTitle: 'יהלומים',
    artist: 'נועה קירל',
    description: 'שרו את השיר יהלומים עם מקסימום אנרגיה ודיוק!',
    status: 'active',
    startDate: '2026-01-20',
    endDate: '2026-01-27',
    totalParticipants: 5,
    submissions: 4,
    avgScore: 78,
    prizes: [
      { place: 1, prize: '50 XP בונוס + כתר זהב' },
      { place: 2, prize: '30 XP בונוס' },
      { place: 3, prize: '20 XP בונוס' },
    ],
    leaderboard: [
      { rank: 1, name: 'שיראל', avatar: '💫', score: 92, submittedAt: '2026-01-25' },
      { rank: 2, name: 'אורין', avatar: '🎤', score: 85, submittedAt: '2026-01-24' },
      { rank: 3, name: 'עדי', avatar: '🌟', score: 76, submittedAt: '2026-01-23' },
      { rank: 4, name: 'לירז', avatar: '🦋', score: 68, submittedAt: '2026-01-22' },
    ],
    criteria: [
      { name: 'דיוק צליל', weight: 40 },
      { name: 'אנרגיה', weight: 30 },
      { name: 'ביטוי', weight: 20 },
      { name: 'קצב', weight: 10 },
    ],
  },
  '2': {
    id: '2',
    title: 'אתגר Let It Go',
    songTitle: 'Let It Go',
    artist: 'Frozen',
    description: 'תנו את הכל בשיר הקלאסי מפרוזן!',
    status: 'completed',
    startDate: '2026-01-10',
    endDate: '2026-01-17',
    totalParticipants: 5,
    submissions: 5,
    avgScore: 72,
    prizes: [
      { place: 1, prize: '50 XP בונוס + כתר זהב' },
      { place: 2, prize: '30 XP בונוס' },
      { place: 3, prize: '20 XP בונוס' },
    ],
    leaderboard: [
      { rank: 1, name: 'אורין', avatar: '🎤', score: 88, submittedAt: '2026-01-15' },
      { rank: 2, name: 'שיראל', avatar: '💫', score: 82, submittedAt: '2026-01-14' },
      { rank: 3, name: 'עדי', avatar: '🌟', score: 75, submittedAt: '2026-01-13' },
      { rank: 4, name: 'לירז', avatar: '🦋', score: 65, submittedAt: '2026-01-12' },
      { rank: 5, name: 'תהל', avatar: '🎵', score: 50, submittedAt: '2026-01-11' },
    ],
    criteria: [
      { name: 'דיוק צליל', weight: 40 },
      { name: 'אנרגיה', weight: 30 },
      { name: 'ביטוי', weight: 20 },
      { name: 'קצב', weight: 10 },
    ],
  },
};

// =====================================================
// TEACHER CHALLENGE DETAIL PAGE
// =====================================================

export default function TeacherChallengeDetailPage() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const navigate = useNavigate();

  const challenge = DEMO_CHALLENGES[challengeId || '1'] || DEMO_CHALLENGES['1'];
  const isActive = challenge.status === 'active';
  const isCompleted = challenge.status === 'completed';

  const daysLeft = isActive
    ? Math.max(0, Math.ceil((new Date(challenge.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/groups/teacher/challenges')}
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <h1 className="font-bold text-gray-900">פרטי אתגר</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Share2 className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Edit className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Challenge Header Card */}
        <Card className={cn(
          'text-white',
          isActive && 'bg-gradient-to-br from-purple-500 to-pink-500',
          isCompleted && 'bg-gradient-to-br from-gray-600 to-gray-700',
          challenge.status === 'draft' && 'bg-gradient-to-br from-amber-500 to-orange-500'
        )}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <Badge className={cn(
                  'mb-2',
                  isActive && 'bg-white/20',
                  isCompleted && 'bg-white/20',
                )}>
                  {isActive ? '🔥 פעיל' : isCompleted ? '✅ הסתיים' : '📝 טיוטה'}
                </Badge>
                <h2 className="text-2xl font-bold">{challenge.title}</h2>
                <p className="text-white/80 mt-1">{challenge.songTitle} - {challenge.artist}</p>
              </div>
              <Trophy className="h-12 w-12 text-yellow-300" />
            </div>

            <p className="text-white/90 mb-4">{challenge.description}</p>

            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{new Date(challenge.startDate).toLocaleDateString('he-IL')} - {new Date(challenge.endDate).toLocaleDateString('he-IL')}</span>
              </div>
              {isActive && (
                <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded">
                  <Clock className="h-4 w-4" />
                  <span>נותרו {daysLeft} ימים</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-white">
            <CardContent className="p-4 text-center">
              <Users className="h-6 w-6 mx-auto text-blue-500 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{challenge.submissions}/{challenge.totalParticipants}</p>
              <p className="text-xs text-gray-500">הגשות</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 text-center">
              <BarChart3 className="h-6 w-6 mx-auto text-green-500 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{challenge.avgScore}</p>
              <p className="text-xs text-gray-500">ציון ממוצע</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 text-center">
              <Star className="h-6 w-6 mx-auto text-yellow-500 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{challenge.leaderboard[0]?.score || '-'}</p>
              <p className="text-xs text-gray-500">ציון מוביל</p>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-yellow-500" />
              לוח תוצאות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {challenge.leaderboard.map((entry) => (
                <div
                  key={entry.rank}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors',
                    entry.rank === 1 && 'bg-yellow-50',
                    entry.rank === 2 && 'bg-gray-100',
                    entry.rank === 3 && 'bg-orange-50'
                  )}
                  onClick={() => navigate(`/groups/teacher/students/${entry.rank}`)}
                >
                  {/* Rank */}
                  <div className="w-8 h-8 flex items-center justify-center">
                    {entry.rank === 1 && <Crown className="h-6 w-6 text-yellow-500" />}
                    {entry.rank === 2 && <Medal className="h-6 w-6 text-gray-400" />}
                    {entry.rank === 3 && <Award className="h-6 w-6 text-orange-400" />}
                    {entry.rank > 3 && <span className="text-lg font-bold text-gray-400">{entry.rank}</span>}
                  </div>

                  {/* Avatar & Name */}
                  <span className="text-2xl">{entry.avatar}</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{entry.name}</p>
                    <p className="text-xs text-gray-500">
                      הוגש: {new Date(entry.submittedAt).toLocaleDateString('he-IL')}
                    </p>
                  </div>

                  {/* Score */}
                  <div className="text-left">
                    <p className={cn(
                      'text-xl font-bold',
                      entry.score >= 80 ? 'text-green-600' : entry.score >= 60 ? 'text-orange-600' : 'text-red-600'
                    )}>
                      {entry.score}
                    </p>
                  </div>

                  {/* Play button */}
                  <Button variant="ghost" size="icon">
                    <Play className="h-5 w-5 text-purple-500" />
                  </Button>
                </div>
              ))}

              {/* Missing participants */}
              {challenge.submissions < challenge.totalParticipants && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  {challenge.totalParticipants - challenge.submissions} תלמידים עדיין לא הגישו
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Scoring Criteria */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              קריטריונים לציון
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {challenge.criteria.map((criterion, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700">{criterion.name}</span>
                      <span className="text-sm font-medium text-purple-600">{criterion.weight}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${criterion.weight}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Prizes */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Star className="h-5 w-5 text-yellow-500" />
              פרסים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {challenge.prizes.map((prize) => (
                <div
                  key={prize.place}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg',
                    prize.place === 1 && 'bg-yellow-50',
                    prize.place === 2 && 'bg-gray-100',
                    prize.place === 3 && 'bg-orange-50'
                  )}
                >
                  <div className="w-8 h-8 flex items-center justify-center">
                    {prize.place === 1 && <Crown className="h-6 w-6 text-yellow-500" />}
                    {prize.place === 2 && <Medal className="h-6 w-6 text-gray-400" />}
                    {prize.place === 3 && <Award className="h-6 w-6 text-orange-400" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">מקום {prize.place}</p>
                    <p className="text-sm text-gray-600">{prize.prize}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        {isActive && (
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => alert('בקרוב: סיום אתגר')}
            >
              <Clock className="h-6 w-6 text-orange-500" />
              <span>סיים אתגר מוקדם</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2 text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => alert('בקרוב: מחיקת אתגר')}
            >
              <Trash2 className="h-6 w-6" />
              <span>מחק אתגר</span>
            </Button>
          </div>
        )}

        {isCompleted && (
          <Button
            className="w-full bg-purple-500 hover:bg-purple-600"
            onClick={() => navigate('/groups/teacher/challenges/new')}
          >
            <Trophy className="h-5 w-5 ml-2" />
            צור אתגר חדש
          </Button>
        )}
      </main>
    </div>
  );
}
