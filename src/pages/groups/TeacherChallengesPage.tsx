import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Trophy,
  Plus,
  Clock,
  Users,
  Music,
  ChevronLeft,
  Play,
  Pause,
  Edit,
  Trash2,
  Eye,
  MoreVertical,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { WeeklyChallenge, ChallengeStatus } from '@/types/groups';

// =====================================================
// DEMO DATA
// =====================================================

const DEMO_CHALLENGES: (WeeklyChallenge & { participants: number })[] = [
  {
    id: 'challenge-1',
    group_id: 'group-diamonds',
    title: 'אתגר יהלומים',
    title_he: 'אתגר יהלומים',
    description_he: 'שרו את הקטע המרכזי של Diamonds',
    song_title: 'Diamonds',
    song_artist: 'Rihanna',
    song_excerpt_start_sec: 45,
    song_excerpt_end_sec: 90,
    criteria: { min_pitch_accuracy: 70, min_energy_level: 60, no_breaks: false, duration_range: [30, 60] },
    max_attempts: 3,
    scoring_weights: { ai_score: 0.4, teacher_score: 0.4, effort_score: 0.1, participation_bonus: 0.1 },
    leaderboard_mode: 'full',
    allow_comments: true,
    show_scores_publicly: true,
    prizes: { first: { xp: 100 }, second: { xp: 75 }, third: { xp: 50 }, participation: { xp: 25 } },
    status: 'active',
    starts_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    ends_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    created_by: 'teacher-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    participants: 4,
  },
  {
    id: 'challenge-2',
    group_id: 'group-diamonds',
    title: 'אתגר Let It Go',
    title_he: 'אתגר Let It Go',
    description_he: 'שרו את הפזמון של Let It Go',
    song_title: 'Let It Go',
    song_artist: 'Frozen',
    song_excerpt_start_sec: 60,
    song_excerpt_end_sec: 120,
    criteria: { min_pitch_accuracy: 65, min_energy_level: 70, no_breaks: false, duration_range: [40, 80] },
    max_attempts: 3,
    scoring_weights: { ai_score: 0.4, teacher_score: 0.4, effort_score: 0.1, participation_bonus: 0.1 },
    leaderboard_mode: 'full',
    allow_comments: true,
    show_scores_publicly: true,
    prizes: { first: { xp: 100 }, second: { xp: 75 }, third: { xp: 50 }, participation: { xp: 25 } },
    status: 'ended',
    starts_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    ends_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_by: 'teacher-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    participants: 5,
  },
  {
    id: 'challenge-3',
    group_id: 'group-diamonds',
    title: 'אתגר Happy',
    title_he: 'אתגר Happy',
    description_he: 'שרו את השיר Happy',
    song_title: 'Happy',
    song_artist: 'Pharrell Williams',
    song_excerpt_start_sec: 30,
    song_excerpt_end_sec: 75,
    criteria: { min_pitch_accuracy: 60, min_energy_level: 80, no_breaks: false, duration_range: [30, 60] },
    max_attempts: 3,
    scoring_weights: { ai_score: 0.4, teacher_score: 0.4, effort_score: 0.1, participation_bonus: 0.1 },
    leaderboard_mode: 'full',
    allow_comments: true,
    show_scores_publicly: true,
    prizes: { first: { xp: 100 }, second: { xp: 75 }, third: { xp: 50 }, participation: { xp: 25 } },
    status: 'draft',
    starts_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    created_by: 'teacher-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    participants: 0,
  },
];

// =====================================================
// TEACHER CHALLENGES PAGE
// =====================================================

