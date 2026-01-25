import { Play, Check, Clock, Star, ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ExerciseWithProgress, ExerciseCategory } from '@/types/groups';

// =====================================================
// TODAY'S EXERCISES CARD
// Shows daily practice exercises with progress
// =====================================================

interface TodaysExercisesCardProps {
  exercises: ExerciseWithProgress[];
  onStartExercise: (exercise: ExerciseWithProgress) => void;
  onViewAll?: () => void;
  className?: string;
}

export default function TodaysExercisesCard({
  exercises,
  onStartExercise,
  onViewAll,
  className,
}: TodaysExercisesCardProps) {
  const completedCount = exercises.filter(e => e.isCompleted).length;
  const totalCount = exercises.length;
  const allCompleted = completedCount === totalCount && totalCount > 0;

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span className="text-lg">💪</span>
            התרגילים שלך להיום
          </CardTitle>

          {totalCount > 0 && (
            <span className={cn(
              'text-sm font-medium px-2 py-0.5 rounded-full',
              allCompleted
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            )}>
              {completedCount}/{totalCount}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {exercises.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Exercises List */}
            <div className="space-y-2">
              {exercises.map((exercise, index) => (
                <ExerciseItem
                  key={exercise.id}
                  exercise={exercise}
                  index={index + 1}
                  onStart={() => onStartExercise(exercise)}
                />
              ))}
            </div>

            {/* View All Button */}
            {onViewAll && (
              <Button
                variant="ghost"
                className="w-full justify-between text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                onClick={onViewAll}
              >
                <span>ראה את כל התרגילים</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}

            {/* Motivational message */}
            {allCompleted && (
              <div className="text-center py-2 bg-green-50 rounded-lg">
                <span className="text-2xl">🎉</span>
                <p className="text-sm text-green-700 font-medium mt-1">
                  כל הכבוד! סיימת את כל התרגילים להיום
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// =====================================================
// EXERCISE ITEM
// =====================================================

interface ExerciseItemProps {
  exercise: ExerciseWithProgress;
  index: number;
  onStart: () => void;
}

function ExerciseItem({ exercise, index, onStart }: ExerciseItemProps) {
  const { isCompleted, bestScore, title_he, duration_minutes, category, difficulty } = exercise;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl transition-all',
        isCompleted
          ? 'bg-green-50 border border-green-100'
          : 'bg-gray-50 hover:bg-gray-100 cursor-pointer'
      )}
      onClick={!isCompleted ? onStart : undefined}
    >
      {/* Index/Check */}
      <div className={cn(
        'flex items-center justify-center h-8 w-8 rounded-full text-sm font-semibold',
        isCompleted
          ? 'bg-green-500 text-white'
          : 'bg-white border-2 border-gray-300 text-gray-600'
      )}>
        {isCompleted ? <Check className="h-4 w-4" /> : index}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-base">{getCategoryEmoji(category)}</span>
          <h4 className={cn(
            'font-medium truncate',
            isCompleted ? 'text-green-700' : 'text-gray-900'
          )}>
            {title_he}
          </h4>
        </div>

        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {duration_minutes} דקות
          </span>

          {bestScore !== undefined && (
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 text-yellow-500" />
              {bestScore}%
            </span>
          )}

          <span className={cn(
            'px-1.5 py-0.5 rounded text-xs',
            getDifficultyStyle(difficulty)
          )}>
            {getDifficultyLabel(difficulty)}
          </span>
        </div>
      </div>

      {/* Action */}
      {!isCompleted && (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
        >
          <Play className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

// =====================================================
// EMPTY STATE
// =====================================================

function EmptyState() {
  return (
    <div className="text-center py-6">
      <span className="text-4xl">🎵</span>
      <p className="text-gray-600 mt-2">
        אין תרגילים להיום
      </p>
      <p className="text-sm text-gray-400">
        בדקו שוב מחר!
      </p>
    </div>
  );
}

// =====================================================
// HELPERS
// =====================================================

function getCategoryEmoji(category: ExerciseCategory): string {
  const emojis: Record<ExerciseCategory, string> = {
    warmup: '🔥',
    technique: '🎯',
    song: '🎵',
    breathing: '💨',
    rhythm: '🥁',
  };
  return emojis[category] || '🎤';
}

function getDifficultyStyle(difficulty: string): string {
  switch (difficulty) {
    case 'easy':
      return 'bg-green-100 text-green-700';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700';
    case 'advanced':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getDifficultyLabel(difficulty: string): string {
  switch (difficulty) {
    case 'easy':
      return 'קל';
    case 'medium':
      return 'בינוני';
    case 'advanced':
      return 'מתקדם';
    default:
      return difficulty;
  }
}
