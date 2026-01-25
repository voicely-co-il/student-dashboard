import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRegisterGroupStudent } from '@/hooks/groups';
import { cn } from '@/lib/utils';

// =====================================================
// REGISTRATION PAGE
// Multi-step registration for group students
// =====================================================

type Step = 'parent' | 'student' | 'consent';

const AVATAR_OPTIONS = ['🎤', '🎵', '🎹', '🎸', '🥁', '🎺', '🎻', '🎼', '🌟', '🦋', '🌈', '🔥'];

export default function RegisterPage() {
  const navigate = useNavigate();
  const registerMutation = useRegisterGroupStudent();

  const [step, setStep] = useState<Step>('parent');
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    parent_name: '',
    parent_email: '',
    parent_phone: '',
    student_name: '',
    age: 12,
    avatar_emoji: '🎤',
    consent_audio_recording: false,
    consent_data_processing: false,
    consent_peer_sharing: false,
  });

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleNext = () => {
    if (step === 'parent') {
      if (!formData.parent_name.trim()) {
        setError('נא להזין שם הורה');
        return;
      }
      if (!formData.parent_email.trim() || !formData.parent_email.includes('@')) {
        setError('נא להזין כתובת אימייל תקינה');
        return;
      }
      setStep('student');
    } else if (step === 'student') {
      if (!formData.student_name.trim()) {
        setError('נא להזין שם התלמיד/ה');
        return;
      }
      if (formData.age < 10 || formData.age > 14) {
        setError('הגיל צריך להיות בין 10 ל-14');
        return;
      }
      setStep('consent');
    }
  };

  const handleBack = () => {
    if (step === 'student') setStep('parent');
    else if (step === 'consent') setStep('student');
  };

  const handleSubmit = async () => {
    if (!formData.consent_audio_recording || !formData.consent_data_processing) {
      setError('נדרשת הסכמה להקלטות ולעיבוד נתונים');
      return;
    }

    try {
      await registerMutation.mutateAsync(formData);
      navigate('/groups/onboarding');
    } catch (err) {
      setError('אירעה שגיאה בהרשמה. נסו שוב.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500">
      {/* Header */}
      <header className="p-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => step === 'parent' ? navigate('/') : handleBack()}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h1 className="text-white font-bold">הרשמה</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Progress */}
      <div className="max-w-md mx-auto px-4 mb-6">
        <div className="flex items-center justify-center gap-2">
          <StepIndicator active={step === 'parent'} complete={step !== 'parent'} label="1" />
          <div className="w-8 h-0.5 bg-white/30" />
          <StepIndicator active={step === 'student'} complete={step === 'consent'} label="2" />
          <div className="w-8 h-0.5 bg-white/30" />
          <StepIndicator active={step === 'consent'} complete={false} label="3" />
        </div>
      </div>

      {/* Form Card */}
      <div className="max-w-md mx-auto px-4 pb-8">
        <Card className="shadow-xl">
          {step === 'parent' && (
            <>
              <CardHeader>
                <CardTitle className="text-center">
                  <span className="text-3xl block mb-2">👋</span>
                  פרטי ההורה
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="parent_name">שם מלא</Label>
                  <Input
                    id="parent_name"
                    value={formData.parent_name}
                    onChange={(e) => updateField('parent_name', e.target.value)}
                    placeholder="ישראל ישראלי"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="parent_email">אימייל</Label>
                  <Input
                    id="parent_email"
                    type="email"
                    value={formData.parent_email}
                    onChange={(e) => updateField('parent_email', e.target.value)}
                    placeholder="email@example.com"
                    className="mt-1.5"
                    dir="ltr"
                  />
                </div>

                <div>
                  <Label htmlFor="parent_phone">טלפון (אופציונלי)</Label>
                  <Input
                    id="parent_phone"
                    type="tel"
                    value={formData.parent_phone}
                    onChange={(e) => updateField('parent_phone', e.target.value)}
                    placeholder="050-1234567"
                    className="mt-1.5"
                    dir="ltr"
                  />
                </div>
              </CardContent>
            </>
          )}

          {step === 'student' && (
            <>
              <CardHeader>
                <CardTitle className="text-center">
                  <span className="text-3xl block mb-2">🌟</span>
                  פרטי התלמיד/ה
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="student_name">שם פרטי</Label>
                  <Input
                    id="student_name"
                    value={formData.student_name}
                    onChange={(e) => updateField('student_name', e.target.value)}
                    placeholder="יעל"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="age">גיל</Label>
                  <div className="flex items-center gap-4 mt-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => updateField('age', Math.max(10, formData.age - 1))}
                    >
                      -
                    </Button>
                    <span className="text-2xl font-bold text-gray-900 w-12 text-center">
                      {formData.age}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => updateField('age', Math.min(14, formData.age + 1))}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>בחרו אווטאר</Label>
                  <div className="grid grid-cols-6 gap-2 mt-2">
                    {AVATAR_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => updateField('avatar_emoji', emoji)}
                        className={cn(
                          'w-12 h-12 rounded-xl text-2xl transition-all',
                          formData.avatar_emoji === emoji
                            ? 'bg-purple-100 ring-2 ring-purple-500'
                            : 'bg-gray-50 hover:bg-gray-100'
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {step === 'consent' && (
            <>
              <CardHeader>
                <CardTitle className="text-center">
                  <span className="text-3xl block mb-2">📝</span>
                  הסכמות
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 text-sm text-center mb-4">
                  לפני שמתחילים, אנחנו צריכים את הסכמתכם לכמה דברים חשובים
                </p>

                <ConsentCheckbox
                  checked={formData.consent_audio_recording}
                  onCheckedChange={(v) => updateField('consent_audio_recording', v)}
                  required
                >
                  אני מאשר/ת הקלטת קול במהלך התרגולים לצורך ניתוח והתקדמות
                </ConsentCheckbox>

                <ConsentCheckbox
                  checked={formData.consent_data_processing}
                  onCheckedChange={(v) => updateField('consent_data_processing', v)}
                  required
                >
                  אני מאשר/ת עיבוד הנתונים לשיפור חוויית הלמידה
                </ConsentCheckbox>

                <ConsentCheckbox
                  checked={formData.consent_peer_sharing}
                  onCheckedChange={(v) => updateField('consent_peer_sharing', v)}
                >
                  אני מאשר/ת הצגת שם התלמיד/ה בלוח התוצאות הקבוצתי (אופציונלי)
                </ConsentCheckbox>

                <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                  <p>
                    ההקלטות נשמרות באופן מאובטח ומשמשות רק לניתוח התקדמות.
                    ניתן למחוק את כל הנתונים בכל עת דרך ההגדרות.
                  </p>
                </div>
              </CardContent>
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="px-6 pb-2">
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg p-3">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            </div>
          )}

          {/* Actions */}
          <CardContent className="pt-0">
            <Button
              className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              onClick={step === 'consent' ? handleSubmit : handleNext}
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : step === 'consent' ? (
                <>
                  <Check className="h-5 w-5 ml-2" />
                  סיום הרשמה
                </>
              ) : (
                <>
                  המשך
                  <ArrowLeft className="h-5 w-5 mr-2" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// =====================================================
// STEP INDICATOR
// =====================================================

function StepIndicator({ active, complete, label }: { active: boolean; complete: boolean; label: string }) {
  return (
    <div
      className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all',
        active && 'bg-white text-purple-500',
        complete && 'bg-white/80 text-purple-500',
        !active && !complete && 'bg-white/30 text-white'
      )}
    >
      {complete ? <Check className="h-4 w-4" /> : label}
    </div>
  );
}

// =====================================================
// CONSENT CHECKBOX
// =====================================================

interface ConsentCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  required?: boolean;
  children: React.ReactNode;
}

function ConsentCheckbox({ checked, onCheckedChange, required, children }: ConsentCheckboxProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <Checkbox
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-0.5"
      />
      <span className="text-sm text-gray-700 flex-1">
        {children}
        {required && <span className="text-red-500 mr-1">*</span>}
      </span>
    </label>
  );
}