export default function TeacherChallengesPage() {
  const navigate = useNavigate();
  const [challenges] = useState(DEMO_CHALLENGES);

  const activeChallenges = challenges.filter(c => c.status === 'active');
  const draftChallenges = challenges.filter(c => c.status === 'draft');
  const pastChallenges = challenges.filter(c => c.status === 'ended' || c.status === 'archived');

  const handleCreateNew = () => {
    navigate('/groups/teacher/challenges/new');
  };

  const handleViewChallenge = (id: string) => {
    navigate(`/groups/teacher/challenges/${id}`);
  };

  const handleActivate = (id: string) => {
    // TODO: Implement activation
    alert(`מפעיל אתגר ${id}`);
  };

  const handleDelete = (id: string) => {
    // TODO: Implement deletion
    if (confirm('למחוק את האתגר?')) {
      alert(`מוחק אתגר ${id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-purple-500" />
            ניהול אתגרים
          </h1>
          <Button
            size="sm"
            className="gap-2 bg-purple-500 hover:bg-purple-600"
            onClick={handleCreateNew}
          >
            <Plus className="h-4 w-4" />
            אתגר חדש
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-white">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                <Play className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{activeChallenges.length}</p>
              <p className="text-sm text-gray-500">פעילים</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-2">
                <Edit className="h-5 w-5 text-yellow-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{draftChallenges.length}</p>
              <p className="text-sm text-gray-500">טיוטות</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="h-5 w-5 text-gray-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{pastChallenges.length}</p>
              <p className="text-sm text-gray-500">הסתיימו</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Challenges */}
        {activeChallenges.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              אתגרים פעילים
            </h2>
            <div className="space-y-3">
              {activeChallenges.map(challenge => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  onView={() => handleViewChallenge(challenge.id)}
                  onDelete={() => handleDelete(challenge.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Draft Challenges */}
        {draftChallenges.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              טיוטות
            </h2>
            <div className="space-y-3">
              {draftChallenges.map(challenge => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  onView={() => handleViewChallenge(challenge.id)}
                  onActivate={() => handleActivate(challenge.id)}
                  onDelete={() => handleDelete(challenge.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Past Challenges */}
        {pastChallenges.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-400" />
              אתגרים קודמים
            </h2>
            <div className="space-y-3">
              {pastChallenges.map(challenge => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  onView={() => handleViewChallenge(challenge.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {challenges.length === 0 && (
          <Card className="bg-white">
            <CardContent className="p-12 text-center">
              <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">אין אתגרים</h3>
              <p className="text-gray-600 mb-6">צרו את האתגר הראשון לקבוצה</p>
              <Button
                className="gap-2 bg-purple-500 hover:bg-purple-600"
                onClick={handleCreateNew}
              >
                <Plus className="h-4 w-4" />
                יצירת אתגר חדש
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

// =====================================================
// CHALLENGE CARD
// =====================================================

interface ChallengeCardProps {
  challenge: WeeklyChallenge & { participants: number };
  onView: () => void;
  onActivate?: () => void;
  onDelete?: () => void;
}

function ChallengeCard({ challenge, onView, onActivate, onDelete }: ChallengeCardProps) {
  const isActive = challenge.status === 'active';
  const isDraft = challenge.status === 'draft';
  const isEnded = challenge.status === 'ended';

  return (
    <Card className={cn(
      'bg-white overflow-hidden cursor-pointer hover:shadow-md transition-shadow',
      isActive && 'ring-1 ring-green-200'
    )} onClick={onView}>
      {/* Status Bar */}
      <div className={cn(
        'h-1',
        isActive && 'bg-green-500',
        isDraft && 'bg-yellow-500',
        isEnded && 'bg-gray-300'
      )} />

      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={challenge.status} />
              <h3 className="font-semibold text-gray-900 truncate">
                {challenge.title_he}
              </h3>
            </div>

            {/* Song */}
            <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-2">
              <Music className="h-3.5 w-3.5" />
              <span className="truncate">{challenge.song_title}</span>
              {challenge.song_artist && (
                <span className="text-gray-400">• {challenge.song_artist}</span>
              )}
            </div>

            {/* Meta */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{getTimeInfo(challenge)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                <span>{challenge.participants} משתתפים</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
                <Eye className="h-4 w-4 ml-2" />
                צפייה
              </DropdownMenuItem>
              {isDraft && onActivate && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onActivate(); }}>
                  <Play className="h-4 w-4 ml-2" />
                  הפעלה
                </DropdownMenuItem>
              )}
              {!isEnded && onDelete && (
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                >
                  <Trash2 className="h-4 w-4 ml-2" />
                  מחיקה
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================
// STATUS BADGE
// =====================================================

function StatusBadge({ status }: { status: ChallengeStatus }) {
  const config = {
    active: { label: 'פעיל', className: 'bg-green-100 text-green-700' },
    ended: { label: 'הסתיים', className: 'bg-gray-100 text-gray-600' },
    draft: { label: 'טיוטה', className: 'bg-yellow-100 text-yellow-700' },
    archived: { label: 'בארכיון', className: 'bg-gray-100 text-gray-500' },
  };

  const { label, className } = config[status] || config.draft;

  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', className)}>
      {label}
    </span>
  );
}

// =====================================================
// HELPERS
// =====================================================

function getTimeInfo(challenge: WeeklyChallenge): string {
  const now = new Date();
  const start = new Date(challenge.starts_at);
  const end = new Date(challenge.ends_at);

  if (challenge.status === 'ended') {
    return `הסתיים ${formatDate(end)}`;
  }

  if (challenge.status === 'draft') {
    return `מתוכנן ל-${formatDate(start)}`;
  }

  const remaining = end.getTime() - now.getTime();
  if (remaining <= 0) return 'הסתיים';

  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  if (days > 0) return `עוד ${days} ימים`;

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  return `עוד ${hours} שעות`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
}
