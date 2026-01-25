import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Mic, Star, Trophy, Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useGroupStudent } from '@/hooks/groups';
import { cn } from '@/lib/utils';

// =====================================================
// ONBOARDING PAGE
// Welcome experience for new students
// =====================================================

interface OnboardingStep {
  id: string;
  emoji: string;
  title: string;
  description: string;
  tip: string;
  color: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    emoji: '👋',
    title: 'ברוכים הבאים!',
    description: 'ב-Voicely תלמדו לשיר ולפתח את הקול שלכם בצורה כיפית ומאתגרת',
    tip: 'האפליקציה מותאמת אישית בשבילכם!',
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'practice',
    emoji: '🎤',
    title: 'תרגול יומי',
    description: 'כל יום תקבלו 3 תרגילים מותאמים לרמה שלכם. תרגול קצר כל יום עדיף על אימון ארוך פעם בשבוע!',
    tip: 'תרגלו 10 דקות ביום לתוצאות הכי טובות',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'recording',
    emoji: '🎧',
    title: 'הקלטה וניתוח',
    description: 'הקליטו את עצמכם ותקבלו משוב מיידי מה-AI שלנו. הוא יגיד לכם מה עובד טוב ומה אפשר לשפר.',
    tip: 'אל תתביישו! כולם מתחילים מאותו מקום',
    color: 'from-green-500 to-emerald-500',
  },
  {
    id: 'challenges',
    emoji: '🏆',
    title: 'אתגרים קבוצתיים',
    description: 'כל שבוע יש אתגר חדש עם שיר לתרגל. שירו אותו ותתחרו עם חברי הקבוצה!',
    tip: 'השתתפות היא הניצחון הראשון',
    color: 'from-orange-500 to-red-500',
  },
  {
    id: 'ready',
    emoji: '🚀',
    title: 'מוכנים להתחיל?',
    description: 'זהו! עכשיו אתם יודעים את הכל. בואו נתחיל לתרגל ולהתקדם יחד!',
    tip: 'הקול שלכם מחכה לצאת החוצה!',
    color: 'from-purple-500 to-pink-500',
  },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { student, updateStudent, isUpdating } = useGroupStudent();

  const [currentStep, setCurrentStep] = useState(0);

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    try {
      await updateStudent({ onboarding_completed: true });
      navigate('/groups/student');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    }
  };

  if (!student) {
    navigate('/groups/register');
    return null;
  }

  return (
    <div className={cn('min-h-screen bg-gradient-to-br', step.color)}>
      {/* Header */}
      <header className="p-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {currentStep > 0 ? (
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={handleBack}
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
          ) : (
            <div className="w-10" />
          )}
          <div className="flex gap-1.5">
            {ONBOARDING_STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  i === currentStep ? 'bg-white w-6' : 'bg-white/40'
                )}
              />
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
            onClick={handleComplete}
          >
            דלג
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-md mx-auto px-4 pt-8 pb-12">
        {/* Animated Emoji */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-white/20 mb-6 animate-bounce">
            <span className="text-7xl">{step.emoji}</span>
          </div>

          <h1 className="text-3xl font-bold text-white mb-4">{step.title}</h1>
          <p className="text-white/90 text-lg leading-relaxed">{step.description}</p>
        </div>

        {/* Tip Card */}
        <Card className="bg-white/10 backdrop-blur border-white/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-yellow-300 flex-shrink-0 mt-0.5" />
              <p className="text-white/90 text-sm">{step.tip}</p>
            </div>
          </CardContent>
        </Card>

        {/* Feature Icons (on specific steps) */}
        {step.id === 'practice' && (
          <div className="grid grid-cols-3 gap-4 mt-8">
            <FeatureIcon emoji="🔥" label="חימום" />
            <FeatureIcon emoji="🎯" label="צליל" />
            <FeatureIcon emoji="🥁" label="קצב" />
          </div>
        )}

        {step.id === 'recording' && (
          <div className="flex justify-center mt-8">
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center">
              <Mic className="h-12 w-12 text-white" />
            </div>
          </div>
        )}

        {step.id === 'challenges' && (
          <div className="flex justify-center gap-6 mt-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-yellow-400 flex items-center justify-center mb-2">
                <span className="text-2xl">🥇</span>
              </div>
              <span className="text-white/80 text-sm">מקום 1</span>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-gray-300 flex items-center justify-center mb-2">
                <span className="text-xl">🥈</span>
              </div>
              <span className="text-white/80 text-sm">מקום 2</span>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-orange-400 flex items-center justify-center mb-2">
                <span className="text-lg">🥉</span>
              </div>
              <span className="text-white/80 text-sm">מקום 3</span>
            </div>
          </div>
        )}

        {/* Personalized welcome on last step */}
        {step.id === 'ready' && (
          <div className="text-center mt-8">
            <div className="inline-flex items-center gap-3 bg-white/20 rounded-full px-6 py-3">
              <span className="text-3xl">{student.avatar_emoji}</span>
              <span className="text-xl text-white font-bold">{student.student_name}</span>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/20">
        <div className="max-w-md mx-auto">
          <Button
            size="lg"
            className="w-full h-14 text-lg bg-white text-gray-900 hover:bg-gray-100"
            onClick={handleNext}
            disabled={isUpdating}
          >
            {isLastStep ? (
              <>
                <Star className="h-5 w-5 ml-2" />
                בואו נתחיל!
              </>
            ) : (
              <>
                המשך
                <ArrowLeft className="h-5 w-5 mr-2" />
              </>
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}

// =====================================================
// FEATURE ICON
// =====================================================

function FeatureIcon({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-2">
        <span className="text-3xl">{emoji}</span>
      </div>
      <span className="text-white/80 text-sm">{label}</span>
    </div>
  );
}
