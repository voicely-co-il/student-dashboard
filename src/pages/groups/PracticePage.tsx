import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Filter, Search } from 'lucide-react';
import { StudentLayout } from '@/components/groups/layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDailyPlan, useExercises, useGroupStudent } from '@/hooks/groups';
import { ExerciseWithProgress, ExerciseCategory } from '@/types/groups';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// =====================================================
// PRACTICE PAGE
// Browse and start exercises
// =====================================================

const CATEGORY_CONFIG: Record<ExerciseCategory, { emoji: string; label: string }> = {
  warmup: { emoji: '🔥', label: 'חימום' },
  breathing: { emoji: '🌬️', label: 'נשימה' },
  pitch: { emoji: '🎯', label: 'צליל' },
  rhythm: { emoji: '🥁', label: 'קצב' },
  resonance: { emoji: '🔔', label: 'תהודה' },
  range: { emoji: '📈', label: 'טווח' },
  song: { emoji: '🎵', label: 'שיר' },
};

export default function PracticePage() {
  const navigate = useNavigate();
  const { student } = useGroupStudent();
  const { exercises: dailyExercises, progress, isLoading: loadingDaily } = useDailyPlan();
  const { data: allExercises = [], isLoading: loadingAll } = useExercises();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ExerciseCategory | 'all'>('all');

  if (!student) {
    navigate('/groups/register');
    return null;
  }

  const isLoading = loadingDaily || loadingAll;

  // Filter exercises
  const filteredExercises = allExercises.filter(exercise => {
    const matchesSearch = exercise.title_he.includes(searchQuery) ||
      exercise.description_he?.includes(searchQuery);
    const matchesCategory = activeCategory === 'all' || exercise.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleStartExercise = (exercise: ExerciseWithProgress) => {
    navigate(`/groups/student/practice/${exercise.id}`);
  };

  return (
    <StudentLayout>
      <div className="space-y-4 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">תרגול</h1>
            <p className="text-gray-500 text-sm">בחרו תרגיל והתחילו לתרגל</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/groups/student')}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Daily Plan Summary */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">התוכנית להיום</p>
              <p className="text-2xl font-bold">
                {progress.completed}/{progress.total} תרגילים
              </p>
            </div>
            <div className="w-16 h-16 rounded-full border-4 border-white/30 flex items-center justify-center">
              <span className="text-2xl font-bold">
                {progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="daily">התוכנית שלי</TabsTrigger>
            <TabsTrigger value="all">כל התרגילים</TabsTrigger>
          </TabsList>

          {/* Daily Exercises Tab */}
          <TabsContent value="daily" className="mt-4 space-y-3">
            {loadingDaily ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
              </div>
            ) : dailyExercises.length === 0 ? (
              <EmptyState
                message="אין תרגילים להיום"
                submessage="נסו לרענן או לבדוק מחר"
              />
            ) : (
              dailyExercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  onStart={() => handleStartExercise(exercise)}
                />
              ))
            )}
          </TabsContent>

          {/* All Exercises Tab */}
          <TabsContent value="all" className="mt-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="חיפוש תרגילים..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              <CategoryPill
                label="הכל"
                emoji="📚"
                isActive={activeCategory === 'all'}
                onClick={() => setActiveCategory('all')}
              />
              {(Object.keys(CATEGORY_CONFIG) as ExerciseCategory[]).map((category) => (
                <CategoryPill
                  key={category}
                  label={CATEGORY_CONFIG[category].label}
                  emoji={CATEGORY_CONFIG[category].emoji}
                  isActive={activeCategory === category}
                  onClick={() => setActiveCategory(category)}
                />
              ))}
            </div>

            {/* Exercises Grid */}
            {loadingAll ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
              </div>
            ) : filteredExercises.length === 0 ? (
              <EmptyState
                message="לא נמצאו תרגילים"
                submessage="נסו לשנות את החיפוש או הקטגוריה"
              />
            ) : (
              <div className="space-y-3">
                {filteredExercises.map((exercise) => (
                  <ExerciseCard
                    key={exercise.id}
                    exercise={exercise as ExerciseWithProgress}
                    onStart={() => handleStartExercise(exercise as ExerciseWithProgress)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </StudentLayout>
  );
}

// =====================================================
// EXERCISE CARD
// =====================================================

interface ExerciseCardProps {
  exercise: ExerciseWithProgress;
  onStart: () => void;
}

function ExerciseCard({ exercise, onStart }: ExerciseCardProps) {
  const categoryConfig = CATEGORY_CONFIG[exercise.category];
  const isCompleted = exercise.completedToday;

  return (
    <button
      onClick={onStart}
      className={cn(
        'w-full p-4 rounded-xl border transition-all text-right',
        isCompleted
          ? 'bg-green-50 border-green-200'
          : 'bg-white border-gray-200 hover:border-purple-300 hover:shadow-sm'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Emoji */}
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center text-2xl',
          isCompleted ? 'bg-green-100' : 'bg-purple-100'
        )}>
          {isCompleted ? '✅' : categoryConfig.emoji}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate">
              {exercise.title_he}
            </h3>
            <DifficultyBadge difficulty={exercise.difficulty} />
          </div>

          {exercise.description_he && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {exercise.description_he}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span>{exercise.duration_seconds}s</span>
            <span>{categoryConfig.label}</span>
            {exercise.bestScore && (
              <span className="text-purple-500 font-medium">
                שיא: {exercise.bestScore}%
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// =====================================================
// DIFFICULTY BADGE
// =====================================================

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const config = {
    easy: { label: 'קל', color: 'bg-green-100 text-green-700' },
    medium: { label: 'בינוני', color: 'bg-yellow-100 text-yellow-700' },
    hard: { label: 'מאתגר', color: 'bg-red-100 text-red-700' },
  }[difficulty] || { label: difficulty, color: 'bg-gray-100 text-gray-700' };

  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', config.color)}>
      {config.label}
    </span>
  );
}

// =====================================================
// CATEGORY PILL
// =====================================================

interface CategoryPillProps {
  label: string;
  emoji: string;
  isActive: boolean;
  onClick: () => void;
}

function CategoryPill({ label, emoji, isActive, onClick }: CategoryPillProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-2 rounded-full whitespace-nowrap transition-all text-sm',
        isActive
          ? 'bg-purple-500 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      )}
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </button>
  );
}

// =====================================================
// EMPTY STATE
// =====================================================

function EmptyState({ message, submessage }: { message: string; submessage: string }) {
  return (
    <div className="text-center py-12">
      <span className="text-5xl">🎤</span>
      <p className="text-gray-900 font-medium mt-4">{message}</p>
      <p className="text-gray-500 text-sm mt-1">{submessage}</p>
    </div>
  );
}
